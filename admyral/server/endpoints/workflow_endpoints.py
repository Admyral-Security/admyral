from fastapi import APIRouter, status, Body, Depends, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from typing import Optional, Annotated
from uuid import uuid4
from pydantic import BaseModel
import io

from admyral.utils.collections import is_not_empty
from admyral.server.deps import get_admyral_store, get_workers_client
from admyral.models import (
    AuthenticatedUser,
    Workflow,
    WorkflowTriggerType,
    WorkflowPushRequest,
    WorkflowPushResponse,
    WorkflowSchedule,
    WorkflowTriggerResponse,
    WorkflowMetadata,
    WorkflowDAG,
)
from admyral.logger import get_logger
from admyral.typings import JsonValue
from admyral.server.auth import authenticate
from admyral.compiler.yaml_workflow_compiler import (
    compile_from_yaml_workflow,
    validate_workflow,
    decompile_workflow_to_yaml,
)


logger = get_logger(__name__)


MANUAL_TRIGGER_SOURCE_NAME = "manual"


class WorkflowBody(BaseModel):
    workflow_name: str | None = None
    workflow_id: str | None = None


async def _fetch_workflow(
    user_id: str, workflow_name: str | None, workflow_id: str | None
) -> Workflow:
    if not workflow_name and not workflow_id:
        raise ValueError("Either workflow_name or workflow_id must be provided.")

    if workflow_id:
        workflow = await get_admyral_store().get_workflow_by_id(user_id, workflow_id)
        if not workflow:
            raise ValueError(f"Workflow with id {workflow_id} not found.")
    else:
        workflow = await get_admyral_store().get_workflow_by_name(
            user_id, workflow_name
        )
        if not workflow:
            raise ValueError(f"Workflow with name {workflow_name} not found.")

    return workflow


async def push_workflow_impl(
    user_id: str,
    workflow_name: str,
    workflow_id: str | None,
    workflow_dag: WorkflowDAG,
    activate: bool,
) -> WorkflowPushResponse:
    """
    Push a workflow to the store. If the workflow for the provided workflow id already exists,
    it will be overwritten.

    Args:
        workflow_name: The workflow name.
        workflow: The workflow object.
    """

    try:
        await validate_workflow(user_id, get_admyral_store(), workflow_dag)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e

    admyral_store = get_admyral_store()
    workers_client = get_workers_client()

    if workflow_id:
        existing_workflow = await admyral_store.get_workflow_by_id(user_id, workflow_id)
    else:
        existing_workflow = await admyral_store.get_workflow_by_name(
            user_id, workflow_name
        )

    # fetch workflow webhook and schedules if they exist
    existing_webhook = None
    existing_schedules = []
    if existing_workflow:
        existing_webhook = await admyral_store.get_webhook_for_workflow(
            user_id, existing_workflow.workflow_id
        )
        existing_schedules = await admyral_store.list_schedules_for_workflow(
            user_id, existing_workflow.workflow_id
        )

    if existing_workflow:
        workflow_id = existing_workflow.workflow_id
    elif not workflow_id:
        workflow_id = str(uuid4())

    workflow = Workflow(
        workflow_id=workflow_id,
        workflow_name=workflow_name,
        workflow_dag=workflow_dag,
        is_active=activate,
    )

    await admyral_store.store_workflow(user_id, workflow)

    # Handle schedule update

    # Delete all existing schedules
    for schedule in existing_schedules:
        if existing_workflow and existing_workflow.is_active:
            # the schedule only exists if we previously had an active workflow
            await workers_client.delete_schedule(schedule.schedule_id)
        await admyral_store.delete_schedule(user_id, schedule.schedule_id)

    new_schedules = list(
        filter(
            lambda trigger: trigger.type == WorkflowTriggerType.SCHEDULE,
            workflow_dag.start.triggers,
        )
    )
    if is_not_empty(new_schedules):
        for schedule in new_schedules:
            new_workflow_schedule = WorkflowSchedule(
                schedule_id=str(uuid4()),
                workflow_id=workflow.workflow_id,
                cron=schedule.cron,
                interval_seconds=schedule.interval_seconds,
                interval_minutes=schedule.interval_minutes,
                interval_hours=schedule.interval_hours,
                interval_days=schedule.interval_days,
                default_args=schedule.default_args_dict,
            )
            await admyral_store.store_schedule(user_id, new_workflow_schedule)

            if activate:
                await workers_client.schedule_workflow(
                    user_id, workflow, new_workflow_schedule
                )

    # Handle webhook update
    filtered_webhooks = list(
        filter(
            lambda trigger: trigger.type == WorkflowTriggerType.WEBHOOK,
            workflow_dag.start.triggers,
        )
    )
    if len(filtered_webhooks) > 1:
        raise ValueError("Multiple webhooks found for the same workflow.")

    webhook_response = None
    new_webhook = filtered_webhooks[0] if is_not_empty(filtered_webhooks) else None
    if new_webhook:
        if not existing_webhook:
            # Case: we didn't have a webhook and we have a webhook now
            webhook_response = await admyral_store.store_workflow_webhook(
                user_id, workflow.workflow_id
            )
        else:
            # Case: we had a webhhok and we still have a webhook
            webhook_response = existing_webhook
    elif existing_webhook:
        # Case: we had a webhook but it was removed in the newest push
        await admyral_store.delete_webhook(user_id, existing_webhook.webhook_id)

    # construct response
    response = WorkflowPushResponse()
    if webhook_response:
        response.webhook_id = webhook_response.webhook_id
        response.webhook_secret = webhook_response.webhook_secret
    return response


