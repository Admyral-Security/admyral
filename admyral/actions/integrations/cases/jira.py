from typing import Annotated, Literal
import base64
from httpx import Client
from pydantic import BaseModel

from admyral.typings import JsonValue
from admyral.action import action, ArgumentMetadata
from admyral.context import ctx
from admyral.utils.collections import is_empty
from admyral.secret.secret import register_secret


@register_secret(secret_type="Jira")
class JiraSecret(BaseModel):
    domain: str
    email: str
    api_key: str


def get_jira_client(secret: JiraSecret) -> Client:
    api_key_base64 = base64.b64encode(
        f"{secret.email}:{secret.api_key}".encode()
    ).decode()
    return Client(
        base_url=f"https://{secret.domain}/rest/api/3",
        headers={
            "Authorization": f"Basic {api_key_base64}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )


@action(
    display_name="Create Jira Issue",
    display_namespace="Jira",
    description="Create a Jira issue",
    secrets_placeholders=["JIRA_SECRET"],
)
def create_jira_issue(
    summary: Annotated[
        str,
        ArgumentMetadata(
            display_name="Summary",
            description="The summary of the issue",
        ),
    ],
    project_id: Annotated[
        str,
        ArgumentMetadata(
            display_name="Project ID",
            description="The ID of the project to create the issue in",
        ),
    ],
    issue_type: Annotated[
        str,
        ArgumentMetadata(
            display_name="Issue Type",
            description="The issue type",
        ),
    ],
    description: Annotated[
        JsonValue | None,
        ArgumentMetadata(
            display_name="Description",
            description="The description of the issue in Atlassian Document Format",
        ),
    ] = None,
    assignee: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="Assignee",
            description="The ID of the assignee",
        ),
    ] = None,
    labels: Annotated[
        list[str] | None,
        ArgumentMetadata(
            display_name="Labels",
            description="The labels to add to the issue",
        ),
    ] = None,
    priority: Annotated[
        Literal["Lowest", "Low", "Medium", "High", "Highest"] | None,
        ArgumentMetadata(
            display_name="Priority",
            description="The priority of the issue",
        ),
    ] = None,
    custom_fields: Annotated[
        dict[str, JsonValue] | None,
        ArgumentMetadata(
            display_name="Custom Fields",
            description="The custom fields to add to the issue as a JSON object",
        ),
    ] = None,
) -> JsonValue:
    """
    How to find the project id?

        curl --request GET \
            --url https://christesting123.atlassian.net/rest/api/latest/project  \
            --header 'Authorization: Basic <base64-encoded-email:api_key-pair>'


    How to find the user id?

        curl --request GET \
            --url https://<your_domain>.atlassian.net/rest/api/3/myself  \
            --header 'Authorization: Basic <base64-encoded-email:api_key-pair>'
        
        or

        go to https://<your_domain>.atlassian.net/people
    
    How to find the issue type id?

        curl --request GET \
            --url https://<your_domain>.atlassian.net/rest/api/3/issuetype  \
            --header 'Authorization: Basic <base64-encoded-email:api_key-pair>'

    """
    # Atlassian Document Format: https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/
    # https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-post
    secret = ctx.get().secrets.get("JIRA_SECRET")
    secret = JiraSecret.model_validate(secret)

    body = {
        "fields": {
            "project": {
                "id": project_id,
            },
            "summary": summary,
            "issuetype": {
                "name": issue_type,
            },
        }
    }

    if description:
        body["fields"]["description"] = description

    if assignee:
        body["fields"]["assignee"] = {
            "id": assignee,
        }

    if labels:
        body["fields"]["labels"] = labels

    if priority:
        body["fields"]["priority"] = {
            "name": priority,
        }

    if custom_fields:
        for key, value in custom_fields.items():
            body["fields"][key] = value

    with get_jira_client(secret) as client:
        response = client.post(
            "/issue",
            json=body,
        )
        response.raise_for_status()
        return response.json()


@action(
    display_name="Update Jira Issue Status",
    display_namespace="Jira",
    description="Update a Jira issue status",
    secrets_placeholders=["JIRA_SECRET"],
)
def update_jira_issue_status(
    issue_id_or_key: Annotated[
        str,
        ArgumentMetadata(
            display_name="Issue ID or Key",
            description="The ID or the key of the issue",
        ),
    ],
    transition_id: Annotated[
        str,
        ArgumentMetadata(
            display_name="Transition ID",
            description="The ID of the transition",
        ),
    ],
) -> None:
    # https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-transitions-post
    # https://community.atlassian.com/t5/Jira-questions/How-do-i-find-a-transition-ID/qaq-p/2113213
    secret = ctx.get().secrets.get("JIRA_SECRET")
    secret = JiraSecret.model_validate(secret)

    with get_jira_client(secret) as client:
        response = client.post(
            f"/issue/{issue_id_or_key}/transitions",
            json={
                "transition": {
                    "id": transition_id,
                }
            },
        )
        response.raise_for_status()


