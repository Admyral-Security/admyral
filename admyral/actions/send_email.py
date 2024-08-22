import os
from typing import Annotated
import resend

from admyral.typings import JsonValue
from admyral.action import action, ArgumentMetadata


resend.api_key = os.getenv("RESEND_API_KEY")


@action(
    display_name="Send Email",
    display_namespace="Admyral",
    description="Send an email",
)
def send_email(
    recipients: Annotated[
        str | list[str],
        ArgumentMetadata(
            display_name="Recipients",
            description="The email addresses of the recipients",
        ),
    ],
    sender_name: Annotated[
        str,
        ArgumentMetadata(
            display_name="Sender Name",
            description="The name of the sender",
        ),
    ],
    subject: Annotated[
        str,
        ArgumentMetadata(
            display_name="Subject",
            description="The subject of the email",
        ),
    ],
    body: Annotated[
        str,
        ArgumentMetadata(
            display_name="Body",
            description="The body of the email",
        ),
    ],
) -> JsonValue:
    RESEND_EMAIL = os.getenv("RESEND_EMAIL")

    body = {
        "from": f"{sender_name} <{RESEND_EMAIL}>",
        "to": [recipients] if isinstance(recipients, str) else recipients,
        "subject": subject,
        "text": body,
    }

    # TODO: error handling
    return resend.Emails.send(body)