router = APIRouter()


@router.post("/push", status_code=status.HTTP_201_CREATED)
async def push_workflow(
    request: WorkflowPushRequest,
    authenticated_user: AuthenticatedUser = Depends(authenticate),
) -> WorkflowPushResponse:
    """
    Push a workflow to the store. If the workflow for the provided workflow id already exists,
    it will be overwritten.

    Args:
        workflow_name: The workflow name.
        workflow: The workflow object.
    """
    workflow_dag = compile_from_yaml_workflow(request.workflow_code)
    workflow_name = workflow_dag.name
    return await push_workflow_impl(
        authenticated_user.user_id, workflow_name, None, workflow_dag, request.activate
    )


@router.get("/get/{workflow_name}", status_code=status.HTTP_200_OK)
async def get_workflow(
    workflow_name: str, authenticated_user: AuthenticatedUser = Depends(authenticate)
) -> Optional[Workflow]:
    """
    Get a workflow by its workflow name.

    Args:
        workflow_name: The workflow name.

    Returns:
        The workflow object.
    """
    return await get_admyral_store().get_workflow_by_name(
        authenticated_user.user_id, workflow_name
    )


@router.get("", status_code=status.HTTP_200_OK)
async def list_workflows(
    authenticated_user: AuthenticatedUser = Depends(authenticate),
) -> list[WorkflowMetadata]:
    """
    List all available workflows.

    Returns:
        List of workflow objects.
    """
    return await get_admyral_store().list_workflows(authenticated_user.user_id)


@router.post("/trigger/{workflow_name}", status_code=status.HTTP_201_CREATED)
async def trigger_workflow(
    workflow_name: str,
    payload: Annotated[dict[str, JsonValue], Body()] = {},
    authenticated_user: AuthenticatedUser = Depends(authenticate),
) -> WorkflowTriggerResponse:
    """
    Trigger a workflow.

    Args:
        workflow_name: The workflow name.
        payload: The payload to pass to the workflow.
    """
    workflow = await get_admyral_store().get_workflow_by_name(
        authenticated_user.user_id, workflow_name
    )
    if not workflow:
        raise ValueError(f"Workflow with name {workflow_name} not found.")
    if not workflow.is_active:
        return WorkflowTriggerResponse.inactive()
    await get_workers_client().start_workflow(
        authenticated_user.user_id, workflow, MANUAL_TRIGGER_SOURCE_NAME, payload
    )
    return WorkflowTriggerResponse.success()


