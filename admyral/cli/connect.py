import click
import yaml

from admyral.cli.cli import cli
from admyral.config.config import get_user_config_file


@cli.command("connect", help="Connect to remote Admyral server.")
@click.argument("base_url", type=str)
@click.argument("api_key", type=str)
def connect(base_url: str, api_key: str):
    """Connect to the Admyral server."""
    with open(get_user_config_file(), "r") as f:
        config = yaml.safe_load(f)
    config["cli_target"] = base_url
    config["api_key"] = api_key
    with open(get_user_config_file(), "w") as f:
        yaml.dump(config, f)


@cli.command("disconnect", help="Disconnect from remote Admyral server.")
def disconnect():
    """Disconnect from the Admyral server."""
    with open(get_user_config_file(), "r") as f:
        config = yaml.safe_load(f)
    if "cli_target" in config:
        del config["cli_target"]
    if "api_key" in config:
        del config["api_key"]
    with open(get_user_config_file(), "w") as f:
        yaml.dump(config, f)
