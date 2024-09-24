import posthog
import yaml
from admyral.config.config import CONFIG, get_user_config_file
from admyral import __version__


def _get_posthog_client() -> posthog.Posthog:
    return posthog.Posthog(api_key=CONFIG.posthog_api_key, host=CONFIG.posthog_host)


def check_if_posthog_is_disabled() -> bool:
    config_file = get_user_config_file()
    with open(config_file, "r") as f:
        file_content = yaml.safe_load(f)
        return file_content["posthog_disabled"]


def send_event(event_name: str, command: str) -> None:
    if check_if_posthog_is_disabled():
        return
    posthog = _get_posthog_client()
    posthog.capture(
        distinct_id=CONFIG.user_id,
        event=f"{event_name} {command}",
        properties={
            "$process_person_profile": False,
            "version": __version__,
        },
    )


def change_posthog_permission(disable_posthog: bool) -> None:
    config_file = get_user_config_file()
    with open(config_file, "r") as f:
        file_content = yaml.safe_load(f)
    file_content["posthog_disabled"] = disable_posthog
    with open(config_file, "w") as f:
        yaml.dump(file_content, f)


def get_posthog_status() -> str:
    return "enabled" if not check_if_posthog_is_disabled() else "disabled"
