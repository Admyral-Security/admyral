"""
Setup:
Follow setup instruction from the github documentation to create personal access token
https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token
"""

from typing import Annotated, Literal, Union
from httpx import Client
from dateutil import parser

from admyral.action import action, ArgumentMetadata
from admyral.context import ctx
from admyral.typings import JsonValue
from admyral.utils.collections import is_not_empty, is_empty


def get_github_enterprise_client(access_token: str, enterprise: str) -> Client:
    return Client(
        base_url=f"https://api.github.com/enterprises/{enterprise}",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github.v3+json",
        },
    )


def get_github_client(access_token: str) -> Client:
    return Client(
        base_url="https://api.github.com",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github.v3+json",
        },
    )


def _get_events_with_pagination(
    client: Client,
    url: str,
    params: dict,
    limit: int | None = None,
    event_filter_fn: Union[callable, None] = None,
    early_stop_fn: Union[callable, None] = None,
) -> list[dict[str, JsonValue]]:
    events = []
    while limit is None or len(events) < limit:
        response = client.get(url, params=params)
        response.raise_for_status()
        events_on_page = response.json()

        if event_filter_fn:
            events.extend(filter(event_filter_fn, events_on_page))
        else:
            events.extend(events_on_page)

        if early_stop_fn and early_stop_fn(events_on_page):
            break

        if "next" in response.links:
            url = response.links["next"]["url"][len(str(client.base_url)) :]
            params = None
        else:
            break

    return events


@action(
    display_name="Search Enterprise Audit Logs",
    display_namespace="GitHub",
    description="Search GitHub audit logs for an enterprise.",
    secrets_placeholders=["GITHUB_ENTERPRISE_SECRET"],
)
def search_github_enterprise_audit_logs(
    enterprise: Annotated[
        str,
        ArgumentMetadata(
            display_name="Enterprise",
            description="The slug version of the enterprise name. You can also substitute this value with the enterprise id.",
        ),
    ],
    filter: Annotated[
        str,
        ArgumentMetadata(
            display_name="Filter",
            description="Filter to apply to the query.",
        ),
    ] = None,
    start_time: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="Start Time",
            description="The start time for the cases to list. Must be in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ).",
        ),
    ] = None,
    end_time: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="End Time",
            description="The end time for the cases to list. Must be in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ).",
        ),
    ] = None,
    limit: Annotated[
        int | None,
        ArgumentMetadata(
            display_name="Limit",
            description="Maximum number of logs to return.",
        ),
    ] = None,
) -> list[dict[str, JsonValue]]:
    # https://docs.github.com/en/enterprise-cloud@latest/rest/enterprise-admin/audit-log?apiVersion=2022-11-28#get-the-audit-log-for-an-enterprise
    # https://docs.github.com/en/search-github/getting-started-with-searching-on-github/understanding-the-search-syntax#query-for-dates

    secret = ctx.get().secrets.get("GITHUB_ENTERPRISE_SECRET")
    access_token = secret["access_token"]

    with get_github_enterprise_client(access_token, enterprise) as client:
        params = {"order": "asc", "per_page": 100}

        phrases = []

        if filter:
            phrases.append(filter)

        if start_time and end_time:
            phrases.append(f"created:{start_time}..{end_time}")
        elif start_time:
            phrases.append(f"created:>={start_time}")
        elif end_time:
            phrases.append(f"created:<={end_time}")

        if is_not_empty(phrases):
            params["phrase"] = " ".join(phrases)

        events = _get_events_with_pagination(
            client=client,
            url="/audit-log",
            params=params,
            limit=limit,
        )

        return events if limit is None else events[:limit]


@action(
    display_name="Compare Two GitHub Commits",
    display_namespace="GitHub",
    description="Get the commit diff info between two commits.",
    secrets_placeholders=["GITHUB_SECRET"],
)
def compare_two_github_commits(
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
    base: Annotated[
        str,
        ArgumentMetadata(
            display_name="Base",
            description="The base commit (commit ID or SHA)",
        ),
    ],
    head: Annotated[
        str,
        ArgumentMetadata(
            display_name="Head",
            description="The head commit (commit ID or SHA)",
        ),
    ],
    diff_type: Annotated[
        Literal["json", "diff"],
        ArgumentMetadata(
            display_name="Diff Type",
            description="The type of diff to return. 'json' returns the diff as JSON. "
            "'diff' returns the diff as string in the same format as the CLI command "
            "git diff BASE..HEAD. Default: 'json'.",
        ),
    ] = "json",
) -> dict[str, JsonValue]:
    # https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28#compare-two-commits

    secret = ctx.get().secrets.get("GITHUB_SECRET")
    access_token = secret["access_token"]

    with get_github_client(access_token=access_token) as client:
        url = f"/repos/{repo_owner}/{repo_name}/compare/{base}...{head}"

        if diff_type == "diff":
            headers = {"Accept": "application/vnd.github.v3.diff"}
            diff = ""
            while True:
                response = client.get(url, headers=headers)
                response.raise_for_status()
                diff += response.text

                if "next" in response.links:
                    url = response.links["next"]["url"][len(str(client.base_url)) :]
                else:
                    break

            return diff

        response = client.get(url)
        response.raise_for_status()

        return response.json()


