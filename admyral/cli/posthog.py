import click
from admyral.cli.cli import cli
from admyral.utils.posthog import change_posthog_permission, get_posthog_status


@cli.group()
def posthog() -> None:
    """PostHog Management"""


@posthog.command("disable", help="Disable PostHog tracking.")
def disable() -> None:
    """
    Disable PostHog tracking.
    """
    change_posthog_permission(disable_posthog=True)
    click.echo("PostHog tracking is now disabled.")


@posthog.command("enable", help="Enable PostHog tracking.")
def enable() -> None:
    """
    Enable PostHog tracking.
    """
    change_posthog_permission(disable_posthog=False)
    click.echo("PostHog tracking is now enabled.")


@posthog.command("status", help="Show PostHog tracking status.")
def status() -> None:
    """
    Show PostHog tracking status.
    """
    click.echo(f"PostHog tracking is {get_posthog_status()}.")
