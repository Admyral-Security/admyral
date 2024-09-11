from typing import Annotated

from admyral.workflow import workflow, Webhook
from admyral.typings import JsonValue
from admyral.action import action, ArgumentMetadata
from admyral.actions import (
    list_commit_history_for_pr,
    list_review_history_for_pr,
    send_slack_message_to_user_by_email,
    create_jira_issue,
    get_commit_diff_for_two_commits,
    get_commit_diff_info_for_two_commits,
    openai_chat_completion,
)


@action(
    display_name="Check PR for unreviewed commits",
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
) -> dict[str, JsonValue]:
    pr_number = pull_request.get("number")
    commit_history = list_commit_history_for_pr(
        repo_owner=repo_owner, repo_name=repo_name, pr_number=pr_number
    )

    print(commit_history)

    latest_commit = sorted(
        commit_history,
        key=lambda x: x["commit"]["committer"]["date"],
        reverse=True,
    )[0]

    approval_history = list_review_history_for_pr(
        repo_owner=repo_owner,
        repo_name=repo_name,
        pr_number=pr_number,
        state="APPROVED",
    )

    # If there are no approvals, the latest approved commit is the last commit on the branch from which the PR was created
    if not approval_history:
        latest_approval_id = pull_request.get("base").get("sha")
    else:
        latest_approval = approval_history[0]
        latest_approval_id = latest_approval.get("commit_id")

    latest_commit_id = latest_commit.get("sha")

    if latest_commit_id != latest_approval_id:
        return {
            "has_unreviewed_commits": True,
            "latest_commit_id": latest_commit_id,
            "latest_reviewed_commit": latest_approval_id,
        }

    return {"has_unreviewed_commits": False}


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
    approval_history = sorted(
        list_review_history_for_pr(
            repo_owner=repo_owner,
            repo_name=repo_name,
            pr_number=pr_number,
            state="APPROVED",
        ),
        key=lambda x: x["submitted_at"],
        reverse=True,
    )

    if approval_history:
        latest_approval = approval_history[0]
        date_of_last_review = latest_approval.get("submitted_at")
    else:
        date_of_last_review = pull_request.get("created_at")

    commit_history = list_commit_history_for_pr(
        repo_owner=repo_owner, repo_name=repo_name, pr_number=pr_number
    )
    unreviewd_commit_history = [
        commit
        for commit in commit_history
        if commit.get("commit").get("committer").get("date") > date_of_last_review
    ]

    excluded_reviewers = []

    for assigne in pull_request.get("assignees"):
        person = assigne.get("login")
        if person not in excluded_reviewers:
            excluded_reviewers.append(assigne.get("login"))
    for commit in unreviewd_commit_history:
        committer = commit.get("committer").get("id")
        author = commit.get("author").get("id")
        if committer not in excluded_reviewers:
            excluded_reviewers.append(committer)
        if author not in excluded_reviewers:
            excluded_reviewers.append(author)

    review_history = list_review_history_for_pr(
        repo_owner=repo_owner, repo_name=repo_name, pr_number=pr_number, state=None
    )

    merged_at = pull_request.get("merged_at")

    # TODO: After merge, or after the latest commit?
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


@action(
    display_name="Build Slack Message Based on Git Diff Analysis",
    display_namespace="Utility",
    description="Analyze the analysis of a Git diff and build a slack message",
)
def build_slack_message_based_on_diff_summary(
    git_diff_analysis: Annotated[
        str,
        ArgumentMetadata(
            display_name="Git Diff Analysis",
            description="Analysis of a Git diff",
        ),
    ],
) -> str:
    message = ""

    if git_diff_analysis.startswith("1"):
        message += "Major changes detected:\n"
        message += f"Summary of the changes: {git_diff_analysis}\n"

    return message


@action(
    display_name="Check Number of Changes in Git Diff",
    display_namespace="GitHub",
    description="Check if the git diff is too large to be interpreted by the AI",
)
def check_number_of_changes_in_git_diff(
    git_diff: Annotated[
        dict[str, JsonValue],
        ArgumentMetadata(
            display_name="Git Diff",
            description="The git diff to be checked",
        ),
    ],
) -> bool:
    print(git_diff)
    changes = 0
    for changed_file in git_diff.get("files"):
        changes += changed_file.get("changes")

    return changes > 50


