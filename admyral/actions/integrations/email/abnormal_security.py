from typing import Annotated
from httpx import Client

from admyral.action import action, ArgumentMetadata
from admyral.context import ctx
from admyral.typings import JsonValue


def get_abnormal_security_client(api_key: str) -> Client:
    return Client(
        base_url="https://api.abnormalplatform.com/v1",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
        },
    )


# TODO: normalize cases (OCSF?)
@action(
    display_name="List Abnormal Cases",
    display_namespace="Abnormal Security",
    description="Get a list of Abnormal cases identified.",
    secrets_placeholders=["ABNORMAL_SECURITY_SECRET"],
)
def list_abnormal_security_cases(
    start_time: Annotated[
        str,
        ArgumentMetadata(
            display_name="Start Time",
            description="The start time for the cases to list. Must be in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ).",
        ),
    ] = "1970-01-01T00:00:00Z",
    end_time: Annotated[
        str,
        ArgumentMetadata(
            display_name="End Time",
            description="The end time for the cases to list. Must be in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ).",
        ),
    ] = "2100-01-01T00:00:00Z",
    limit: Annotated[
        int,
        ArgumentMetadata(
            display_name="Limit",
            description="The maximum number of cases to list.",
        ),
    ] = 1000,
) -> list[dict[str, JsonValue]]:
    # https://app.swaggerhub.com/apis/abnormal-security/abx/1.4.3#/Cases/get_cases

    secret = ctx.get().secrets.get("ABNORMAL_SECURITY_SECRET")
    api_key = secret["api_key"]

    filter = f"createdTime gte {start_time} lte {end_time}"

    with get_abnormal_security_client(api_key) as client:
        page_number = 1
        cases = []

        while len(cases) < limit:
            response = client.get(
                "/cases",
                params={
                    "pageSize": 100,
                    "pageNumber": page_number,
                    "filter": filter,
                },
            )
            response.raise_for_status()
            result = response.json()

            cases.extend(result.get("cases", []))

            if "nextPageNumber" in result:
                page_number = result["nextPageNumber"]
            else:
                break

        return cases[:limit]
