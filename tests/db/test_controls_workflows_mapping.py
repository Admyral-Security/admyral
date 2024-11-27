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
import random
import uuid


def generate_random_control_id() -> int:
    return random.randint(1, 999999)


def generate_random_workflow_id() -> str:
    return f"workflow-{uuid.uuid4()}"


async def create_control(session, control_id=1):
    control = ControlSchema(
        control_name="Test Control",
        control_description="A test control",
        user_id=TEST_USER_ID,
        control_id=control_id,
    )
    session.add(control)
    await session.commit()
    await session.refresh(control)
    return control


async def create_workflow(session, workflow_id="workflow123"):
    workflow = WorkflowSchema(
        workflow_id=workflow_id,
        workflow_name=f"Test Workflow-{workflow_id}",
        user_id=TEST_USER_ID,
        workflow_dag={},
        is_active=True,
    )
    session.add(workflow)
    await session.commit()
    await session.refresh(workflow)
    return workflow


async def setup_scenario(session):
    control_id = generate_random_control_id()
    workflow_id = generate_random_workflow_id()
    control = await create_control(session, control_id)
    workflow = await create_workflow(session, workflow_id)

    # Create the mapping
    mapping = ControlsWorkflowsMappingSchema(
        control_id=control.control_id,
        workflow_id=workflow.workflow_id,
        user_id=TEST_USER_ID,
    )
    session.add(mapping)
    await session.commit()
    await session.refresh(mapping)

    return control, workflow, mapping


@pytest.mark.asyncio
async def test_create_control(store: AdmyralStore):
    async with store.async_session_maker() as session:
        control_id = generate_random_control_id()
        control = await create_control(session, control_id)

        assert control.control_id == control_id
        assert control.control_name == "Test Control"
        assert control.control_description == "A test control"
        assert control.user_id == TEST_USER_ID


@pytest.mark.asyncio
async def test_create_workflow(store: AdmyralStore):
    async with store.async_session_maker() as session:
        workflow_id = generate_random_workflow_id()
        workflow = await create_workflow(session, workflow_id)

        assert workflow.workflow_id == workflow_id
        assert workflow.workflow_name == f"Test Workflow-{workflow_id}"
        assert workflow.user_id == TEST_USER_ID


@pytest.mark.asyncio
async def test_create_control_workflow_mapping(store: AdmyralStore):
    async with store.async_session_maker() as session:
        control, workflow, mapping = await setup_scenario(session)

        # Verify the mapping
        assert mapping.control_id == control.control_id
        assert mapping.workflow_id == workflow.workflow_id

        # Refresh the relationships
        await session.refresh(control, ["control_workflow_mappings"])
        await session.refresh(workflow, ["control_workflow_mappings"])

        # Get the related objects through the mapping
        control_mappings = control.control_workflow_mappings
        workflow_mappings = workflow.control_workflow_mappings

        assert len(control_mappings) == 1
        assert len(workflow_mappings) == 1
        assert control_mappings[0].workflow_id == workflow.workflow_id
        assert workflow_mappings[0].control_id == control.control_id


@pytest.mark.asyncio
async def test_cascade_delete_workflow(store: AdmyralStore):
    async with store.async_session_maker() as session:
        await store.clean_up_workflow_data_of(TEST_USER_ID)
        await store.clean_up_controls_data()
        _, workflow, _ = await setup_scenario(session)

        # Create a control result
        control_result = WorkflowControlResultsSchema(
            workflow_id=workflow.workflow_id,
            run_id="run123",
            result=True,
            user_id=TEST_USER_ID,
        )
        session.add(control_result)
        await session.commit()

        # Verify everything is created
        mapping_result = await session.execute(select(ControlsWorkflowsMappingSchema))
        mappings = mapping_result.scalars().all()
        assert len(mappings) == 1

        results_result = await session.execute(select(WorkflowControlResultsSchema))
        results = results_result.scalars().all()
        assert len(results) == 1

        # First delete the control results
        results_to_delete = await session.execute(
            select(WorkflowControlResultsSchema).where(
                WorkflowControlResultsSchema.workflow_id == workflow.workflow_id
            )
        )
        for result in results_to_delete.scalars().all():
            await session.delete(result)

        # Then delete the workflow mappings
        mappings_to_delete = await session.execute(
            select(ControlsWorkflowsMappingSchema).where(
                ControlsWorkflowsMappingSchema.workflow_id == workflow.workflow_id
            )
        )
        for mapping in mappings_to_delete.scalars().all():
            await session.delete(mapping)

        # Finally delete the workflow
        await session.delete(workflow)
        await session.commit()

        # Verify cascading deletes
        mapping_result = await session.execute(select(ControlsWorkflowsMappingSchema))
        mappings = mapping_result.scalars().all()
        assert len(mappings) == 0

        results_result = await session.execute(select(WorkflowControlResultsSchema))
        results = results_result.scalars().all()
        assert len(results) == 0

        control_result = await session.execute(select(ControlSchema))
        controls = control_result.scalars().all()
        assert len(controls) == 1