@workflow(description="Handle PR with unreviewed commits", triggers=[Webhook()])
def handle_pr_with_unreviewed_commits(payload: dict[str, JsonValue]):
    unreviewd_commits_result = check_pr_for_unreviewed_commits(
        pull_request=payload["pull_request"],
        repo_owner=payload["repo_owner"],
        repo_name=payload["repo_name"],
        secrets={"GITHUB_SECRET": "github_secret"},
    )

    if unreviewd_commits_result["has_unreviewed_commits"]:
        commit_diff_info = get_commit_diff_info_for_two_commits(
            repo_owner=payload["repo_owner"],
            repo_name=payload["repo_name"],
            base=unreviewd_commits_result["latest_reviewed_commit"],
            head=unreviewd_commits_result["latest_commit_id"],
            secrets={"GITHUB_SECRET": "github_secret"},
        )

        git_diff_is_too_large = check_number_of_changes_in_git_diff(
            git_diff=commit_diff_info
        )

        if git_diff_is_too_large:
            jira_issue = create_jira_issue(
                summary=f"Unreviewed commits in PR {payload["pull_request"]['html_url']}.",
                project_id="10001",
                issue_type="Bug",
                description={
                    "content": [
                        {
                            "content": [
                                {
                                    "text": "Unreviewed changes with too many changes. Please review manually.",
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

            send_slack_message_to_user_by_email(
                email="leon@admyral.ai",
                text=f"Unreviewed commits merged in Pull Request ({payload["pull_request"]['html_url']}).\n Jira issue created: https://christesting123.atlassian.net/browse/{jira_issue['key']} \n--------------\n",
                secrets={"SLACK_SECRET": "slack_secret"},
                run_after=[jira_issue],
            )

        else:
            commit_diff = get_commit_diff_for_two_commits(
                repo_owner=payload["repo_owner"],
                repo_name=payload["repo_name"],
                base=unreviewd_commits_result["latest_reviewed_commit"],
                head=unreviewd_commits_result["latest_commit_id"],
                secrets={"GITHUB_SECRET": "github_secret"},
            )

            git_diff_summary = openai_chat_completion(
                model="gpt-4o",
                prompt=f"You are an expert level software engineer and should summarize git diffs. \
                    For the git differences, it's important to check for code additions (+) or code deletions (-). In the following I will give you some examples:\n\
                    Example 1:\
                    +def bizzi():\
                    ....\
                    Summary: A new function bizzi() was added. \n\
                    Example 2:\
                    -def baz():\
                    +def bazz():\
                    Summary: The function baz() was renamed to bazz(). \n\
                    Example 3:\
                    +# this is a new feature\
                    def new_feature():\
                    ...\
                    Summary: A comment was added to an already existing function, describing it's purpose. \
                    Please summarize the following git diff: \n {commit_diff} \n \
                    Construct your answer in the following way: state which file was modified and use bullet points to describe the changes. Do not include any code. \
                    In the end, give a short summary of all the changes.",
                secrets={"OPENAI_SECRET": "openai_secret"},
            )

            git_diff_major_minor_change_decision = openai_chat_completion(
                model="gpt-4o",
                prompt=f"You are an expert software engineer and should interpret summaries of git diffs, if there were major or only minor changes.\
                    Major changes would be adding a new feature or changing the functionality of an existing feature, hence potentially breaking changes.\
                    Minor changes on the other hand would be adding / fixing a comment or documentation, hence changes that don't influence the functionality of the code.\
                    The severity of the changes determine if they should be reviewed by an engineer. Hence, there are two options:\
                    1. The changes should get reviewed as they include potentially breaking changes or alter the functionality of the code.\
                    2. The changes don't have to be reviewed as they only include minor changes which do not alter or add functionality of the software in any way.\
                    Here is the summary of the changes:\n{git_diff_summary}\
                    Please only answer with either 1 or 2 and nothing else.",
                run_after=[git_diff_summary],
                secrets={"OPENAI_SECRET": "openai_secret"},
            )

            message = build_slack_message_based_on_diff_summary(
                git_diff_analysis=git_diff_major_minor_change_decision,
                run_after=[git_diff_major_minor_change_decision],
            )

            if message:
                jira_issue = create_jira_issue(
                    summary=f"Unreviewed commits in PR {payload["pull_request"]['html_url']}",
                    project_id="10001",
                    issue_type="Bug",
                    description={
                        "content": [
                            {
                                "content": [
                                    {
                                        "text": f"AI Summary: {git_diff_summary}",
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
                    text=f"Unreviewed commits merged in Pull Request ({payload["pull_request"]['html_url']}).\n{git_diff_summary}\n Jira issue created: https://christesting123.atlassian.net/browse/{jira_issue['key']} \n--------------\n",
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
                        text=f"There was no follow up on the PR {payload['pull_request']['html_url']} with unreviewed commits after the initial message. Please check the PR and follow up accordingly and close the Jira Ticket https://christesting123.atlassian.net/browse/{jira_issue['key']}.\n--------------\n",
                        secrets={"SLACK_SECRET": "slack_secret"},
                        run_after=[follow_up_done],
                    )
