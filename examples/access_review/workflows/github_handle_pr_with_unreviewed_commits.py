from typing import Annotated

from admyral.workflow import workflow, Webhook
from admyral.typings import JsonValue
from admyral.action import action, ArgumentMetadata
from admyral.actions import (
    list_commit_history_for_pr,
    list_review_history_for_pr,
    send_slack_message_to_user_by_email,
    create_jira_issue,
)


@action(
    display_name="Check PR for unresolved commits",
    display_namespace="GitHub",
    description="Check PR for commits after last approval",
    secrets_placeholders=["GITHUB_SECRET"],
)
def check_pr_for_unreviewed_commits(
    pull_request: Annotated[
        dict[str, JsonValue],
        ArgumentMetadata(
            display_name="Merged Pull Request",
            description="Pull request of interest",
        ),
    ],
    repo_owner: Annotated[
        str,
        ArgumentMetadata(
            display_name="Repository Owner",
            description="The owner of the repository",
        ),
    ],
    repo_name: Annotated[
        str,
        ArgumentMetadata(
            display_name="Repository Name",
            description="The name of the repository",
        ),
    ],
) -> str:
    pr_number = pull_request.get("number")
    commit_history = list_commit_history_for_pr(
        repo_owner=repo_owner, repo_name=repo_name, pr_number=pr_number
    )
    latest_commit = commit_history = sorted(
        commit_history,
        key=lambda x: x["commit"]["committer"]["date"],
        reverse=True,
    )[0]

    print(latest_commit)
    approval_history = list_review_history_for_pr(
        repo_owner=repo_owner,
        repo_name=repo_name,
        pr_number=pr_number,
        state="APPROVED",
    )
    if not approval_history:
        return f"PR {pr_number} ({pull_request.get('html_url')}) was merged without any approvals"
    latest_commit_id = latest_commit.get("sha")
    latest_approval = approval_history[0]
    latest_approval_id = latest_approval.get("commit_id")

    if latest_commit_id != latest_approval_id:
        message = f"Attention, PR {pr_number} ({pull_request.get("html_url")}) has unreviewed commits merged\n"
        message += f"Latest commit: {latest_commit.get('sha')} at {latest_commit.get('commit').get('committer').get('date')}\n"
        message += f"Latest approval: {latest_approval.get('commit_id')} at {latest_approval.get('submitted_at')}\n"
    else:
        message = ""

    return message


@action(
    display_name="Follow up on PR with Unreviewed Commits",
    display_namespace="GitHub",
    description="Follow up on PR with unreviewed commits",
    secrets_placeholders=["GITHUB_SECRET"],
)
def follow_up_on_pr_with_unreviewed_commits(
    pull_request: Annotated[
        dict[str, JsonValue],
        ArgumentMetadata(
            display_name="Merged Pull Request",
            description="Pull request of interest",
        ),
    ],
    repo_owner: Annotated[
        str,
        ArgumentMetadata(
            display_name="Repository Owner",
            description="The owner of the repository",
        ),
    ],
    repo_name: Annotated[
        str,
        ArgumentMetadata(
            display_name="Repository Name",
            description="The name of the repository",
        ),
    ],
) -> bool:
    pr_number = pull_request.get("number")
    latest_approval = list_review_history_for_pr(
        repo_owner=repo_owner,
        repo_name=repo_name,
        pr_number=pr_number,
        state="APPROVED",
    )[0]
    approved_at = latest_approval.get("submitted_at")
    commit_history = list_commit_history_for_pr(
        repo_owner=repo_owner, repo_name=repo_name, pr_number=pr_number
    )
    commit_history_after_approve = [
        commit
        for commit in commit_history
        if commit.get("commit").get("committer").get("date") > approved_at
    ]

    excluded_reviewers = []

    if commit_history_after_approve:
        for assigne in pull_request.get("assignees"):
            person = assigne.get("login")
            if person not in excluded_reviewers:
                excluded_reviewers.append(assigne.get("login"))
        for commit in commit_history_after_approve:
            committer = commit.get("committer").get("id")
            author = commit.get("author").get("id")
            if committer not in excluded_reviewers:
                excluded_reviewers.append(committer)
            if author not in excluded_reviewers:
                excluded_reviewers.append(author)
    else:
        return False

    review_history = list_review_history_for_pr(
        repo_owner=repo_owner, repo_name=repo_name, pr_number=pr_number, state=None
    )

    merged_at = pull_request.get("merged_at")

    review_history_after_merge = [
        review for review in review_history if review.get("submitted_at") > merged_at
    ]

    for review in review_history_after_merge:
        user_info = review.get("user")
        if (
            user_info.get("id") not in excluded_reviewers
            or user_info.get("login") not in excluded_reviewers
        ):
            return True
        else:
            return False


@workflow(description="Handle PR with unreviewed commits", triggers=[Webhook()])
def handle_pr_with_unreviewed_commits(payload: dict[str, JsonValue]):
    message = check_pr_for_unreviewed_commits(
        pull_request=payload["pull_request"],
        repo_owner=payload["repo_owner"],
        repo_name=payload["repo_name"],
        secrets={"GITHUB_SECRET": "github_secret"},
    )

    if message:
        # TODO: Add Jira issue creation
        jira_issue = create_jira_issue(
            summary=f"Unreviewed commits in PR {payload["pull_request"]['html_url']}",
            project_id="10001",
            issue_type="Bug",
            description={
                "content": [
                    {
                        "content": [
                            {
                                "text": "Alert",
                                "type": "text",
                            }
                        ],
                        "type": "paragraph",
                    },
                ],
                "type": "doc",
                "version": 1,
            },
            priority="High",
            secrets={"JIRA_SECRET": "jira_secret"},
        )

        first_message = send_slack_message_to_user_by_email(
            email="leon@admyral.ai",
            text=f"{message}\nJira issue created: https://christesting123.atlassian.net/browse/{jira_issue['key']}",
            secrets={"SLACK_SECRET": "slack_secret"},
            run_after=[jira_issue],
        )

        # wait_res = wait(seconds = 5, run_after = [first_slack_message_result])

        follow_up_done = follow_up_on_pr_with_unreviewed_commits(
            pull_request=payload["pull_request"],
            repo_owner=payload["repo_owner"],
            repo_name=payload["repo_name"],
            run_after=[first_message],
            secrets={"GITHUB_SECRET": "github_secret"},
        )

        if not follow_up_done:
            send_slack_message_to_user_by_email(
                email="leon@admyral.ai",
                text=f"There was no follow up on the PR {payload['pull_request']['html_url']} with unreviewed commits",
                secrets={"SLACK_SECRET": "slack_secret"},
                run_after=[follow_up_done],
            )
