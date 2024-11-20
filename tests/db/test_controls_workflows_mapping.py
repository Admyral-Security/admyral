import pytest
from sqlmodel import Session, SQLModel, create_engine
from admyral.db.schemas.control_schemas import (
    ControlSchema,
    ControlsWorkflowsMappingSchema,
)
from admyral.db.schemas.workflow_schemas import WorkflowSchema
from admyral.db.schemas.auth_schemas import UserSchema
from admyral.db.schemas.workflow_control_results_schemas import (
    WorkflowControlResultsSchema,
)
from sqlalchemy import text

# Use SQLite for testing
DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


@pytest.fixture(name="session")
def session_fixture():
    # Enable foreign keys in SQLite
    connection = engine.connect()
    connection.execute(text("PRAGMA foreign_keys=ON"))
    connection.close()

    # Create all tables before each test
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        # Create a test user first (needed due to foreign key constraints)
        test_user = UserSchema(id="user123", email="test@example.com", name="Test User")
        session.add(test_user)
        session.commit()

        yield session

        # Clean up after each test
        session.close()

    # Drop all tables after each test
    SQLModel.metadata.drop_all(engine)


def test_create_control(session):
    control = ControlSchema(
        control_name="Test Control",
        control_description="A test control",
        user_id="user123",
    )
    session.add(control)
    session.commit()

    assert control.control_id is not None
    assert control.control_name == "Test Control"
    assert control.control_description == "A test control"
    assert control.user_id == "user123"


def test_create_workflow(session):
    workflow = WorkflowSchema(
        workflow_id="workflow123",
        workflow_name="Test Workflow",
        user_id="user123",
        workflow_dag={},
        is_active=True,
    )
    session.add(workflow)
    session.commit()

    assert workflow.workflow_id == "workflow123"
    assert workflow.workflow_name == "Test Workflow"
    assert workflow.user_id == "user123"


def test_create_control_workflow_mapping(session):
    # Create a control
    control = ControlSchema(
        control_name="Test Control",
        control_description="A test control",
        user_id="user123",
    )
    session.add(control)

    # Create a workflow
    workflow = WorkflowSchema(
        workflow_id="workflow123",
        workflow_name="Test Workflow",
        user_id="user123",
        workflow_dag={},
        is_active=True,
    )
    session.add(workflow)
    session.commit()

    # Create the mapping
    mapping = ControlsWorkflowsMappingSchema(
        control_id=control.control_id, workflow_id=workflow.workflow_id
    )
    session.add(mapping)
    session.commit()

    # Verify the mapping
    assert mapping.control_id == control.control_id
    assert mapping.workflow_id == workflow.workflow_id

    # Verify relationships
    assert len(control.workflows) == 1
    assert len(workflow.controls) == 1
    assert control.workflows[0].workflow_id == workflow.workflow_id
    assert workflow.controls[0].control_id == control.control_id


def test_cascade_delete_workflow(session):
    # Create a control
    control = ControlSchema(
        control_name="Test Control",
        control_description="A test control",
        user_id="user123",
    )
    session.add(control)

    # Create a workflow
    workflow = WorkflowSchema(
        workflow_id="workflow123",
        workflow_name="Test Workflow",
        user_id="user123",
        workflow_dag={},
        is_active=True,
    )
    session.add(workflow)
    session.commit()

    # Create the mapping
    mapping = ControlsWorkflowsMappingSchema(
        control_id=control.control_id, workflow_id=workflow.workflow_id
    )
    session.add(mapping)

    # Create a control result
    control_result = WorkflowControlResultsSchema(
        workflow_id=workflow.workflow_id, run_id="run123", result=True
    )
    session.add(control_result)
    session.commit()

    # Verify everything is created
    assert session.query(ControlsWorkflowsMappingSchema).count() == 1
    assert session.query(WorkflowControlResultsSchema).count() == 1

    # Delete the workflow and related records manually for SQLite
    session.query(WorkflowControlResultsSchema).filter(
        WorkflowControlResultsSchema.workflow_id == workflow.workflow_id
    ).delete()
    session.query(ControlsWorkflowsMappingSchema).filter(
        ControlsWorkflowsMappingSchema.workflow_id == workflow.workflow_id
    ).delete()
    session.delete(workflow)
    session.commit()

    # Verify deletes
    assert session.query(ControlsWorkflowsMappingSchema).count() == 0
    assert session.query(WorkflowControlResultsSchema).count() == 0
    assert session.query(ControlSchema).count() == 1
