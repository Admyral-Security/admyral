import click
import yaml

from admyral.cli.cli import cli
from admyral.config.config import get_user_config_file


def load_config():
    """Load the user configuration from the YAML file."""
    with open(get_user_config_file(), "r") as f:
        return yaml.safe_load(f)


def save_config(config):
    """Save the user configuration to the YAML file."""
    with open(get_user_config_file(), "w") as f:
        yaml.dump(config, f)


@cli.command("connect", help="Connect to remote Admyral server.")
@click.argument("base_url", type=str)
@click.argument("api_key", type=str)
def connect(base_url: str, api_key: str):
    """Connect to the Admyral server."""
    config = load_config()
    config["cli_target"] = base_url
    config["api_key"] = api_key
    save_config(config)


@cli.command("disconnect", help="Disconnect from remote Admyral server.")
def disconnect():
    """Disconnect from the Admyral server."""
    config = load_config()
    config.pop("cli_target")
    config.pop("api_key")
    save_config(config)
