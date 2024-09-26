import click
from admyral.cli.cli import cli
from admyral.utils.telemetry import change_telemetry_status, get_telemetry_status


@cli.group()
def telemetry() -> None:
    """Telemetry Management"""


@telemetry.command("disable", help="Disable Telemetry.")
def disable() -> None:
    """
    Disable tracking.
    """
    change_telemetry_status(disable_telemetry=True)
    click.echo("Telemetry is now disabled.")


@telemetry.command("enable", help="Enable Telemetry.")
def enable() -> None:
    """
    Enable tracking.
    """
    change_telemetry_status(disable_telemetry=False)
    click.echo("Telemetry is now enabled.")


@telemetry.command("status", help="Show Telemetry status.")
def status() -> None:
    """
    Show tracking status.
    """
    click.echo(f"Telemetry is {get_telemetry_status()}.")
