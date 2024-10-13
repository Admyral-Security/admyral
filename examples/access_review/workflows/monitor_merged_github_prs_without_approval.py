from admyral.workflow import workflow, Schedule
from admyral.typings import JsonValue
from admyral.actions import (
    list_github_merged_pull_requests_without_approval,
    get_time_interval_of_last_n_days,
    send_slack_message,
    format_json_to_list_view_string,
)


@workflow(
    description="Monitor Merged GitHub PRs Without Approval",
    triggers=[Schedule(interval_days=1)],
)
def monitor_merged_github_prs_without_approval(payload: dict[str, JsonValue]):
    last_day_time_interval = get_time_interval_of_last_n_days(n_days=1)

    unreviewed_prs = list_github_merged_pull_requests_without_approval(
        repo_owner="Admyral-Security",  # TODO: set your repo owner here
        repo_name="Admyral_Github_Integration_Test",  # TODO: set your repo name here
        start_time=last_day_time_interval[0],
        end_time=last_day_time_interval[1],
        secrets={"GITHUB_SECRET": "github_secret"},
    )

    if unreviewed_prs:
        formatted_unreviewed_prs = format_json_to_list_view_string(
            json_value=unreviewed_prs
        )
        send_slack_message(
            channel_id="C06QP0KV1L2",  # TODO: set your slack channel here
            text=f"Merged PRs with unreviewed commits identified:\n{formatted_unreviewed_prs}",
            secrets={"SLACK_SECRET": "slack_secret"},
        )
