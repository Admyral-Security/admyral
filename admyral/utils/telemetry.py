import platform
from admyral.config.config import CONFIG
from admyral import __version__
from datetime import UTC, datetime
from requests import Session


_posthog_client: Session = None


def _get_os() -> str:
    return platform.system()


def _get_detailed_platform() -> str:
    return platform.platform()


def _get_python_version() -> str:
    return platform.python_version()


def get_posthog_client() -> Session:
    global _posthog_client
    if not _posthog_client:
        _posthog_client = Session()
        _posthog_client.headers.update(
            {
                "Content-Type": "application/json",
            }
        )
    return _posthog_client

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

    get_posthog_client().post(
        url=f"{CONFIG.posthog_host}/capture",
        json={
            "api_key": CONFIG.posthog_api_key,
            "distinct_id": CONFIG.user_id,
            "event": f"{event_name}",
            "properties": default_properties | properties,
            "timestamp": str(datetime.now(UTC)),
        },
    )
