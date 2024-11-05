from typing import Annotated, Literal
from httpx import Client
from pydantic import BaseModel

from admyral.action import action, ArgumentMetadata
from admyral.context import ctx
from admyral.typings import JsonValue
from admyral.secret.secret import register_secret


@register_secret(secret_type="PagerDuty")
class PagerDutySecret(BaseModel):
    api_key: str
    email: str


def get_pagerduty_client(secret: PagerDutySecret) -> Client:
    return Client(
        base_url="https://api.pagerduty.com",
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"Token token={secret.api_key}",
            "From": secret.email,
        },
    )


@action(
    display_name="Create PagerDuty Incident",
    display_namespace="PagerDuty",
    description="Create a PagerDuty incident",
    secrets_placeholders=["PAGERDUTY_SECRET"],
)
def create_pagerduty_incident(
    title: Annotated[
        str,
        ArgumentMetadata(
            display_name="Title",
            description="The title of the incident",
        ),
    ],
    service_id: Annotated[
        str,
        ArgumentMetadata(
            display_name="Service ID",
            description="The ID of the service to create the incident for",
        ),
    ],
    urgency: Annotated[
        Literal["high", "low"],
        ArgumentMetadata(
            display_name="Urgency",
            description="The urgency of the incident",
        ),
    ],
    assign_to: Annotated[
        list[str] | None,
        ArgumentMetadata(
            display_name="Assign To",
            description="List of user IDs to assign the incident to",
        ),
    ] = None,
    description: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="Description",
            description="Additional incident details",
        ),
    ] = None,
) -> JsonValue:
    # https://developer.pagerduty.com/api-reference/a7d81b0e9200f-create-an-incident
    secret = ctx.get().secrets.get("PAGERDUTY_SECRET")
    secret = PagerDutySecret.model_validate(secret)

    body = {
        "incident": {
            "type": "incident",
            "title": title,
            "service": {"id": service_id, "type": "service_reference"},
        }
    }

    if urgency:
        body["incident"]["urgency"] = urgency

    if assign_to:
        body["incident"]["assignments"] = [
            {"assignee": {"id": user_id, "type": "user_reference"}}
            for user_id in assign_to
        ]

    if description:
        body["incident"]["body"] = {"type": "incident_body", "details": description}

    # Note: ignoring incident key and escalation policy for now

    with get_pagerduty_client(secret) as client:
        response = client.post(
            "/incidents",
            json=body,
        )
        response.raise_for_status()
        return response.json()
