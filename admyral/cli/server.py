import click
import asyncio

from admyral.cli.cli import cli
from admyral.services.admyral import (
    launch_admyral_blocking,
    launch_admyral_daemon,
    destroy_admyral_daemon,
    show_logs,
    show_status,
)


@cli.command("up", help="Start Admyral locally.")
@click.option(
    "--docker",
    "-d",
    is_flag=True,
    default=False,
    type=click.BOOL,
    help="Run dockerized Admyral instead of as a local process.",
)
@click.option(
    "--blocking",
    "-b",
    is_flag=True,
    default=False,
    help="Run Admyral in blocking mode.",
)
def up(docker: bool, blocking: bool) -> None:
    """
    Launches Admyral services locally.

    Args:
        docker: Run Admyral as docker containers.
        blocking: Run Admyral in blocking mode.
    """
    if docker:
        # Run Admyral as docker containers
        # TODO: add docker support
        click.echo("Docker mode is not yet implemented.")
        return

    if not blocking:
        # Run Admyral as a daemon
        launch_admyral_daemon()
        return

    # Run Admyral in blocking mode
    asyncio.run(launch_admyral_blocking())


@cli.command("down", help="Stop Admyral locally.")
def down() -> None:
    """
    Tears down Admyral services locally.
    """
    # TODO: add docker support
    destroy_admyral_daemon()


@cli.command("show", help="Show information about Admyral.")
def show() -> None:
    """
    Show information about Admyral.
    """
    show_status()


@cli.command("logs", help="Display logs for Admyral.")
@click.option("--follow", "-f", is_flag=True, help="Follow the logs.")
@click.option(
    "--tail",
    "-t",
    type=click.INT,
    help="Number of lines to display from the end of the logs.",
)
def logs(follow: bool, tail: int) -> None:
    """
    Display logs for Admyral.

    Args:
        follow: Follow the logs.
        tail: Number of lines to display from the end of the logs.
    """
    for log in show_logs(follow, tail):
        click.echo(log)