@action(
    display_name="Comment Jira Issue",
    display_namespace="Jira",
    description="Comment Jira issue",
    secrets_placeholders=["JIRA_SECRET"],
)
def comment_jira_issue_status(
    issue_id_or_key: Annotated[
        str,
        ArgumentMetadata(
            display_name="Issue ID or Key",
            description="The ID or the key of the issue",
        ),
    ],
    comment: Annotated[
        JsonValue | None,
        ArgumentMetadata(
            display_name="Comment",
            description="The comment in Atlassian Document Format",
        ),
    ] = None,
) -> None:
    # https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-transitions-post
    secret = ctx.get().secrets.get("JIRA_SECRET")
    secret = JiraSecret.model_validate(secret)

    with get_jira_client(secret) as client:
        response = client.post(
            f"/issue/{issue_id_or_key}/comment",
            json={"body": comment},
        )
        response.raise_for_status()


@action(
    display_name="Jira Issue Search",
    display_namespace="Jira",
    description="Search Jira issues using JQL",
    secrets_placeholders=["JIRA_SECRET"],
)
def search_jira_issues(
    jql: Annotated[
        str,
        ArgumentMetadata(
            display_name="JQL",
            description="The JQL query to search for issues",
        ),
    ],
    limit: Annotated[
        int | None,
        ArgumentMetadata(
            display_name="Limit",
            description="The maximum number of issues to return",
        ),
    ] = 1000,
) -> list[JsonValue]:
    # https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/#api-rest-api-3-search-get
    secret = ctx.get().secrets.get("JIRA_SECRET")
    secret = JiraSecret.model_validate(secret)

    with get_jira_client(secret) as client:
        offset = 0
        issues = []

        while limit is None or len(issues) < limit:
            response = client.get(
                "/search",
                params={"jql": jql, "maxResults": 100, "startAt": offset},
            )
            response.raise_for_status()
            data = response.json()

            issues.extend(data["issues"])
            offset = len(issues)
            if offset == data["total"]:
                break

        return issues if limit is None else issues[:limit]


@action(
    display_name="Get Audit Records",
    display_namespace="Jira",
    description="Get audit records",
    secrets_placeholders=["JIRA_SECRET"],
)
def get_jira_audit_records(
    start_date: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="Start Date",
            description="The start date in in ISO-8601 format (YYYY-MM-DDTHH:MM:SSZ).",
        ),
    ] = None,
    end_date: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="End Date",
            description="The end date in in ISO-8601 format (YYYY-MM-DDTHH:MM:SSZ).",
        ),
    ] = None,
    filter: Annotated[
        list[str] | None,
        ArgumentMetadata(
            display_name="Filter",
            description="A list of strings to match with audit field content. The strings must not contain spaces.",
        ),
    ] = None,
    limit: Annotated[
        int | None,
        ArgumentMetadata(
            display_name="Limit",
            description="The maximum number of audit records to return.",
        ),
    ] = None,
):
    # https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-audit-records/#api-rest-api-3-auditing-record-get
    secret = ctx.get().secrets.get("JIRA_SECRET")
    secret = JiraSecret.model_validate(secret)

    with get_jira_client(secret) as client:
        offset = 0
        logs = []

        params = {}
        if start_date is not None:
            params["from"] = start_date
        if end_date is not None:
            params["to"] = end_date
        if filter is not None:
            if any(" " in f for f in filter):
                raise ValueError("Filter strings must not contain spaces.")
            params["filter"] = " ".join(filter)

        while limit is None or len(logs) < limit:
            params["offset"] = offset
            response = client.get("/auditing/record", params=params)
            response.raise_for_status()
            data = response.json()

            logs.extend(data["records"])
            offset = len(logs)
            if offset == data["total"] or is_empty(data["records"]):
                break

        return logs if limit is None else logs[:limit]


@action(
    display_name="Get Project",
    display_namespace="Jira",
    description="Get a Jira project",
    secrets_placeholders=["JIRA_SECRET"],
)
def get_project(
    project_id_or_key: Annotated[
        str,
        ArgumentMetadata(
            display_name="Project ID or Key",
            description="The ID or the key of the project",
        ),
    ],
) -> dict[str, JsonValue]:
    # https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-projects/#api-rest-api-3-project-projectidorkey-get
    secret = ctx.get().secrets.get("JIRA_SECRET")
    secret = JiraSecret.model_validate(secret)

    with get_jira_client(secret) as client:
        response = client.get(f"/project/{project_id_or_key}")
        response.raise_for_status()
        return response.json()


@action(
    display_name="Get Transitions",
    display_namespace="Jira",
    description="Get a Jira transition",
    secrets_placeholders=["JIRA_SECRET"],
)
def get_jira_transitions(
    issue_id_or_key: Annotated[
        str,
        ArgumentMetadata(
            display_name="Issue ID or Key",
            description="The ID or the key of the issue",
        ),
    ],
) -> list[dict[str, JsonValue]]:
    # https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-transitions-get
    secret = ctx.get().secrets.get("JIRA_SECRET")
    secret = JiraSecret.model_validate(secret)

    with get_jira_client(secret) as client:
        response = client.get(f"/issue/{issue_id_or_key}/transitions")
        response.raise_for_status()
        return response.json()
