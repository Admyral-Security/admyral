from typing import Annotated
from datetime import datetime

from admyral.workflow import workflow, Schedule
from admyral.typings import JsonValue
from admyral.action import action, ArgumentMetadata
from admyral.actions import (
    list_merged_prs,
    list_commit_history_for_pr,
    list_review_history_for_pr,
    send_slack_message_to_user_by_email,
)


@action(
    display_name="Check PRs for merging unreviewed commits",
    display_namespace="Utilities",
    description="Iterate over all PRs and check if approved commit is last commit",
)
def check_prs_for_merging_unreviewed_commits(
    pull_requests: Annotated[
        list[dict[str, JsonValue]],
        ArgumentMetadata(
            display_name="Merged Pull Requests",
            description="List of all merged pull requests for given Repo",
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
    for pr in pull_requests:
        pr_number = pr.get("number")
        latest_commit = list_commit_history_for_pr(
            repo_owner=repo_owner, repo_name=repo_name, pr_number=pr_number
        )[0]
        latest_approval = list_review_history_for_pr(
            repo_owner=repo_owner, repo_name=repo_name, pr_number=pr_number
        )[0]

        # compare commit hash
        if latest_commit.get("sha") != latest_approval.get("commit_id"):
            latest_approval_date = datetime.fromisoformat(
                latest_approval.get("submitted_at")
            )
            # build message
            message = f"Attention, PR {pr_number} ({pr.get("html_url")}) has unreviewed commits merged\n"
            message += f"Latest commit: {latest_commit.get('sha')} at {latest_commit.get('commit').get('committer').get('date')}\n"
            message += f"Latest approval: {latest_approval.get('commit_id')} at {latest_approval_date}\n"

        return message


@workflow(
    description="Alert if major unreviewed commits are merged",
    triggers=[Schedule(cron="0 * * * *", repo_name="", repo_owner="")],
)
def github_major_unreviewed_commits_are_merged(payload: dict[str, JsonValue]):
    merged_prs = list_merged_prs(
        repo_name=payload["repo_name"], repo_owner=payload["repo_owner"]
    )

    results = check_prs_for_merging_unreviewed_commits(
        pull_requests=merged_prs,
        repo_name=payload["repo_name"],
        repo_owner=payload["repo_owner"],
    )

    if results:
        send_slack_message_to_user_by_email(
            email="",
            text=results,
            secrets={"SLACK_SECRET": "slack_secret"},
        )
