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


def get_python_version() -> str:
    return platform.python_version()


def setup_posthog_client() -> None:
    global _posthog_client
    _posthog_client = Posthog(api_key=CONFIG.posthog_api_key, host=CONFIG.posthog_host)


def get_posthog_client() -> Posthog:
    global _posthog_client
    if not _posthog_client:
        setup_posthog_client()
    return _posthog_client


def is_posthog_disabled() -> bool:
    # don't send events in dev environment
    if CONFIG.environment == "dev":
        return True

    return CONFIG.posthog_disabled


def capture(event_name: str, properties: dict = {}) -> None:
    if is_posthog_disabled():
        return

    default_properties = {
        "admyral_version": __version__,
        "python_version": get_python_version(),
        "user_os": _get_os(),
        "user_os_detail": _get_detailed_platform(),
    }

    get_posthog_client().capture(
        distinct_id=CONFIG.user_id,
        event=f"{event_name}",
        properties=default_properties | properties,
        timestamp=datetime.now(UTC),
    )


def change_posthog_permission(disable_posthog: bool) -> None:
    config_file = get_user_config_file()
    with open(config_file, "r") as f:
        file_content = safe_load(f)
    file_content["posthog_disabled"] = disable_posthog
    with open(config_file, "w") as f:
        dump(file_content, f)

    CONFIG.posthog_disabled = disable_posthog


def get_posthog_status() -> str:
    return "disabled" if is_posthog_disabled() else "enabled"
