from typing import Annotated

from admyral.action import action, ArgumentMetadata
from admyral.context import ctx
from admyral.typings import JsonValue
from admyral.actions.integrations.shared.ms_graph import (
    ms_graph_list_alerts_v2,
    MsSecurityGraphAlertServiceSource,
    AzureSecret,
)


@action(
    display_name="List Alerts",
    display_namespace="Microsoft Sentinel",
    description="List alerts from Microsoft Sentinel",
    secrets_placeholders=["AZURE_SECRET"],
)
def list_ms_sentinel_alerts(
    start_time: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="Start Time",
            description="The start time for the cases to list. Must be in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ).",
        ),
    ] = None,
    end_time: Annotated[
        str,
        ArgumentMetadata(
            display_name="End Time",
            description="The end time for the cases to list. Must be in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ).",
        ),
    ] = None,
    limit: Annotated[
        int,
        ArgumentMetadata(
            display_name="Limit",
            description="The maximum number of cases to list.",
        ),
    ] = 100,
) -> list[dict[str, JsonValue]]:
    secret = ctx.get().secrets.get("AZURE_SECRET")
    secret = AzureSecret.model_validate(secret)
    return ms_graph_list_alerts_v2(
        secret=secret,
        start_time=start_time,
        end_time=end_time,
        limit=limit,
        service_source=MsSecurityGraphAlertServiceSource.MS_SENTINEL,
    )
