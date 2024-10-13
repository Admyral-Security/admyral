from typing import Annotated, Literal
from dateutil import parser

from admyral.workflow import workflow, Webhook
from admyral.typings import JsonValue
from admyral.action import action, ArgumentMetadata
from admyral.actions import (
    list_github_commit_history_for_pull_request,
    list_github_review_history_for_pull_request,
    send_slack_message_to_user_by_email,
    send_slack_message,
    create_jira_issue,
    compare_two_github_commits,
    openai_chat_completion,
    wait,
    transform,
)
from admyral.utils.collections import is_empty


@action(
    display_name="Check if PR has unreviewed commits",
    display_namespace="GitHub",
    description="Check PR for commits after last approval",
    secrets_placeholders=["GITHUB_SECRET"],
    requirements=["dateutil"],
)
def has_pr_unreviewed_commits(
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
    state: Annotated[
        Literal["APPROVED", "CHANGES_REQUESTED", "COMMENTED", "DISMISSED"] | None,
        ArgumentMetadata(display_name="State", description="The state of the review"),
    ] = "APPROVED",
) -> dict[str, JsonValue]:
    commit_history = list_github_commit_history_for_pull_request(
        repo_owner=repo_owner,
        repo_name=repo_name,
        pull_request_number=pull_request["number"],
    )

    if is_empty(commit_history):
        return {"has_unreviewed_commits": False}

    # Identify the latest commit
    last_commit = sorted(
        commit_history,
        key=lambda x: parser.parse(x["commit"]["committer"]["date"]),
        reverse=True,
    )[0]
    last_commit_id = last_commit["sha"]

    # Identify the last approved commit
    approval_history = list_github_review_history_for_pull_request(
        repo_owner=repo_owner,
        repo_name=repo_name,
        pull_request_number=pull_request["number"],
        state=state,
    )
    approval_history = sorted(
        approval_history, key=lambda x: parser.parse(x["submitted_at"]), reverse=True
    )

    # filter out self-approvals
    # => we only disallow self-approvals of the user who created the PR
    approval_history = [
        approval
        for approval in approval_history
        if approval["user"]["login"] != pull_request["user"]["login"]
    ]

    if is_empty(approval_history):
        return {
            "has_unreviewed_commits": True,
            "last_commit_id": last_commit_id,
            "last_approved_commit_id": pull_request["base"]["sha"],
        }

    last_approved_commit_id = approval_history[0]["commit_id"]
    if last_approved_commit_id != last_commit_id:
        return {
            "has_unreviewed_commits": True,
            "last_commit_id": last_commit_id,
            "last_approved_commit_id": last_approved_commit_id,
        }

    return {"has_unreviewed_commits": False}


@action(
    display_name="Count Number of Changes in Git Diff",
    display_namespace="GitHub",
    description="Count the number of changes in a git diff",
)
def count_number_of_changes_in_git_diff(
    git_diff: Annotated[
        dict[str, JsonValue],
        ArgumentMetadata(
            display_name="Git Diff",
            description="The git diff to be checked",
        ),
    ],
) -> int:
    return sum(map(lambda file: file["changes"], git_diff["files"]))


