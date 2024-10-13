from admyral.action import action
from admyral.context import ctx
from admyral.typings import JsonValue
from admyral.actions.integrations.shared.ms_graph import ms_graph_list_managed_devices


@action(
    display_name="List Managed Devices",
    display_namespace="Microsoft Intune",
    description="List managed devices from Microsoft Intune",
    secrets_placeholders=["AZURE_SECRET"],
)
def list_ms_intune_managed_devices() -> list[dict[str, JsonValue]]:
    secret = ctx.get().secrets.get("AZURE_SECRET")
    return ms_graph_list_managed_devices(
        tenant_id=secret["tenant_id"],
        client_id=secret["client_id"],
        client_secret=secret["client_secret"],
    )


@action(
    display_name="List Unencrypted Managed Devices",
    display_namespace="Microsoft Intune",
    description="List unencrypted managed devices from Microsoft Intune",
    secrets_placeholders=["AZURE_SECRET"],
)
def list_ms_intune_unencrypted_managed_devices() -> list[dict[str, JsonValue]]:
    devices = list_ms_intune_managed_devices()
    return [device for device in devices if not device["isEncrypted"]]
