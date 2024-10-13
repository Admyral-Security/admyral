"""

How to push this workflow to Admyral:

1. Replace the placeholders marked with TODO in the workflow code below.

2. Save the changes.

3. Use the following CLI commands for pushing the workflow (WARNING: Make sure that the file paths are correct):

admyral action push count_number_of_changes_in_git_diff -a workflows/monitor_and_follow_up_merged_github_prs_without_approval.py
admyral action push contains_pull_request_approval_as_comment -a workflows/monitor_and_follow_up_merged_github_prs_without_approval.py
admyral workflow push monitor_merged_github_prs_without_approval -f workflows/monitor_and_follow_up_merged_github_prs_without_approval.py --activate
admyral workflow push handle_merged_github_pr_without_approval -f workflows/monitor_and_follow_up_merged_github_prs_without_approval.py --activate

4. Connect to the following tools (see docs.admyral.dev for more information):

    - Slack
    - GitHub
    - Jira
    - OpenAI

"""

from typing import Annotated

from admyral.workflow import workflow, Schedule
from admyral.typings import JsonValue
from admyral.action import action, ArgumentMetadata
from admyral.actions import (
    list_github_merged_pull_requests_without_approval,
    get_time_interval_of_last_n_days,
    send_slack_message,
    send_list_elements_to_workflow,
    compare_two_github_commits,
    transform,
    send_slack_message_to_user_by_email,
    wait,
    create_jira_issue,
    openai_chat_completion,
    list_github_review_history_for_pull_request,
)


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


@action(
    display_name="Contains Pull Request Approval as Comment?",
    display_namespace="GitHub",
    description='Check whether there is a comment "approved" in the review history after the last commit.',
)
def contains_pull_request_approval_as_comment(
    review_history: Annotated[
        list[dict[str, JsonValue]],
        ArgumentMetadata(
            display_name="Review History",
            description="The review history of the pull request.",
        ),
    ],
    last_commit_id: Annotated[
        str,
        ArgumentMetadata(
            display_name="Last Commit ID",
            description="The ID of the last commit of the pull request.",
        ),
    ],
) -> bool:
    return any(
        map(
            lambda review: review.get("body", "").lower() == "approved"
            and review.get("commit_id") == last_commit_id,
            review_history,
        )
    )


@workflow(
    description="Monitor Merged GitHub PRs Without Approval",
    triggers=[Schedule(interval_days=1)],
)
def monitor_merged_github_prs_without_approval(payload: dict[str, JsonValue]):
    last_day_time_interval = get_time_interval_of_last_n_days(n_days=1)

    unreviewed_prs = list_github_merged_pull_requests_without_approval(
        repo_owner="Admyral-Security",  # TODO: set your repo owner here
        repo_name="Admyral_Github_Integration_Test",  # TODO: set your repo name here
        start_time=last_day_time_interval[0],
        end_time=last_day_time_interval[1],
        secrets={"GITHUB_SECRET": "github_secret"},
    )

    send_list_elements_to_workflow(
        workflow_name="handle_merged_github_pr_without_approval",
        elements=unreviewed_prs,
        shared_data={
            "repo_owner": "Admyral-Security",  # TODO: set your repo owner here
            "repo_name": "Admyral_Github_Integration_Test",  # TODO: set your repo name here
        },
    )


@workflow(
    description="Handle Merged GitHub PRs Without Approval",
    triggers=[Schedule(interval_days=1)],
)
def handle_merged_github_pr_without_approval(payload: dict[str, JsonValue]):
    commit_diff_info = compare_two_github_commits(
        repo_owner=payload["shared"]["repo_owner"],
        repo_name=payload["shared"]["repo_name"],
        base=payload["element"]["last_approved_commit_id"],
        head=payload["element"]["last_commit_id"],
        diff_type="json",
        secrets={"GITHUB_SECRET": "github_secret"},
    )

    line_changes_count = count_number_of_changes_in_git_diff(git_diff=commit_diff_info)

    if line_changes_count < 50:
        # Perform classification of the git diff changes
        commit_diff = compare_two_github_commits(
            repo_owner=payload["shared"]["repo_owner"],
            repo_name=payload["shared"]["repo_name"],
            base=payload["element"]["last_approved_commit_id"],
            head=payload["element"]["last_commit_id"],
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
            summary=f"Unreviewed commits were merged. Pull Request: {payload["element"]["title"]}",
            project_id="10001",  # TODO: set your Jira project id here
            issue_type="Bug",
            description={
                "content": [
                    {
                        "content": [
                            {
                                "text": f"Title: {payload['element']['title']}\n"
                                f"Repository: {payload["shared"]['repo_owner']}/{payload["shared"]['repo_name']}\n"
                                f"User: {payload['element']['user']}\nLink: {payload['element']['html_url']}\n"
                                f"Closed At: {payload['element']['closed_at']}",
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
            text=f"Unreviewed commits were merged.\nPull Request: {payload["element"]["title"]}\n"
            f"{payload["element"]["html_url"]}\nUser: {payload['element']['user']}\n"
            f"Jira issue: https://admyral.atlassian.net/browse/{jira_issue["key"]}\n\n"
            "Please let the changes be approved by letting a peer comment the merged PR with \"approved\" "
            "within the next 24 hours and close the ticket after the review.",
            secrets={"SLACK_SECRET": "slack_secret"},
        )

        wait_res = wait(
            seconds=120, run_after=[first_message]
        )  # TODO: configure your wait time here

        # check again whether there was an approval
        review_history = list_github_review_history_for_pull_request(
            repo_owner=payload["shared"]["repo_owner"],
            repo_name=payload["shared"]["repo_name"],
            pull_request_number=payload["element"]["number"],
            state="COMMENTED",
            secrets={"GITHUB_SECRET": "github_secret"},
            run_after=[wait_res],
        )
        has_approval = contains_pull_request_approval_as_comment(
            review_history=review_history,
            last_commit_id=payload["element"]["last_commit_id"],
        )

        if not has_approval:
            # Send message to responsible user for handling such cases
            send_slack_message_to_user_by_email(
                email="daniel@admyral.ai",  # TODO: set your email here
                text=f"ATTENTION: There was no follow up on the merged unreviewed commits of pull request {payload['element']['title']}.\n"
                f"Jira Ticket: https://admyral.atlassian.net/browse/{jira_issue['key']}.",  # TODO: set your Jira URL here
                secrets={"SLACK_SECRET": "slack_secret"},
            )
