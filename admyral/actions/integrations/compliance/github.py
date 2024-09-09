"""
Setup:
Follow setup instruction from the github documentation to create personal access token
https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token
"""

from typing import Annotated
from httpx import Client

from admyral.action import action, ArgumentMetadata
from admyral.context import ctx
from admyral.typings import JsonValue


def get_github_enterprise_client(access_token: str, enterprise: str) -> Client:
    return Client(
        base_url=f"https://api.github.com/enterprises/{enterprise}",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github.v3+json",
        },
    )

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
    # https://docs.github.com/en/search-github/getting-started-with-searching-on-github/understanding-the-search-syntax#query-for-dates

    secret = ctx.get().secrets.get("GITHUB_ENTERPRISE_SECRET")
    access_token = secret["access_token"]

    with get_github_enterprise_client(access_token, enterprise) as client:
        params = {"order": "asc", "per_page": 100}
        if filter:
            params["phrase"] = filter

        if start_time and end_time:
            params["created"] = f"{start_time}..{end_time}"

        elif start_time:
            params["created"] = f">={start_time}"

        elif end_time:
            params["created"] = f"<={end_time}"

        url = "/audit-log"
        events = []
        while limit is None or len(events) < limit:
            response = client.get(
                url,
                params=params,
            )
            response.raise_for_status()
            events.extend(response.json())

            if "next" in response.links:
                url = response.links["next"]["url"][len(str(client.base_url)) :]
                params = None
            else:
                break

        return events if limit is None else events[:limit]


def get_github_client(access_token: str) -> Client:
    return Client(
        base_url="https://api.github.com",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github.v3+json",
        },
    )

@action(
    display_name="List Merged PRs for a Repository",
    display_namespace="GitHub",
    description="List all merged PRs for a repository",
    secrets_placeholders=["GITHUB_SECRET"],
)
def list_merged_prs(
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
    ] = "1970-01-01T00:00:00Z",
    end_time: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="End Time",
            description="The end time for the cases to list. Must be in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ).",
        ),
    ] = "2100-01-01T00:00:00Z",
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
        url = f"/repos/{repo_owner}/{repo_name}/pulls"
        events = []

        # handle pagination
        while True:
            response = client.get(url, params=params)
            response.raise_for_status()
            events.extend(response.json())

            if "next" in response.links:
                url = response.links["next"]["url"]
            else:
                break

        return [
            pr
            for pr in events
            if pr["merged_at"] and start_time <= pr["merged_at"] <= end_time
        ]


@action(
    display_name="Get Commit History for a PR",
    display_namespace="GitHub",
    description="List commit history for a PR from most recent to oldest",
    secrets_placeholders=["GITHUB_SECRET"],
)
def list_commit_history_for_pr(
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
    limit: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="Limit",
            description="The maximum number of cases to list.",
        ),
    ] = 100,
) -> list[dict[str, JsonValue]]:
    # https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28

    secret = ctx.get().secrets.get("GITHUB_SECRET")
    access_token = secret["access_token"]

    with get_github_client(access_token=access_token) as client:
        params = {
            "per_page": 100,
        }
        url = f"/repos/{repo_owner}/{repo_name}/pulls/{pr_number}/commits"
        events = []

        # handle pagination
        while True:
            response = client.get(url, params=params)
            response.raise_for_status()
            events.extend(response.json())

            if "next" in response.links:
                url = response.links["next"]["url"]
            else:
                break

        return sorted(
            events, key=lambda x: x["commit"]["committer"]["date"], reverse=True
        )


@action(
    display_name="Get Approval History for a PR",
    display_namespace="GitHub",
    description="List aproval history for a PR",
    secrets_placeholders=["GITHUB_SECRET"],
)
def list_approval_history_for_pr(
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
    limit: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="Limit",
            description="The maximum number of cases to list.",
        ),
    ] = 100,
) -> list[dict[str, JsonValue]]:
    # https://docs.github.com/en/rest/pulls/reviews?apiVersion=2022-11-28
    secret = ctx.get().secrets.get("GITHUB_SECRET")
    access_token = secret["access_token"]

    with get_github_client(access_token=access_token) as client:
        params = {
            "per_page": 100,
        }
        url = f"/repos/{repo_owner}/{repo_name}/pulls/{pr_number}/reviews"
        events = []

        # handle pagination
        while True:
            response = client.get(url, params=params)
            response.raise_for_status()
            events.extend(response.json())

            if "next" in response.links:
                url = response.links["next"]["url"]
            else:
                break

        approves = [review for review in events if review["state"] == "APPROVED"]

        return sorted(approves, key=lambda x: x["submitted_at"], reverse=True)


@action(
    display_name="Get Difference for a Commit",
    display_namespace="GitHub",
    description="List diff for a commit",
    secrets_placeholders=["GITHUB_SECRET"],
)
def list_commits(
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
    sha: Annotated[
        str,
        ArgumentMetadata(
            display_name="SHA or Branch Name",
            description="The SHA of the commit",
        ),
    ],
    since: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="Since",
            description="The start time for the cases to list. Must be in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ).",
        ),
    ] = "1970-01-01T00:00:00Z",
    until: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="Until",
            description="The end time for the cases to list. Must be in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ).",
        ),
    ] = "2099-12-31T00:00:00Z",
    limit: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="Limit",
            description="The maximum number of cases to list.",
        ),
    ] = 100,
) -> list[dict[str, JsonValue]]:
    # https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28#get-a-commit
    secret = ctx.get().secrets.get("GITHUB_SECRET")
    access_token = secret["access_token"]

    with get_github_client(access_token=access_token) as client:
        params = {
            "since": since,
            "until": until,
            "per_page": 100,
        }
        url = f"/repos/{repo_owner}/{repo_name}/commits"
        events = []

        # handle pagination
        while True:
            response = client.get(url, params=params)
            response.raise_for_status()
            events.extend(response.json())

            if "next" in response.links:
                url = response.links["next"]["url"]
            else:
                break

        return events
