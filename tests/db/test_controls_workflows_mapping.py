import pytest
from admyral.db.schemas.control_schemas import (
    ControlSchema,
    ControlsWorkflowsMappingSchema,
)
from admyral.db.schemas.workflow_schemas import WorkflowSchema
from admyral.db.schemas.workflow_control_results_schemas import (
    WorkflowControlResultsSchema,
)
from admyral.config.config import TEST_USER_ID
from sqlmodel import select
from admyral.db.admyral_store import AdmyralStore


async def create_control(session):
    control = ControlSchema(
        control_name="Test Control",
        control_description="A test control",
        user_id=TEST_USER_ID,
        control_id=1,
    )
    session.add(control)
    await session.commit()
    await session.refresh(control)
    return control


async def create_workflow(session):
    workflow = WorkflowSchema(
        workflow_id="workflow123",
        workflow_name="Test Workflow",
        user_id=TEST_USER_ID,
        workflow_dag={},
        is_active=True,
    )
    session.add(workflow)
    await session.commit()
    await session.refresh(workflow)
    return workflow


async def setup_scenario(session):
    control = await create_control(session)
    workflow = await create_workflow(session)

    # Create the mapping
    mapping = ControlsWorkflowsMappingSchema(
        control_id=control.control_id, workflow_id=workflow.workflow_id
    )
    session.add(mapping)
    await session.commit()
    await session.refresh(mapping)

    return control, workflow, mapping


@pytest.mark.asyncio
async def test_create_control(store: AdmyralStore):
    async with store.async_session_maker() as session:
        control = await create_control(session)

        assert control.control_id is not None
        assert control.control_name == "Test Control"
        assert control.control_description == "A test control"
        assert control.user_id == TEST_USER_ID


@pytest.mark.asyncio
async def test_create_workflow(store: AdmyralStore):
    async with store.async_session_maker() as session:
        workflow = await create_workflow(session)

        assert workflow.workflow_id == "workflow123"
        assert workflow.workflow_name == "Test Workflow"
        assert workflow.user_id == TEST_USER_ID


@pytest.mark.asyncio
async def test_create_control_workflow_mapping(store: AdmyralStore):
    async with store.async_session_maker() as session:
        control, workflow, mapping = await setup_scenario(session)

        # Verify the mapping
        assert mapping.control_id == control.control_id
        assert mapping.workflow_id == workflow.workflow_id

        # Verify relationships
        assert len(control.workflows) == 1
        assert len(workflow.controls) == 1
        assert control.workflows[0].workflow_id == workflow.workflow_id
        assert workflow.controls[0].control_id == control.control_id


@pytest.mark.asyncio
async def test_cascade_delete_workflow(store: AdmyralStore):
    async with store.async_session_maker() as session:
        _, workflow, _ = await setup_scenario(session)

        # Create a control result
        control_result = WorkflowControlResultsSchema(
            workflow_id=workflow.workflow_id, run_id="run123", result=True
        )
        session.add(control_result)
        await session.commit()

        # Verify everything is created
        mapping_count = await session.execute(select(ControlsWorkflowsMappingSchema))
        assert len(mapping_count.all()) == 1

        results_count = await session.execute(select(WorkflowControlResultsSchema))
        assert len(results_count.all()) == 1

        # Delete the workflow
        await session.delete(workflow)
        await session.commit()

        # Verify cascading deletes
        mapping_count = await session.execute(select(ControlsWorkflowsMappingSchema))
        assert len(mapping_count.all()) == 0

        results_count = await session.execute(select(WorkflowControlResultsSchema))
        assert len(results_count.all()) == 0

        control_count = await session.execute(select(ControlSchema))
        assert len(control_count.all()) == 1
