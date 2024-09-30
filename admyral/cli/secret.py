import click

from admyral.cli.cli import cli
from admyral.client import AdmyralClient
from admyral.models import Secret
from admyral.utils.telemetry import capture


@cli.group()
def secret() -> None:
    """Secret Management"""


class KeyValueType(click.ParamType):
    name = "key=value"

    def convert(self, value: str, param: str, ctx: click.Context) -> tuple[str, str]:
        try:
            key, val = value.split("=", 1)
            return key, val
        except ValueError:
            self.fail(f"{value} is not in the format key=value", param, ctx)


KEY_VALUE = KeyValueType()


@secret.command(
    "set",
    help="Set a secret in Admyral",
)
@click.argument("secret_id", type=str)
@click.option("--value", "-v", type=KEY_VALUE, multiple=True)
@click.pass_context
def set(ctx: click.Context, secret_id: str, value: list[tuple[str, str]]) -> None:
    """Create a secret in Admyral"""
    capture(event_name="secret:set")
    client: AdmyralClient = ctx.obj
    try:
        client.set_secret(Secret(secret_id=secret_id, secret=dict(value)))
    except Exception as e:
        click.echo("Failed to set secret.")
        click.echo(f"Error: {e}")
        return
    click.echo(f"Secret {secret_id} set successfully.")


@secret.command(
    "list",
    help="List all secret ids stored in Admyral",
)
@click.pass_context
def list(ctx: click.Context) -> None:
    """List all secret ids stored in Admyral"""
    capture(event_name="secret:list")
    client: AdmyralClient = ctx.obj
    try:
        secrets = client.list_secrets()
    except Exception as e:
        click.echo("Failed to list secrets.")
        click.echo(f"Error: {e}")
        return
    click.echo("Secrets:")
    for secret in secrets:
        click.echo(secret.secret_id)


@secret.command("delete", help="Delete a secret in Admyral")
@click.argument("secret_id", type=str)
@click.pass_context
def delete(ctx: click.Context, secret_id: str) -> None:
    """Delete a secret in Admyral"""
    capture(event_name="secret:delete")
    client: AdmyralClient = ctx.obj
    try:
        client.delete_secret(secret_id)
    except Exception as e:
        click.echo("Failed to delete secret.")
        click.echo(f"Error: {e}")
        return
    click.echo(f"Secret {secret_id} deleted successfully.")
