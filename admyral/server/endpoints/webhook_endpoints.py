from fastapi import APIRouter, status, Header, Request
from typing import Optional, Annotated
import json

from admyral.models import WorkflowTriggerResponse, WorkflowTriggerType
from admyral.server.deps import get_admyral_store, get_workers_client
from admyral.typings import JsonValue
from admyral.utils.collections import is_not_empty


router = APIRouter()


WEBHOOK_SOURCE_NAME = "webhook"


async def _extract_payload_from_request(request: Request) -> JsonValue:
    content_type = request.headers.get("Content-Type")
    if content_type == "application/x-www-form-urlencoded":
        body = await request.form()
        # Handle Slack interactivity payload
        if (
            request.headers.get("user-agent")
            == "Slackbot 1.0 (+https://api.slack.com/robots)"
        ):
            payload = json.loads(body.get("payload"))
        else:
            raise ValueError("Unsupported content type.")
    else:
        body = await request.body()
        if is_not_empty(body):
            payload = json.loads(body)
        else:
            payload = None
    return payload


async def _handle_webhook_trigger(
    webhook_id: str,
    webhook_secret: str,
    payload: Optional[JsonValue],
) -> WorkflowTriggerResponse:
    """
    Handle the webhook trigger.

    Args:
        webhook_id: The webhook id.
    """
    payload = payload or {}
    if not isinstance(payload, dict):
        raise ValueError("Payload must be a JSON object.")

    webhook = await get_admyral_store().get_webhook(webhook_id)
    if not webhook:
        raise ValueError(f"Webhook with id {webhook_id} not found.")
    if webhook.webhook_secret != webhook_secret:
        raise ValueError("Invalid webhook secret.")
    # check whether the workflow is active
    user_id_and_workflow = await get_admyral_store().get_workflow_for_webhook(
        webhook.workflow_id
    )
    if not user_id_and_workflow:
        raise ValueError(f"Invalid webhook with id {webhook_id}. Workflow not found.")
    user_id, workflow = user_id_and_workflow
    if not workflow.is_active:
        return WorkflowTriggerResponse.inactive()

    webhook_triggers = list(
        filter(
            lambda trigger: trigger.type == WorkflowTriggerType.WEBHOOK,
            workflow.workflow_dag.start.triggers,
        )
    )
    if len(webhook_triggers) > 1:
        raise ValueError("Multiple webhook triggers found.")
    webhook_trigger = webhook_triggers[0]

    # launch the workflow execution in the background
    await get_workers_client().start_workflow(
        user_id,
        workflow,
        WEBHOOK_SOURCE_NAME,
        payload,
        trigger_default_args=webhook_trigger.default_args_dict,
    )

    return WorkflowTriggerResponse.success()


@router.post("/{webhook_id}", status_code=status.HTTP_200_OK)
async def trigger_webhook_post(
    webhook_id: str,
    request: Request,
    authorization: Annotated[str | None, Header()] = None,
) -> WorkflowTriggerResponse:
    """
    Trigger the webhook with the given id.

    Args:
        webhook_id: The webhook id.
    """
    payload = await _extract_payload_from_request(request)
    return await _handle_webhook_trigger(webhook_id, authorization, payload)


@router.post("/{webhook_id}/{webhook_secret}", status_code=status.HTTP_200_OK)
async def trigger_webhook_post_with_secret_path(
    webhook_id: str,
    webhook_secret: str,
    request: Request,
    # payload: Annotated[JsonValue, Body()] = None,
) -> WorkflowTriggerResponse:
    """
    Trigger the webhook with the given id.

    Args:
        webhook_id: The webhook id.
    """
    payload = await _extract_payload_from_request(request)
    return await _handle_webhook_trigger(webhook_id, webhook_secret, payload)


@router.get("/{webhook_id}", status_code=status.HTTP_200_OK)
async def trigger_webhook_get(
    webhook_id: str, request: Request
) -> WorkflowTriggerResponse:
    """
    Trigger the webhook with the given id.

    Args:
        webhook_id: The webhook id.
    """
    params = dict(request.query_params.items())
    authorization = request.headers.get("Authorization")
    return await _handle_webhook_trigger(webhook_id, authorization, params)


@router.get("/{webhook_id}/{webhook_secret}", status_code=status.HTTP_200_OK)
async def trigger_webhook_get_with_secret_path(
    webhook_id: str,
    webhook_secret: str,
    request: Request,
) -> WorkflowTriggerResponse:
    """
    Trigger the webhook with the given id.

    Args:
        webhook_id: The webhook id.
    """
    params = dict(request.query_params.items())
    return await _handle_webhook_trigger(webhook_id, webhook_secret, params)
