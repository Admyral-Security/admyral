from typing import Annotated
from httpx import Client

from admyral.action import action, ArgumentMetadata
from admyral.context import ctx
from admyral.typings import JsonValue


def get_slack_client(api_key: str) -> Client:
    return Client(
        base_url="https://api.slack.com/api",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )


@action(
    display_name="Send Slack Message",
    display_namespace="Slack",
    description="This method posts a message to a public channel, private channel, "
    "or direct message (DM, or IM) conversation. Required scope: chat:write",
    secrets_placeholders=["SLACK_SECRET"],
)
def send_slack_message(
    channel_id: Annotated[
        str,
        ArgumentMetadata(
            display_name="Channel ID",
            description="Channel, private group, or user to send a message to. "
            "For channels, you can use the name (e.g. #my-channel) or the ID. "
            "For private channels and groups, use the ID. For DMs to users, "
            "use the user ID.",
        ),
    ],
    text: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="Text",
            description="The purpose of this field changes depends on whether "
            "the blocks field is used. If blocks is used, this is used as a "
            "fallback string to display in notifications. If blocks is not used, "
            "this is the main body text of the message. It can be formatted as "
            "plain text, or with mrkdwn.",
        ),
    ] = None,
    blocks: Annotated[
        JsonValue | None,
        ArgumentMetadata(
            display_name="Blocks", description="An array of layout blocks."
        ),
    ] = None,
) -> JsonValue:
    # https://api.slack.com/methods/chat.postMessage
    secret = ctx.get().secrets.get("SLACK_SECRET")
    api_key = secret["api_key"]

    body = {"channel": channel_id, "text": text, "blocks": blocks}

    with get_slack_client(api_key) as client:
        response = client.post("/chat.postMessage", json=body)
        response.raise_for_status()
        response_body = response.json()
        if not response_body.get("ok"):
            raise RuntimeError(
                f"Failed to send message in Slack. Error: {response_body.get("error")}"
            )
        return response_body


def _get_slack_user_id_by_email(client: Client, email: str, api_key: str) -> str:
    response = client.get("/users.lookupByEmail", params={"email": email})
    response.raise_for_status()
    response_body = response.json()
    if not response_body.get("ok"):
        raise RuntimeError("Failed to find user by email")
    return response_body["user"]["id"]


@action(
    display_name="Lookup User by Email",
    display_namespace="Slack",
    description="This method returns a user's identity given their email address.",
    secrets_placeholders=["SLACK_SECRET"],
)
def lookup_slack_user_by_email(
    email: Annotated[
        str,
        ArgumentMetadata(
            display_name="Email",
            description="An email address belonging to a user in the Slack workspace.",
        ),
    ],
) -> str:
    # https://api.slack.com/methods/users.lookupByEmail
    secret = ctx.get().secrets.get("SLACK_SECRET")
    api_key = secret["api_key"]

    with get_slack_client(api_key) as client:
        return _get_slack_user_id_by_email(client, email, api_key)


@action(
    display_name="Send Slack Message to User by Email",
    display_namespace="Slack",
    description="This method sends a message to a user identified by their email address.",
    secrets_placeholders=["SLACK_SECRET"],
)
def send_slack_message_to_user_by_email(
    email: Annotated[
        str,
        ArgumentMetadata(
            display_name="Email",
            description="The email address of the user to send a message to.",
        ),
    ],
    text: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="Text",
            description="The purpose of this field changes depends on whether "
            "the blocks field is used. If blocks is used, this is used as a "
            "fallback string to display in notifications. If blocks is not used, "
            "this is the main body text of the message. It can be formatted as "
            "plain text, or with mrkdwn.",
        ),
    ] = None,
    blocks: Annotated[
        JsonValue | None,
        ArgumentMetadata(
            display_name="Blocks", description="An array of layout blocks."
        ),
    ] = None,
) -> JsonValue:
    # https://api.slack.com/methods/chat.postMessage
    # https://api.slack.com/methods/users.lookupByEmail

    secret = ctx.get().secrets.get("SLACK_SECRET")
    api_key = secret["api_key"]

    with get_slack_client(api_key) as client:
        user_id = _get_slack_user_id_by_email(client, email, api_key)

        response = client.post(
            "/chat.postMessage",
            json={"channel": user_id, "text": text, "blocks": blocks},
        )
        response.raise_for_status()
        response_body = response.json()
        if not response_body.get("ok"):
            raise RuntimeError(
                f"Failed to send message to user by email in Slack . Message: {response_body.get("error")}"
            )
        return response_body


@action(
    display_name="Batched Send Slack Message to User by Email",
    display_namespace="Slack",
    description="This method sends a batch of messages to users identified by their email address.",
    secrets_placeholders=["SLACK_SECRET"],
)
def batched_send_slack_message_to_user_by_email(
    messages: Annotated[
        list[tuple[str, str | None, JsonValue]],
        ArgumentMetadata(
            display_name="Messages",
            description="A list of messages to send to users.",
        ),
    ],
) -> JsonValue:
    # https://api.slack.com/methods/chat.postMessage
    # https://api.slack.com/methods/users.lookupByEmail
    for email, text, blocks in messages:
        try:
            send_slack_message_to_user_by_email(email=email, text=text, blocks=blocks)
        except Exception as e:
            print(f"Failed to send message to {email}: {e}")
            raise e
