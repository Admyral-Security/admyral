import click

from admyral.client import AdmyralClient


@click.group()
@click.pass_context
def cli(ctx):
    """Admyral CLI

    Admyral is an open-source Python SDK enabling Security Engineers to build complex workflow automations using Python — blazingly fast.
    """
    ctx.obj = AdmyralClient()