@workflow(description="Handle PR with unreviewed commits", triggers=[Webhook()])
def handle_pr_with_unreviewed_commits(payload: dict[str, JsonValue]):
    unreviewd_commits_result = has_pr_unreviewed_commits(
        pull_request=payload["pull_request"],
        repo_owner=payload["repo_owner"],
        repo_name=payload["repo_name"],
        secrets={"GITHUB_SECRET": "github_secret"},
    )

    if unreviewd_commits_result["has_unreviewed_commits"]:
        commit_diff_info = compare_two_github_commits(
            repo_owner=payload["repo_owner"],
            repo_name=payload["repo_name"],
            base=unreviewd_commits_result["last_approved_commit_id"],
            head=unreviewd_commits_result["last_commit_id"],
            diff_type="json",
            secrets={"GITHUB_SECRET": "github_secret"},
        )

        line_changes_count = count_number_of_changes_in_git_diff(
            git_diff=commit_diff_info
        )

        if line_changes_count < 50:
            # Perform classification of the git diff changes
            commit_diff = compare_two_github_commits(
                repo_owner=payload["repo_owner"],
                repo_name=payload["repo_name"],
                base=unreviewd_commits_result["last_approved_commit_id"],
                head=unreviewd_commits_result["last_commit_id"],
                diff_type="diff",
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

            is_major_change = openai_chat_completion(
                model="gpt-4o",
                prompt=f"You are an expert software engineer and should interpret summaries of git diffs, if there were major or only minor changes.\
                    Major changes would be adding a new feature or changing the functionality of an existing feature, hence potentially breaking changes.\
                    Minor changes on the other hand would be adding / fixing a comment or documentation, hence changes that don't influence the functionality of the code.\
                    The severity of the changes determine if they should be reviewed by an engineer. Hence, there are two options:\
                    1. The changes should get reviewed as they include potentially breaking changes or alter the functionality of the code.\
                    2. The changes don't have to be reviewed as they only include minor changes which do not alter or add functionality of the software in any way.\
                    Here is the summary of the changes:\n{git_diff_summary}\
                    Please only answer with either 1 or 2 followed by \n and nothing else.",
                stop_tokens=["\n"],
                secrets={"OPENAI_SECRET": "openai_secret"},
            )
        else:
            # The diff is too large, hence, we have a major change
            is_major_change = transform(value="1")

        if is_major_change == "1":
            jira_issue = create_jira_issue(
                summary=f"Unreviewed commits were merged. Pull Request: {payload["pull_request"]["title"]}",
                project_id="10001",  # TODO: set your project id here
                issue_type="Bug",
                description={
                    "content": [
                        {
                            "content": [
                                {
                                    "text": f"Title: {payload['pull_request']['title']}\n\
                                        Description: {payload['pull_request']['body']}\n\
                                        Repository: {payload['repo_owner']}/{payload['repo_name']}\n\
                                        User: {payload['pull_request']['user']['login']}\n\
                                        Link: {payload['pull_request']['html_url']}\n\
                                        Closed At: {payload['pull_request']['closed_at']}\n",
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

            # Send to an alert channel
            first_message = send_slack_message(
                channel_id="C06QP0KV1L2",  # TODO: set your slack channel here
                # TODO: set your Jira URL in the test message
                text=f"Unreviewed commits were merged. \n \
                    Pull Request: {payload["pull_request"]["title"]} \n \
                    {payload["pull_request"]["html_url"]} \n\
                    User: {payload['pull_request']['user']['login']}\n\
                    Jira issue : https://admyral.atlassian.net/browse/{jira_issue["key"]} \n\
                    \n \
                    Please let the changes be reviewed by a peer within the next 24 hours and close the ticket after the review.",
                secrets={"SLACK_SECRET": "slack_secret"},
            )

            wait_res = wait(
                seconds=120, run_after=[first_message]
            )  # TODO: configure your wait time here

            # check again whether there are still unreviewed commits
            unreviewed_commits_result = has_pr_unreviewed_commits(
                pull_request=payload["pull_request"],
                repo_owner=payload["repo_owner"],
                repo_name=payload["repo_name"],
                secrets={"GITHUB_SECRET": "github_secret"},
                state="COMMENTED",
                run_after=[wait_res],
            )

            if unreviewed_commits_result["has_unreviewed_commits"]:
                # Send message to compliance manager
                send_slack_message_to_user_by_email(
                    email="daniel@admyral.dev",  # TODO: set your email here
                    text=f"ATTENTION: There was no follow up on the merged unreviewed commits of pull request {payload['pull_request']['title']}.\n \
                            Jira Ticket: https://admyral.atlassian.net/browse/{jira_issue['key']}.",  # TODO: set your Jira URL here
                    secrets={"SLACK_SECRET": "slack_secret"},
                )