@router.post("/activate", status_code=status.HTTP_201_CREATED)
async def activate_workflow(
    body: WorkflowBody, authenticated_user: AuthenticatedUser = Depends(authenticate)
) -> bool:
    """
    Activate a workflow.

    Args:
        workflow_name: The workflow name.

    Returns:
        is_active: True if the workflow was successfully activated.
    """
    # if already active, do nothing
    # else we update the state and schedule in temporal

    workflow = await _fetch_workflow(
        authenticated_user.user_id, body.workflow_name, body.workflow_id
    )

    if not workflow.is_active:
        await get_admyral_store().set_workflow_active_state(
            authenticated_user.user_id, workflow.workflow_id, is_active=True
        )

        schedules = await get_admyral_store().list_schedules_for_workflow(
            authenticated_user.user_id, workflow.workflow_id
        )
        for schedule in schedules:
            await get_workers_client().schedule_workflow(
                authenticated_user.user_id, workflow, schedule
            )

    return True


@router.post("/deactivate", status_code=status.HTTP_201_CREATED)
async def deactivate_workflow(
    body: WorkflowBody, authenticated_user: AuthenticatedUser = Depends(authenticate)
) -> bool:
    """
    Deactivate a workflow.

    Args:
        workflow_name: The workflow name.

    Returns:
        is_active: False if the workflow was successfully deactivated.
    """
    # if already inactive, do nothing
    # else we update the state and delete the schedule in temporal

    workflow = await _fetch_workflow(
        authenticated_user.user_id, body.workflow_name, body.workflow_id
    )

    if workflow.is_active:
        await get_admyral_store().set_workflow_active_state(
            authenticated_user.user_id, workflow.workflow_id, is_active=False
        )

        schedules = await get_admyral_store().list_schedules_for_workflow(
            authenticated_user.user_id, workflow.workflow_id
        )
        for schedule in schedules:
            await get_workers_client().delete_schedule(schedule.schedule_id)

    return False


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    body: WorkflowBody, authenticated_user: AuthenticatedUser = Depends(authenticate)
) -> None:
    """
    Delete a workflow by its workflow name.

    Args:
        workflow_name: The workflow name.
    """
    workflow = await _fetch_workflow(
        authenticated_user.user_id, body.workflow_name, body.workflow_id
    )

    # we must clean up the schedules in temporal if there are any
    schedules = await get_admyral_store().list_schedules_for_workflow(
        authenticated_user.user_id, workflow.workflow_id
    )
    for schedule in schedules:
        await get_admyral_store().delete_schedule(
            authenticated_user.user_id, schedule.schedule_id
        )
        await get_workers_client().delete_schedule(schedule.schedule_id)

    # now, we can delete the workflow
    await get_admyral_store().remove_workflow(
        authenticated_user.user_id, workflow.workflow_id
    )


@router.post("/import", status_code=status.HTTP_201_CREATED)
async def import_workflow(
    file: UploadFile, authenticated_user: AuthenticatedUser = Depends(authenticate)
) -> str:
    db = get_admyral_store()

    yaml_str = (await file.read()).decode("utf-8")

    try:
        workflow_dag = compile_from_yaml_workflow(yaml_str)
        await validate_workflow(authenticated_user.user_id, db, workflow_dag)
        workflow_name = workflow_dag.name

        workflow = Workflow(
            workflow_id=str(uuid4()),
            workflow_name=workflow_name,
            workflow_dag=workflow_dag,
            is_active=False,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e

    try:
        await db.create_workflow(authenticated_user.user_id, workflow)
    except ValueError as e:
        if "already exists" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A workflow with the name '{workflow.workflow_name}' already exists. Workflow names must be unique.",
            )
        else:
            raise e

    return workflow.workflow_id


@router.get("/export/{workflow_id}", status_code=status.HTTP_200_OK)
async def export_workflow(
    workflow_id: str, authenticated_user: AuthenticatedUser = Depends(authenticate)
) -> None:
    workflow = await _fetch_workflow(authenticated_user.user_id, None, workflow_id)

    workflow_dag = workflow.workflow_dag
    workflow_name = workflow.workflow_name
    yaml_str = decompile_workflow_to_yaml(workflow_dag)
    yaml_str_bytes = yaml_str.encode("utf-8")

    return StreamingResponse(
        io.BytesIO(yaml_str_bytes),
        media_type="text/yaml",
        headers={"Content-Disposition": f'attachment; filename="{workflow_name}.yaml"'},
    )
