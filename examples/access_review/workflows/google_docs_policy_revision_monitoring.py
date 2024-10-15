from admyral.workflow import workflow, Schedule
from admyral.typings import JsonValue
from admyral.actions import (
    list_google_docs_revisions,
    send_slack_message_to_user_by_email,
    openai_chat_completion,
    send_list_elements_to_workflow,
    split_text,
    transform,
    get_time_interval_of_last_n_days,
)


@workflow(
    description="Monitor Google Docs Policy Revision",
    triggers=[
        Schedule(
            interval_days=1,
            file_id="1ozuJuLT2MOOlJX_DjQ8dAtbI7Xm03JTdp2QbaFU5caY",  # TODO: place your Google Docs file ID here
        )
    ],
)
def google_docs_policy_revision_monitoring(payload: dict[str, JsonValue]):
    start_and_end_yesterday = get_time_interval_of_last_n_days(n_days=1)

    revisions = list_google_docs_revisions(
        file_id=payload["file_id"],
        start_time=start_and_end_yesterday[0],
        end_time=start_and_end_yesterday[1],
        secrets={"GOOGLE_DRIVE_SECRET": "google_drive_secret"},
    )

    if revisions:
        send_list_elements_to_workflow(
            workflow_name="google_docs_policy_revision_monitoring_body",
            elements=revisions,
            shared_data={
                "file_id": "1ozuJuLT2MOOlJX_DjQ8dAtbI7Xm03JTdp2QbaFU5caY",
                "latest_version": revisions[-1]["content"],
            },
        )


@workflow(
    description='Handle the single revisions for workflow "Review Google Docs Policy Revision"',
)
def google_docs_policy_revision_monitoring_body(payload: dict[str, JsonValue]):
    is_material_change = openai_chat_completion(
        model="gpt-4o",
        prompt=f"Carefully review the following diff of a Google Doc defining a company policy:\n\n<Company Policy Diff>\n{payload["element"]["diff"]}\n</Company Policy Diff>\n\n"
        "Does the diff contain any material change? A material change of the policy is, for example, if sections were added, removed, or the content was modified. Some examples of "
        "changes which are not material changes are fixing typos, changing the order of sections, uppercasing or lowercasing, changing a date, or reformulating sentences while the "
        "meaning remains the same. Answer with 'yes' if it is a material change and answer with 'no' otherwise. You must only answer with 'yes' or 'no' and nothing else.",
        stop_tokens=["\n"],
        secrets={"OPENAI_SECRET": "openai_secret"},
    )

    if is_material_change in ["yes", "Yes"]:
        # Note: we use the latest version of the document to check for the revision history
        splitted_text = split_text(
            text=payload["shared"]["latest_version"], pattern="Revision history"
        )
        revision_history = transform(value=splitted_text[-1])

        modified_date = split_text(text=payload["element"]["modifiedTime"], pattern="T")
        modified_date = transform(value=modified_date[0])

        is_modified_date_in_revision_history = openai_chat_completion(
            model="gpt-4o",
            prompt=f"Carefully review the following revision history to check whether it contains the date {modified_date}. Be aware that the date could also be in another format, e.g., "
            f"2024-02-01 could exist as 02/01/2024 or Feb 1, 2024! Answer with 'yes' if the revision history contains the date and answer with 'no' otherwise. You must only answer with "
            f"'yes' or 'no' and nothing else. Here is the revision history which you should check for the date {modified_date}:\n\n"
            f"<Revision History>\n{revision_history}\n</Revision History>\n",
            stop_tokens=["\n"],
            secrets={"OPENAI_SECRET": "openai_secret"},
        )

        if is_modified_date_in_revision_history in ["No", "no"]:
            send_slack_message_to_user_by_email(
                email="daniel@admyral.ai",
                text=f"Potential material change without revision history update detected in Google Docs revision:\n"
                f"Link: https://docs.google.com/document/d/{payload["shared"]["file_id"]}/edit\n"
                f"User: {payload["element"]["lastModifyingUser"]}\n"
                f"Modification Time: {payload["element"]["modifiedTime"]}",
                secrets={"SLACK_SECRET": "slack_secret"},
            )
