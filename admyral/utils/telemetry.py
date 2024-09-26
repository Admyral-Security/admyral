import platform
from yaml import safe_load, dump
from admyral.config.config import CONFIG, get_user_config_file
from admyral import __version__
from posthog import Posthog
from datetime import UTC, datetime


_posthog_client: Posthog = None


def _get_os() -> str:
    return platform.system()


def _get_detailed_platform() -> str:
    return platform.platform()


def _get_python_version() -> str:
    return platform.python_version()


def get_posthog_client() -> Posthog:
    global _posthog_client
    if not _posthog_client:
        _posthog_client = Posthog(
            api_key=CONFIG.posthog_api_key, host=CONFIG.posthog_host
        )
    return _posthog_client


def capture(event_name: str, properties: dict = {}) -> None:
    if CONFIG.telemetry_disabled or CONFIG.environment == "dev":
        return

    default_properties = {
        "admyral_version": __version__,
        "python_version": _get_python_version(),
        "user_os": _get_os(),
        "user_os_detail": _get_detailed_platform(),
    }

    get_posthog_client().capture(
        distinct_id=CONFIG.user_id,
        event=f"{event_name}",
        properties=default_properties | properties,
        timestamp=datetime.now(UTC),
    )


def change_telemetry_status(disable_telemetry: bool) -> None:
    config_file = get_user_config_file()
    with open(config_file, "r") as f:
        file_content = safe_load(f)
    file_content["posthog_disabled"] = disable_telemetry
    with open(config_file, "w") as f:
        dump(file_content, f)


def get_telemetry_status() -> str:
    return "disabled" if CONFIG.telemetry_disabled else "enabled"
