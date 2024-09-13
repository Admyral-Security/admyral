from typing import Annotated
from datetime import datetime, timedelta, UTC

import requests

from admyral.workflow import workflow, Schedule
from admyral.typings import JsonValue
from admyral.action import action, ArgumentMetadata
from admyral.actions import list_merged_pull_requests


@action(
    display_name="Calculate Time Range for Last Full Hour",
    display_namespace="Utilities",
    description="Calculate the time range for the last full hour",
)
def get_time_range_of_last_full_hour() -> tuple[str, str]:
    end_time = datetime.now(UTC).replace(minute=0, second=0, microsecond=0)
    start_time = (end_time - timedelta(hours=1)).isoformat().replace("+00:00", "Z")
    return (start_time, end_time.isoformat().replace("+00:00", "Z"))


@action(
    display_name="Check closed PRs for unreviewed merged commits",
    display_namespace="Utilities",
    description="Iterate over all PRs and check if approved commit is last commit",
    secrets_placeholders=["GITHUB_SECRET"],
    requirements=["requests"],
)
def check_pull_requests_for_unreviewed_merged_commits(
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
) -> None:
    # TODO: update webhook_id and webhook_secret with the values form the "handle_pr_with_unreviewed_commits" workflow
    webhook_id = "0effe4ca-0385-4786-a36d-6e6172ff25b0"
    webhook_secret = "cb0762a35395230f595c2487878a257e45762ea0286b62b92db542de4740f63c"
    webhook_url = f"http://127.0.0.1:8000/webhooks/{webhook_id}/{webhook_secret}"

    for pr in pull_requests:
        payload = {
            "repo_owner": repo_owner,
            "repo_name": repo_name,
            "pull_request": pr,
        }
        # call different workflow to handle the PR
        response = requests.post(url=webhook_url, json=payload)

        response.raise_for_status()


@workflow(
    description="Alert if unreviewed commits are merged, which should have been reviewed",
    triggers=[Schedule(cron="0 * * * *")],
)
def github_unreviewed_commits_are_merged(payload: dict[str, JsonValue]):
    start_end_end_time = get_time_range_of_last_full_hour()

    merged_prs = list_merged_pull_requests(
        repo_owner="admyral",  # TODO: set repo owner
        repo_name="admyral",  # TODO: set repo name
        start_time=start_end_end_time[0],
        end_time=start_end_end_time[1],
        secrets={"GITHUB_SECRET": "github_secret"},
    )

    if merged_prs:
        check_pull_requests_for_unreviewed_merged_commits(
            pull_requests=merged_prs,
            repo_owner="admyral",  # TODO: set repo owner
            repo_name="admyral",  # TODO: set repo name
            secrets={"GITHUB_SECRET": "github_secret"},
        )
