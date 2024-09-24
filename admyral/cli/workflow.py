import click
import os
import json

from admyral.cli.cli import cli
from admyral.compiler.workflow_compiler import WorkflowCompiler
from admyral.models import TriggerStatus
from admyral.client import AdmyralClient
from admyral.utils.posthog import send_event


@cli.group()
def workflow() -> None:
    """Workflow Management"""


# TODO: add option for pushing all used Python actions automatically
@workflow.command(
    "push",
    help="Push a workflow to Admyral",
)
@click.argument("workflow_name", type=str)
@click.option(
    "--file",
    "-f",
    type=str,
    help="Path to the Python file containing the workflow",
)
@click.option(
    "--activate",
    is_flag=True,
    help="Activate the workflow after pushing it to Admyral",
)
@click.pass_context
def push(ctx: click.Context, workflow_name: str, file: str, activate: bool) -> None:
    """Push workflow to Admyral"""
    send_event(event_name="Workflow", command="push")
    client: AdmyralClient = ctx.obj

    # compile the workflow
    if not os.path.exists(file):
        click.echo(f"File {file} not found.")
        return
    with open(file, "r") as f:
        workflow_code = f.read()
    workflow_dag = WorkflowCompiler().compile_from_module(workflow_code, workflow_name)

    # Push workflow to Admyral
    workflow_push_response = client.push_workflow(
        workflow_name=workflow_name, workflow_dag=workflow_dag, is_active=activate
    )

    click.echo(f"Workflow {workflow_name} pushed successfully.")

    if workflow_push_response.webhook_id:
        click.echo(f"Webhook ID: {workflow_push_response.webhook_id}")
        click.echo(f"Webhook Secret: {workflow_push_response.webhook_secret}")


@workflow.command(
    "trigger",
    help='Trigger a workflow. Example: admyral workflow trigger my_workflow --payload \'{"ip": "127.0.0.1"}\'',
)
@click.argument("workflow_name", type=str)
@click.option(
    "--payload",
    "-p",
    type=str,
    help='Payload to send to the workflow. Example: \'{"ip": "127.0.0.1"}\'',
)
@click.pass_context
def trigger(ctx: click.Context, workflow_name: str, payload: str | None) -> None:
    """Trigger workflow execution"""
    send_event(event_name="Workflow", command="trigger")
    client: AdmyralClient = ctx.obj
    payload = json.loads(payload) if payload else None
    try:
        response = client.trigger_workflow(workflow_name, payload)
        match response.status:
            case TriggerStatus.SUCCESS:
                click.echo(f"Workflow {workflow_name} triggered successfully.")
            case TriggerStatus.INACTIVE:
                click.echo(f"Workflow {workflow_name} is deactivated.")

    except Exception as e:
        if "is not active" in str(e):
            click.echo(f"Workflow {workflow_name} is not active.")
        else:
            raise e


@workflow.command(
    "activate",
    help="Activate a workflow",
)
@click.argument("workflow_name", type=str)
@click.pass_context
def activate_workflow(ctx: click.Context, workflow_name: str) -> None:
    """Activate a workflow"""
    send_event(event_name="Workflow", command="activate")
    client: AdmyralClient = ctx.obj
    client.activate_workflow(workflow_name)
    click.echo(f"Activated workflow {workflow_name} successfully.")


@workflow.command(
    "deactivate",
    help="Deactivate a workflow",
)
@click.argument("workflow_name", type=str)
@click.pass_context
def deactivate_workflow(ctx: click.Context, workflow_name: str) -> None:
    """Deactivate a workflow"""
    send_event(event_name="Workflow", command="deactivate")
    client: AdmyralClient = ctx.obj
    client.deactivate_workflow(workflow_name)
    click.echo(f"Deactivated workflow {workflow_name} successfully.")
