import click

from admyral.cli.cli import cli
from admyral.client import AdmyralClient
from admyral.compiler.action_parser import parse_action
from admyral.utils.telemetry import capture


@cli.group()
def action() -> None:
    """Action Management"""


# TODO: rework arguments + recursive dependencies collection (constants, functions, etc.) + automatically determine action_type
# TODO: instead of providing a file, we should search for the action automatically
@action.command(
    "push",
    help="Push a Python action to Admyral",
)
@click.argument("action_type", type=str)
@click.option("--action", "-a", type=str, help="Path to actions file", required=True)
@click.pass_context
def push(ctx: click.Context, action_type: str, action: str) -> None:
    """Push an action to Admyral"""
    capture(event_name="action:push")
    client: AdmyralClient = ctx.obj

    with open(action, "r") as f:
        action_str = f.read()

    python_action = parse_action(action_str, action_type)
    client.push_action(python_action)

    click.echo(f"Action {action_type} pushed successfully.")