@action(
    display_name="List Merged Pull Requests for a Repository",
    display_namespace="GitHub",
    description="List all merged pull requests for a repository.",
    secrets_placeholders=["GITHUB_SECRET"],
)
def list_merged_pull_requests(
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
    start_time: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="Start Time",
            description="The start time for the cases to list. Must be in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ).",
        ),
    ] = None,
    end_time: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="End Time",
            description="The end time for the cases to list. Must be in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ).",
        ),
    ] = None,
    limit: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="Limit",
            description="The maximum number of cases to list.",
        ),
    ] = None,
) -> list[dict[str, JsonValue]]:
    # https://docs.github.com/en/rest/pulls/pulls?apiVersion=2022-11-28

    secret = ctx.get().secrets.get("GITHUB_SECRET")
    access_token = secret["access_token"]

    with get_github_client(access_token=access_token) as client:
        params = {
            "state": "closed",
            "sort": "updated",
            "direction": "desc",
            "per_page": 100,
        }

        # convert into datetime object
        start_time = parser.isoparse(
            start_time if start_time else "1970-01-01T00:00:00Z"
        )
        end_time = parser.isoparse(end_time if end_time else "2100-01-01T00:00:00Z")

        events = _get_events_with_pagination(
            client=client,
            url=f"/repos/{repo_owner}/{repo_name}/pulls",
            params=params,
            limit=limit,
            event_filter_fn=lambda event: event["merged_at"]
            and start_time <= parser.isoparse(event["merged_at"]) <= end_time,
            early_stop_fn=lambda events: end_time
            < parser.isoparse(events[-1]["updated_at"]),
        )

        return events


@action(
    display_name="Get Commit History for a Pull Request",
    display_namespace="GitHub",
    description="List commit history for a Pull Request from most recent to oldest",
    secrets_placeholders=["GITHUB_SECRET"],
)
def list_commit_history_for_pull_request(
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
    pull_request_number: Annotated[
        int,
        ArgumentMetadata(
            display_name="Pull Request Number",
            description="The name of the repository",
        ),
    ],
) -> list[dict[str, JsonValue]]:
    # https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28

    secret = ctx.get().secrets.get("GITHUB_SECRET")
    access_token = secret["access_token"]

    with get_github_client(access_token=access_token) as client:
        events = _get_events_with_pagination(
            client=client,
            url=f"/repos/{repo_owner}/{repo_name}/pulls/{pull_request_number}/commits",
            params={"per_page": 100},
        )
        return events


@action(
    display_name="Get Approval History for a Pull Request",
    display_namespace="GitHub",
    description="List approval history for a Pull Request",
    secrets_placeholders=["GITHUB_SECRET"],
)
def list_review_history_for_pull_request(
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
    pull_request_number: Annotated[
        int,
        ArgumentMetadata(
            display_name="Pull Request Number",
            description="The name of the repository",
        ),
    ],
    state: Annotated[
        Literal["APPROVED", "CHANGES_REQUESTED", "COMMENTED", "DISMISSED"] | None,
        ArgumentMetadata(
            display_name="State",
            description="The state of the reviews to list.",
        ),
    ] = None,
) -> list[dict[str, JsonValue]]:
    # https://docs.github.com/en/rest/pulls/reviews?apiVersion=2022-11-28
    secret = ctx.get().secrets.get("GITHUB_SECRET")
    access_token = secret["access_token"]

    with get_github_client(access_token=access_token) as client:
        params = {
            "per_page": 100,
        }

        if state:
            event_filter_fn = lambda event: event["state"] == state  # noqa: E731
        else:
            event_filter_fn = None

        events = _get_events_with_pagination(
            client=client,
            url=f"/repos/{repo_owner}/{repo_name}/pulls/{pull_request_number}/reviews",
            params=params,
            event_filter_fn=event_filter_fn,
        )

        return events


@action(
    display_name="List Merged Pull Requests Without Approval",
    display_namespace="GitHub",
    description="List all pull requests of a repository that contain unapproved commits, i.e., PRs which were never approved or commits after an approval.",
    secrets_placeholders=["GITHUB_SECRET"],
)
def list_merged_pull_requests_without_approval(
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
    start_time: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="Start Time",
            description="The start time for the cases to list. Must be in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ).",
        ),
    ] = None,
    end_time: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="End Time",
            description="The end time for the cases to list. Must be in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ).",
        ),
    ] = None,
) -> list[dict[str, JsonValue]]:
    merged_prs = list_merged_pull_requests(
        repo_owner=repo_owner,
        repo_name=repo_name,
        start_time=start_time,
        end_time=end_time,
    )

    unreviewed_prs = []
    for pr in merged_prs:
        commit_history = list_commit_history_for_pull_request(
            repo_owner=repo_owner, repo_name=repo_name, pull_request_number=pr["number"]
        )
        if is_empty(commit_history):
            continue

        # Identify the latest commit
        last_commit = sorted(
            commit_history,
            key=lambda commit: parser.parse(commit["commit"]["committer"]["date"]),
            reverse=True,
        )[0]
        last_commit_id = last_commit["sha"]

        # Identify the last approved commit
        approval_history = list_review_history_for_pull_request(
            repo_owner=repo_owner,
            repo_name=repo_name,
            pull_request_number=pr["number"],
            state="APPROVED",
        )
        if is_empty(approval_history):
            unreviewed_prs.append(
                {
                    "number": pr["number"],
                    "title": pr["title"],
                    "html_url": pr["html_url"],
                    "user": pr["user"]["login"],
                }
            )
            continue

        approval_history = sorted(
            approval_history,
            key=lambda approval: parser.parse(approval["submitted_at"]),
            reverse=True,
        )

        last_approved_commit_id = approval_history[0]["commit_id"]
        if last_commit_id != last_approved_commit_id:
            unreviewed_prs.append(
                {
                    "number": pr["number"],
                    "title": pr["title"],
                    "html_url": pr["html_url"],
                    "user": pr["user"]["login"],
                }
            )

    return unreviewed_prs
