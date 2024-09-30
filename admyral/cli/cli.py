import click

from admyral.client import AdmyralClient
from admyral.config.config import CONFIG


@click.group()
@click.pass_context
def cli(ctx):
    """Admyral CLI

    Admyral is an open-source Python SDK enabling Security Engineers to build complex workflow automations using Python — blazingly fast.
    """
    ctx.obj = AdmyralClient(base_url=CONFIG.cli_target, api_key=CONFIG.api_key)
