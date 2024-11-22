"""

admyral action push transform_google_drive_public_link_sharing_docs -a workflows/google_drive_public_link_sharing/google_drive_public_link_sharing_docs.py
admyral workflow push workflows/google_drive_public_link_sharing/google_drive_public_link_sharing_docs.yaml --activate

"""

from typing import Annotated
from collections import defaultdict

from admyral.action import action, ArgumentMetadata
from admyral.typings import JsonValue


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
