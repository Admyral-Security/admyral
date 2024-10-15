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

from admyral.action import action, ArgumentMetadata
from admyral.context import ctx
from admyral.typings import JsonValue
from admyral.utils.collections import is_empty


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
    creds = ServiceAccountCredentials.from_service_account_info(
        info=secret, scopes=["https://www.googleapis.com/auth/drive.readonly"]
    )

    drive_service = build("drive", "v3", credentials=creds)

    request = drive_service.revisions().list(
        fileId=file_id,
        fields="nextPageToken, revisions(id, modifiedTime, lastModifyingUser, exportLinks)",
    )

    response = request.execute()
    revisions = response.get("revisions", [])

    if start_time:
        start_time = parser.parse(start_time)
    if end_time:
        end_time = parser.parse(end_time)

    result = []

    while revisions:
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

        if request := drive_service.revisions().list_next(request, response):
            response = request.execute()
            revisions = response.get("revisions", [])
        else:
            break

    return result
