from typing import Annotated
from googleapiclient.discovery import build
from google.oauth2.service_account import Credentials as ServiceAccountCredentials
from difflib import ndiff
import requests
from dateutil import parser
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)
from pydantic import BaseModel

from admyral.action import action, ArgumentMetadata
from admyral.context import ctx
from admyral.typings import JsonValue
from admyral.utils.collections import is_empty
from admyral.secret.secret import register_secret


@register_secret(secret_type="Google Drive")
class GoogleDriveSecret(BaseModel):
    type: str
    project_id: str
    private_key_id: str
    private_key: str
    client_email: str
    auth_uri: str
    token_uri: str
    auth_provider_x509_cert_url: str
    client_x509_cert_url: str
    universe_domain: str


@retry(
    stop=stop_after_attempt(10),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type(requests.HTTPError),
    reraise=True,
)
def _export_google_docs_revision(
    export_link: str, mime_type: str, creds: ServiceAccountCredentials
) -> requests.Response:
    """
    For very recent revisions, we might need to retry the export a couple of times since
    there is a slight delay between the revision being created and the export being available.
    """
    export_response = requests.get(
        export_link,
        headers={"Authorization": f"Bearer {creds.token}", "Accept": mime_type},
    )
    export_response.raise_for_status()
    return export_response


@action(
    display_name="List Google Docs Revisions",
    display_namespace="Google Drive",
    description="Fetch revisions of a Google Docs document.",
    secrets_placeholders=["GOOGLE_DRIVE_SECRET"],
)
def list_google_docs_revisions(
    file_id: Annotated[
        str,
        ArgumentMetadata(
            display_name="File ID", description="The ID of the Google Doc."
        ),
    ],
    start_time: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="Start Time",
            description="The start time for the revisions to list. Must be in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ).",
        ),
    ] = None,
    end_time: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="End Time",
            description="The end time for the revisions to list. Must be in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ).",
        ),
    ] = None,
) -> list[dict[str, JsonValue]]:
    # https://googleapis.github.io/google-api-python-client/docs/dyn/drive_v3.revisions.html#list

    secret = ctx.get().secrets.get("GOOGLE_DRIVE_SECRET")
    secret = GoogleDriveSecret.model_validate(secret)
    creds = ServiceAccountCredentials.from_service_account_info(
        info=secret.model_dump(),
        scopes=["https://www.googleapis.com/auth/drive.readonly"],
    )

    drive_service = build("drive", "v3", credentials=creds)

    if start_time:
        start_time = parser.parse(start_time)
    if end_time:
        end_time = parser.parse(end_time)

    result = []

    revision_request = drive_service.revisions().list(
        fileId=file_id,
        fields="nextPageToken, revisions(id, modifiedTime, lastModifyingUser, exportLinks)",
    )

    while revision_request is not None:
        revision_response = revision_request.execute()
        revisions = revision_response.get("revisions", [])

        for revision in revisions:
            revision_id = revision["id"]
            modified_time = parser.parse(revision["modifiedTime"])

            if (start_time and modified_time < start_time) or (
                end_time and end_time < modified_time
            ):
                # Skip revisions outside the time range
                continue

            mime_type = "text/plain"
            export_link = revision["exportLinks"][mime_type]
            export_response = _export_google_docs_revision(
                export_link, mime_type, creds
            )

            prev_text = "" if is_empty(result) else result[-1]["content"]
            diff = "\n".join(
                line
                for line in ndiff(
                    prev_text.splitlines(),
                    export_response.text.splitlines(),
                )
                if line.startswith("+ ")
                or line.startswith("- ")
                or line.startswith("? ")
            )

            result.append(
                {
                    "id": revision_id,
                    "lastModifyingUser": revision["lastModifyingUser"]["emailAddress"],
                    "modifiedTime": revision["modifiedTime"],
                    "content": export_response.text,
                    "diff": diff,
                }
            )

        revision_request = drive_service.revisions().list_next(
            revision_request, revision_response
        )

    return result


@action(
    display_name="List Google Drive Files with Link Sharing Enabled",
    display_namespace="Google Drive",
    description="List all files in a Google Drive of an organization which have public link sharing enabled.",
    secrets_placeholders=["GOOGLE_DRIVE_SECRET"],
)
def list_google_drive_files_with_link_sharing_enabled(
    customer_id: Annotated[
        str,
        ArgumentMetadata(
            display_name="Customer ID",
            description="The customer ID of your Google Workspace.",
        ),
    ],
    admin_email: Annotated[
        str,
        ArgumentMetadata(
            display_name="Admin Email",
            description="The email of an admin user for your Google Workspace for delegated access.",
        ),
    ],
    limit: Annotated[
        int | None,
        ArgumentMetadata(
            display_name="Limit",
            description="The maximum number of files to return. If not specified, all files are returned.",
        ),
    ] = 100,
) -> list[dict[str, JsonValue]]:
    secret = ctx.get().secrets.get("GOOGLE_DRIVE_SECRET")
    secret = GoogleDriveSecret.model_validate(secret)
    creds = ServiceAccountCredentials.from_service_account_info(
        info=secret.model_dump(),
        scopes=[
            "https://www.googleapis.com/auth/drive.readonly",
            "https://www.googleapis.com/auth/admin.directory.user.readonly",
        ],
    )

    admin_delegated_creds = creds.with_subject(admin_email)

    admin_service = build("admin", "directory_v1", credentials=admin_delegated_creds)

    # make this a dict because we want to deduplciate the files
    all_public_files = {}

    # https://googleapis.github.io/google-api-python-client/docs/dyn/admin_directory_v1.html
    # https://developers.google.com/admin-sdk/directory/reference/rest/v1/users/list
    users_request = admin_service.users().list(customer=customer_id)
    while users_request is not None and (
        limit is None or len(all_public_files) < limit
    ):
        user_response = users_request.execute()

        # extract the publicly shared files for each user - for each user we look at the files which
        # the user has access to
        for user in user_response.get("users", []):
            user_email = user["primaryEmail"]

            # create delegated credentials for the user
            user_delegated_creds = creds.with_subject(user_email)
            drive_service = build("drive", "v3", credentials=user_delegated_creds)

            # extracts the files
            # https://googleapis.github.io/google-api-python-client/docs/dyn/drive_v3.files.html
            # https://developers.google.com/drive/api/reference/rest/v3/files/list
            list_files_request = drive_service.files().list(
                # spaces='drive',
                fields="nextPageToken, files(id, name, webViewLink, permissions, mimeType, modifiedTime, sharingUser, owners)",
                supportsAllDrives=True,
                includeItemsFromAllDrives=True,
                corpora="user",
                q="mimeType != 'application/vnd.google-apps.folder' and visibility = 'anyoneWithLink'",  # Exclude folders and include only files with public link sharing
            )
            while list_files_request is not None and (
                limit is None or len(all_public_files) < limit
            ):
                files_response = list_files_request.execute()
                for file in files_response.get("files", []):
                    all_public_files[file["id"]] = file
                list_files_request = drive_service.files().list_next(
                    list_files_request, files_response
                )

        users_request = admin_service.users().list_next(users_request, user_response)

    all_public_files = list(all_public_files.values())
    return all_public_files if limit is None else all_public_files[:limit]
