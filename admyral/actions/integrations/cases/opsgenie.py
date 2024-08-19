from typing import Annotated, Literal
from httpx import Client
import time
import random

from admyral.typings import JsonValue
from admyral.action import action, ArgumentMetadata
from admyral.context import ctx


def get_opsgenie_client(instance: str, api_key: str) -> Client:
    base_api_url = (
        "https://api.eu.opsgenie.com"
        if instance and instance.lower() == "eu"
        else "https://api.opsgenie.com"
    )
    return Client(
        base_url=base_api_url,
        headers={
            "Authorization": f"GenieKey {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )


@action(
    display_name="Create OpsGenie Alert",
    display_namespace="OpsGenie",
    description="Create an OpsGenie alert",
    secrets_placeholders=["OPSGENIE_SECRET"],
)
def create_opsgenie_alert(
    message: Annotated[
        str,
        ArgumentMetadata(
            display_name="Message",
            description="The message of the alert. Limited to 130 characters.",
        ),
    ],
    alias: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="Alias",
            description="Client-defined identifier of the alert, that is also the key element of Alert De-Duplication.",
        ),
    ] = None,
    description: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="Description",
            description="Description field of the alert that is generally used to provide a detailed information about the alert.",
        ),
    ] = None,
    responders: Annotated[
        list[JsonValue] | None,
        ArgumentMetadata(
            display_name="Responders",
            description="A JSON array of teams, users, escalations, and schedules that the alert will be routed to send notifications.",
        ),
    ] = None,
    visible_to: Annotated[
        list[JsonValue] | None,
        ArgumentMetadata(
            display_name="Visible To",
            description='A JSON array of teams and users that the alert will be visible to without sending any notification. Note that the alert will be visible to the teams that are specified within "Responders" field by default, so there is no need to respecify them within the "Visible To" field',
        ),
    ] = None,
    actions: Annotated[
        list[str] | None,
        ArgumentMetadata(
            display_name="Actions",
            description="A list of custom actions that will be available for the alert.",
        ),
    ] = None,
    tags: Annotated[
        list[str] | None,
        ArgumentMetadata(
            display_name="Tags",
            description="A list of labels attached to the alert.",
        ),
    ] = None,
    details: Annotated[
        JsonValue | None,
        ArgumentMetadata(
            display_name="Details",
            description="Map of key-value pairs to use as custom properties of the alert.",
        ),
    ] = None,
    entity: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="Entity",
            description="Entity field of the alert that is generally used to specify which domain the alert is related to.",
        ),
    ] = None,
    source: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="Source",
            description="Source field of the alert. Default value is IP address of the incoming request.",
        ),
    ] = None,
    priority: Annotated[
        Literal["P1", "P2", "P3", "P4", "P5"] | None,
        ArgumentMetadata(
            display_name="Priority",
            description="Priority level of the alert. Default value is P3.",
        ),
    ] = None,
    user: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="User",
            description="Display name of the request owner.",
        ),
    ] = None,
    note: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="Note",
            description="Additional note that will be added to the alert.",
        ),
    ] = None,
) -> JsonValue:
    # https://docs.opsgenie.com/docs/alert-api#section-create-alert
    opsgenie_secret = ctx.get().secrets.get("OPSGENIE_SECRET")
    api_key = opsgenie_secret["api_key"]
    instance = opsgenie_secret.get("instance")

    body = {
        "message": message,
    }
    if alias:
        body["alias"] = alias
    if description:
        body["description"] = description
    if responders:
        body["responders"] = responders
    if visible_to:
        body["visibleTo"] = visible_to
    if actions:
        body["actions"] = actions
    if tags:
        body["tags"] = tags
    if details:
        body["details"] = details
    if entity:
        body["entity"] = entity
    if source:
        body["source"] = source
    if priority:
        body["priority"] = priority
    if user:
        body["user"] = user
    if note:
        body["note"] = note

    with get_opsgenie_client(instance, api_key) as client:
        response = client.post(
            "/v2/alerts",
            json=body,
        )
        response.raise_for_status()

        response_json = response.json()
        if "requestId" not in response_json:
            raise RuntimeError("Failed to create OpsGenie alert - missing requestId.")

        return _wait_for_opsgenie_request_completion(
            client,
            response_json["requestId"],
        )


def _wait_for_opsgenie_request_completion(
    client: Client,
    request_id: str,
    max_retries: int = 10,
    cap: int = 120,
) -> JsonValue:
    for retries in range(max_retries):
        response = client.get(
            f"/v2/alerts/requests/{request_id}",
        )
        if response.status_code == 200:
            return response.json()

        # exponential backoff with full jitter
        # https://aws.amazon.com/de/blogs/architecture/exponential-backoff-and-jitter/
        if retries + 1 < max_retries:
            base_timout_ms = 5
            temp_ms = random.randrange(base_timout_ms * 2 ** (retries + 1))
            sleep_time_sec = min(cap, temp_ms / 1000)
            time.sleep(sleep_time_sec)

    raise RuntimeError(f"Failed to get OpsGenie alert: {response.text}")
