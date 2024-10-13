from typing import Annotated
from admyral.action import action, ArgumentMetadata
from admyral.context import ctx
from admyral.typings import JsonValue
from admyral.actions.integrations.shared.ms_graph import ms_graph_list_managed_devices


@action(
    display_name="List Unencrypted Devices",
    display_namespace="Microsoft Intune",
    description="List unencrypted devices from Microsoft Intune",
    secrets_placeholders=["AZURE_SECRET"],
)
def list_ms_intune_unencrypted_devices(
    properties: Annotated[
        list[str] | None,
        ArgumentMetadata(
            display_name="Properties",
            description="The device properties to include in the response.",
        ),
    ] = [],
    limit: Annotated[
        int,
        ArgumentMetadata(
            display_name="Limit",
            description="The maximum number of devices to list.",
        ),
    ] = 100,
) -> list[dict[str, JsonValue]]:
    secret = ctx.get().secrets.get("AZURE_SECRET")
    properties = ["isEncrypted"] + properties
    devices = ms_graph_list_managed_devices(
        tenant_id=secret["tenant_id"],
        client_id=secret["client_id"],
        client_secret=secret["client_secret"],
        properties=properties,
        limit=limit,
    )

    return [device for device in devices if not device["isEncrypted"]]
