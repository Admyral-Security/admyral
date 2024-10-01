import platform
from admyral.config.config import CONFIG
from admyral import __version__
from datetime import UTC, datetime
from requests import post


def _get_os() -> str:
    return platform.system()


def _get_detailed_platform() -> str:
    return platform.platform()


def _get_python_version() -> str:
    return platform.python_version()


def capture(event_name: str, properties: dict = {}) -> None:
    if CONFIG.telemetry_disabled or CONFIG.environment == "dev":
        return

    default_properties = {
        "admyral_version": __version__,
        "python_version": _get_python_version(),
        "user_os": _get_os(),
        "user_os_detail": _get_detailed_platform(),
    }

    post(
        url=f"{CONFIG.posthog_host}/capture",
        json={
            "api_key": CONFIG.posthog_api_key,
            "distinct_id": CONFIG.id,
            "event": f"{event_name}",
            "properties": default_properties | properties,
            "timestamp": str(datetime.now(UTC)),
        },
    )
