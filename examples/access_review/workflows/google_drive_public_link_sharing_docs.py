"""

admyral action push transform_google_drive_public_link_sharing_docs -a workflows/google_drive_public_link_sharing_docs.py
admyral workflow push google_drive_public_link_sharing_docs -f workflows/google_drive_public_link_sharing_docs.py --activate

"""

from typing import Annotated
from collections import defaultdict

from admyral.action import action, ArgumentMetadata
from admyral.workflow import workflow
from admyral.typings import JsonValue
from admyral.actions import (
    list_google_drive_files_with_link_sharing_enabled,
    batched_send_slack_message_to_user_by_email,
    send_slack_message_to_user_by_email,
)


@action(
    display_name="Transform Google Drive Public Link Sharing Docs",
    display_namespace="Google Drive",
    description="Transform Google Drive Public Link Sharing Docs.",
)
def transform_google_drive_public_link_sharing_docs(
    public_files: Annotated[
        list[dict[str, JsonValue]],
        ArgumentMetadata(
            display_name="Public Files",
            description='The public files in Google Drive with "link sharing for everyone" enabled.',
        ),
    ],
    user_message: Annotated[
        str,
        ArgumentMetadata(
            display_name="User Message",
            description="The message to send to the user.",
        ),
    ],
    organization_domains: Annotated[
        list[str] | None,
        ArgumentMetadata(
            display_name="Organization Domains",
            description="The organization domains of your users.",
        ),
    ] = None,
) -> list[dict[str, JsonValue]]:
    # group the files by user
    files_grouped_by_users = {
        "owners": defaultdict(dict),
        "no_owner": {},
    }
    for file in public_files:
        file_id = file["id"]
        file_info_for_user = {
            "name": file["name"],
            "link": file["webViewLink"],
        }

        if owners := file.get("owners"):
            for owner in owners:
                owner_email = owner["emailAddress"]
                if organization_domains is None or any(
                    owner_email.endswith(domain) for domain in organization_domains
                ):
                    files_grouped_by_users["owners"][owner_email][file_id] = (
                        file_info_for_user
                    )
        else:
            # no owners - part of a shared workspace
            files_grouped_by_users["no_owner"][file_id] = file_info_for_user

    # construct the slack messages
    slack_messages = {
        "owner": [],
        "no_owner": "The following public files in Google Drive do not have an owner. Please review them:\n"
        + "\n".join(
            f'• <{file["link"]}|{file["name"]}>'
            for file in files_grouped_by_users["no_owner"].values()
        ),
    }

    for owner_email, files in files_grouped_by_users["owners"].items():
        slack_messages["owner"].append(
            (
                owner_email,
                f"{user_message}\n"
                + "\n".join(
                    f'• <{file["link"]}|{file["name"]}>' for file in files.values()
                ),
                None,
            )
        )

    return slack_messages


@workflow(
    description="Ask users whether the files they own in Google Drive with public link sharing enabled should be really public.",
)
def google_drive_public_link_sharing_docs(payload: dict[str, JsonValue]):
    public_files = list_google_drive_files_with_link_sharing_enabled(
        customer_id="d43sg123m",
        admin_email="daniel@admyral.ai",
        secrets={"GOOGLE_DRIVE_SECRET": "google_drive_secret"},
    )

    # group by user and also group by no user and transform the files
    public_files_slack_messages = transform_google_drive_public_link_sharing_docs(
        public_files=public_files,
        user_message="Please review the following public files in Google Drive. Are you sure they should be public?",
        organization_domains=["@admyral.ai"],  # TODO: update
    )

    # send slack message to each owner
    batched_send_slack_message_to_user_by_email(
        messages=public_files_slack_messages["owner"],
        secrets={"SLACK_SECRET": "slack_secret"},
    )

    # send slack message to compliance for all the files
    # which do not have an owner
    send_slack_message_to_user_by_email(
        email="daniel@admyral.ai",  # TODO: update
        text=public_files_slack_messages["no_owner"],
        secrets={"SLACK_SECRET": "slack_secret"},
    )
