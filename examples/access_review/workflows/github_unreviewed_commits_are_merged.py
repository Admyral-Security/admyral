from typing import Annotated
from datetime import datetime, timedelta, UTC

import requests

from admyral.workflow import workflow, Schedule
from admyral.typings import JsonValue
from admyral.action import action, ArgumentMetadata
from admyral.actions import (
    list_merged_prs,
)


@action(
    display_name="Calculate Time Range for Last Full Hour",
    display_namespace="Utilities",
    description="Calculate the time range for the last full hour",
)
def get_time_range_of_last_full_hour() -> tuple[str, str]:
    end_time = datetime.now(UTC).replace(minute=0, second=0, microsecond=0)
    start_time = (end_time - timedelta(hours=1)).isoformat() + "Z"
    return (start_time, end_time.isoformat() + "Z")


@action(
    display_name="Check PRs for merging unreviewed commits",
    display_namespace="Utilities",
    description="Iterate over all PRs and check if approved commit is last commit",
    secrets_placeholders=["GITHUB_SECRET"],
    requirements=["requests"],
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
) -> None:
    for pr in pull_requests:
        webhook_url = "http://127.0.0.1:8000/webhooks/be941ac5-4d35-4fc3-baf3-5c1eb65d5096/3ea17bf42a97e58e417b73a133528bf9aab7bab904e1c3fbafdb65e0b18dc66e"
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
    triggers=[Schedule(cron="0 * * * *", repo_name="", repo_owner="")],
)
def github_unreviewed_commits_are_merged(payload: dict[str, JsonValue]):
    # start_end_end_time = get_time_range_of_last_full_hour()

    merged_prs = list_merged_prs(
        repo_owner=payload["repo_owner"],
        repo_name=payload["repo_name"],
        # start_time=start_end_end_time[0],
        # end_time=start_end_end_time[1],
        secrets={"GITHUB_SECRET": "github_secret"},
    )

    check_prs_for_merging_unreviewed_commits(
        pull_requests=merged_prs,
        repo_name=payload["repo_name"],
        repo_owner=payload["repo_owner"],
        secrets={"GITHUB_SECRET": "github_secret"},
    )
