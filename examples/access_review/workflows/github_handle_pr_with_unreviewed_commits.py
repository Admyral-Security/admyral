from typing import Annotated
from datetime import datetime

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
    latest_commit = list_commit_history_for_pr(
        repo_owner=repo_owner, repo_name=repo_name, pr_number=pr_number
    )[0]
    latest_approval = list_review_history_for_pr(
        repo_owner=repo_owner,
        repo_name=repo_name,
        pr_number=pr_number,
        state="APPROVED",
    )[0]

    if latest_commit.get("sha") != latest_approval.get("commit_id"):
        latest_approval_date = datetime.fromisoformat(
            latest_approval.get("submitted_at")
        )
        # build message
        message = f"Attention, PR {pr_number} ({pull_request.get("html_url")}) has unreviewed commits merged\n"
        message += f"Latest commit: {latest_commit.get('sha')} at {latest_commit.get('commit').get('committer').get('date')}\n"
        message += f"Latest approval: {latest_approval.get('commit_id')} at {latest_approval_date}\n"

    return message


@action(
    display_name="Follow up on PR with Unreviewed Commits",
    display_namespace="GitHub",
    description="Follow up on PR with unreviewed commits",
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
    pr_number: Annotated[
        int,
        ArgumentMetadata(
            display_name="PR Number",
            description="The name of the repository",
        ),
    ],
) -> bool:
    merged_at = pull_request.get("merged_at")
    commit_history = list_commit_history_for_pr(
        repo_owner=repo_owner, repo_name=repo_name, pr_number=pr_number
    )
    # only keep commits after merge
    commit_history_after_merge = [
        commit
        for commit in commit_history
        if commit.get("commit").get("committer").get("date") > merged_at
    ]

    exlude_reviewer = []
    if commit_history_after_merge:
        for assigne in pull_request.get("assignees"):
            exlude_reviewer.append(assigne.get("login"))
        for commit in commit_history_after_merge:
            exlude_reviewer.append(commit.get("committer").get("id"))
            exlude_reviewer.append(commit.get("author").get("id"))

    review_history = list_review_history_for_pr(
        repo_owner=repo_owner, repo_name=repo_name, pr_number=pr_number
    )
    # only keep reviews after merge
    review_history_after_merge = [
        review for review in review_history if review.get("submitted_at") > merged_at
    ]
    # check if one of the reviews was by someone who is not excluded
    for review in review_history_after_merge:
        user_info = review.get("user")
        if (
            user_info.get("id") not in exlude_reviewer
            or user_info.get("login") not in exlude_reviewer
        ):
            return True
    return False


@workflow(description="Handle PR with unreviewed commits", triggers=Webhook())
def handle_pr_with_unreviewed_commits(payload: dict[str, JsonValue]):
    message = check_pr_for_unreviewed_commits(payload)

    if message:
        jira_issue = create_jira_issue(
            summary=f"Unreviewed commits in PR {payload['html_url']}",
            project_id="10001",
            issue_type="Bug",
            description={
                "content": [
                    {
                        "content": [
                            {
                                "text": "AI Alert Summary: **COMING SOON**",
                                "type": "text",
                            }
                        ],
                        "type": "paragraph",
                    },
                ],
            },
            secrets={"JIRA_SECRET": "jira_secret"},
        )

        message += f"Jira issue created: {jira_issue.get('key')}"

        # first_slack_message_result = send_slack_message_to_user_by_email(
        #     email="",
        #     text=message,
        #     secrets={"SLACK_SECRET": "slack_secret"},
        # )

        # wait_res = wait(seconds = 5, run_after = [first_slack_message_result])

        follow_up_done = follow_up_on_pr_with_unreviewed_commits(payload)

        if not follow_up_done:
            send_slack_message_to_user_by_email(
                email="",
                text=message,
                secrets={"SLACK_SECRET": "slack_secret"},
            )
