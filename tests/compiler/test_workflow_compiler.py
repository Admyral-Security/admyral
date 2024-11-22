import pytest

from admyral.models import (
    ActionNode,
    ConstantConditionExpression,
    IfNode,
    WorkflowDAG,
    WorkflowStart,
    WorkflowWebhookTrigger,
    WorkflowScheduleTrigger,
)
from admyral.db.admyral_store import AdmyralStore
from admyral.compiler.yaml_workflow_compiler import validate_workflow
from admyral.config.config import TEST_USER_ID


WORKFLOW_WITH_INVALID_VERSION = WorkflowDAG(
    name="workflow_with_invalid_version",
    start=WorkflowStart(triggers=[]),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
        ),
    },
    version="2",
)


@pytest.mark.asyncio
async def test_validate_workflow_version(store: AdmyralStore):
    with pytest.raises(ValueError) as e:
        await validate_workflow(TEST_USER_ID, store, WORKFLOW_WITH_INVALID_VERSION)
    assert "Valid workflow schema versions: 1." == str(e.value)


WORKFLOW_WITH_MULTIPLE_WEBHOOKS = WorkflowDAG(
    name="workflow_wtih_mutliple_webhooks",
    start=WorkflowStart(
        triggers=[
            WorkflowWebhookTrigger(),
            WorkflowWebhookTrigger(),
        ]
    ),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
        ),
    },
)


@pytest.mark.asyncio
async def test_validate_workflow_multiple_webhooks(store: AdmyralStore):
    with pytest.raises(ValueError) as e:
        await validate_workflow(TEST_USER_ID, store, WORKFLOW_WITH_MULTIPLE_WEBHOOKS)
    assert "At most one webhook trigger is allowed." == str(e.value)


WORKFLOW_INVALID_WORKFLOW_NAME = WorkflowDAG(
    name="workflow_with_invalid_version!!!####",
    start=WorkflowStart(triggers=[]),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
        ),
    },
)


@pytest.mark.asyncio
async def test_validate_workflow_invalid_workflow_name(store: AdmyralStore):
    with pytest.raises(ValueError) as e:
        await validate_workflow(TEST_USER_ID, store, WORKFLOW_INVALID_WORKFLOW_NAME)
    assert (
        "Invalid workflow name. Workflow names must start with a letter and can only contain alphanumeric characters, underscores, and spaces."
        == str(e.value)
    )


WORKFLOW_WITH_INVALID_SCHEDULE_TRIGGER = WorkflowDAG(
    name="workflow_with_invalid_schedule_trigger",
    start=WorkflowStart(
        triggers=[
            WorkflowScheduleTrigger(cron="* * * * *", interval_seconds=1),
        ]
    ),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
        ),
    },
)


@pytest.mark.asyncio
async def test_validate_workflow_invalid_schedule_trigger(store: AdmyralStore):
    with pytest.raises(ValueError) as e:
        await validate_workflow(
            TEST_USER_ID, store, WORKFLOW_WITH_INVALID_SCHEDULE_TRIGGER
        )
    assert (
        "At most one schedule type (cron, interval seconds, etc.) per schedule trigger is allowed."
        == str(e.value)
    )


WORKFLOW_WITH_MULTIPLE_START_NODES = WorkflowDAG(
    name="workflow_with_multiple_start_nodes",
    start=WorkflowStart(triggers=[]),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
        ),
        "start_2": ActionNode(
            id="start_2",
            type="start",
        ),
    },
)


@pytest.mark.asyncio
async def test_validate_workflow_multiple_start_nodes(store: AdmyralStore):
    with pytest.raises(ValueError) as e:
        await validate_workflow(TEST_USER_ID, store, WORKFLOW_WITH_MULTIPLE_START_NODES)
    assert "There must be exactly one start node." == str(e.value)


WORKFLOW_WITH_INVALID_START_NODE_ID = WorkflowDAG(
    name="workflow_with_invalid_start_node_id",
    start=WorkflowStart(triggers=[]),
    dag={
        "start_2": ActionNode(
            id="start_2",
            type="start",
        ),
    },
)


@pytest.mark.asyncio
async def test_validate_workflow_invalid_start_node_id(store: AdmyralStore):
    with pytest.raises(ValueError) as e:
        await validate_workflow(
            TEST_USER_ID, store, WORKFLOW_WITH_INVALID_START_NODE_ID
        )
    assert "The start node must have id 'start'." == str(e.value)


WORKFLOW_WITH_START_NODE_RESULT_NAME_NOT_PAYLOAD = WorkflowDAG(
    name="workflow_with_start_node_result_name_not_payload",
    start=WorkflowStart(triggers=[]),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
            result_name="not_payload",
        ),
    },
)


@pytest.mark.asyncio
async def test_validate_workflow_result_name_not_payload(store: AdmyralStore):
    with pytest.raises(ValueError) as e:
        await validate_workflow(
            TEST_USER_ID, store, WORKFLOW_WITH_START_NODE_RESULT_NAME_NOT_PAYLOAD
        )
    assert "The start node must have result_name 'payload'." == str(e.value)


WORKFLOW_WITH_ACTION_NODE_RESULT_NAME_NOT_PAYLOAD = WorkflowDAG(
    name="workflow_with_action_node_result_name_not_payload",
    start=WorkflowStart(triggers=[]),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
            result_name="payload",
            children=["send_slack_message"],
        ),
        "send_slack_message": ActionNode(
            id="send_slack_message",
            type="send_slack_message",
            result_name="this is a test",
        ),
    },
)


@pytest.mark.asyncio
async def test_validate_workflow_action_node_result_name_not_payload(
    store: AdmyralStore,
):
    with pytest.raises(ValueError) as e:
        await validate_workflow(
            TEST_USER_ID, store, WORKFLOW_WITH_ACTION_NODE_RESULT_NAME_NOT_PAYLOAD
        )
    assert (
        "If a result name is provided, then the result name must be in snake_case."
        == str(e.value)
    )


WORKFLOW_NODE_ID_AND_DAG_KEY_MISMATCH = WorkflowDAG(
    name="workflow_with_node_id_and_dag_key_mismatch",
    start=WorkflowStart(triggers=[]),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
            result_name="payload",
            children=["send_slack_message"],
        ),
        "send_slack_message_xyz": ActionNode(
            id="send_slack_message",
            type="send_slack_message",
        ),
    },
)


@pytest.mark.asyncio
async def test_validate_workflow_node_id_and_dag_key_mismatch(store: AdmyralStore):
    with pytest.raises(ValueError) as e:
        await validate_workflow(
            TEST_USER_ID, store, WORKFLOW_NODE_ID_AND_DAG_KEY_MISMATCH
        )
    assert (
        "The following node IDs do not match their DAG keys: [('send_slack_message_xyz', 'send_slack_message')]"
        == str(e.value)
    )


WORKFLOW_WITH_INVALID_CHILD_NODE_ID = WorkflowDAG(
    name="workflow_with_invalid_child_node_id",
    start=WorkflowStart(triggers=[]),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
            result_name="payload",
            children=["send_slack_message_xyz"],
        ),
        "send_slack_message": ActionNode(
            id="send_slack_message",
            type="send_slack_message",
        ),
    },
)


@pytest.mark.asyncio
async def test_validate_workflow_invalid_child_node_id(store: AdmyralStore):
    with pytest.raises(ValueError) as e:
        await validate_workflow(
            TEST_USER_ID, store, WORKFLOW_WITH_INVALID_CHILD_NODE_ID
        )
    assert "Child node ID 'send_slack_message_xyz' not found." == str(e.value)


WORKFLOW_WITH_INCOMING_EDGE_FOR_START_NODE = WorkflowDAG(
    name="workflow_with_incoming_edge_for_start_node",
    start=WorkflowStart(triggers=[]),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
            result_name="payload",
            children=["send_slack_message"],
        ),
        "send_slack_message": ActionNode(
            id="send_slack_message",
            type="send_slack_message",
            children=["start"],
        ),
    },
)


@pytest.mark.asyncio
async def test_validate_workflow_incoming_edge_for_start_node(store: AdmyralStore):
    with pytest.raises(ValueError) as e:
        await validate_workflow(
            TEST_USER_ID, store, WORKFLOW_WITH_INCOMING_EDGE_FOR_START_NODE
        )
    assert "Start node cannot be a child of any node." == str(e.value)


WORKFLOW_WITH_INVALID_IF_CONDITION_CHILD_NODE_ID = WorkflowDAG(
    name="workflow_with_invalid_if_condition_child_node_id",
    start=WorkflowStart(triggers=[]),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
            result_name="payload",
            children=["if_condition"],
        ),
        "if_condition": IfNode(
            id="if_condition",
            type="if_condition",
            condition_str="payload['is_valid']",
            condition=ConstantConditionExpression(value="{{ payload['is_valid'] }}"),
            true_children=["send_slack_message_1"],
        ),
        "send_slack_message": ActionNode(
            id="send_slack_message",
            type="send_slack_message",
        ),
    },
)


@pytest.mark.asyncio
async def test_validate_workflow_invalid_if_condition_child_node_id(
    store: AdmyralStore,
):
    with pytest.raises(ValueError) as e:
        await validate_workflow(
            TEST_USER_ID, store, WORKFLOW_WITH_INVALID_IF_CONDITION_CHILD_NODE_ID
        )
    assert "Child node ID 'send_slack_message_1' not found." == str(e.value)


WORKFLOW_WITH_INVALID_ACTION_TYPE = WorkflowDAG(
    name="workflow_with_invalid_action_type",
    start=WorkflowStart(triggers=[]),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
            result_name="payload",
            children=["send_slack_message"],
        ),
        "send_slack_message": ActionNode(
            id="send_slack_message",
            type="not_a_valid_action_type",
        ),
    },
)


@pytest.mark.asyncio
async def test_validate_workflow_invalid_action_type(store: AdmyralStore):
    with pytest.raises(ValueError) as e:
        await validate_workflow(TEST_USER_ID, store, WORKFLOW_WITH_INVALID_ACTION_TYPE)
    assert "Invalid action 'not_a_valid_action_type'." == str(e.value)


WORKFLOW_WITH_CYCLE = WorkflowDAG(
    name="workflow_with_cycle",
    start=WorkflowStart(triggers=[]),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
            result_name="payload",
            children=["send_slack_message"],
        ),
        "send_slack_message": ActionNode(
            id="send_slack_message",
            type="send_slack_message",
            children=["send_slack_message_2"],
        ),
        "send_slack_message_2": ActionNode(
            id="send_slack_message_2",
            type="send_slack_message",
            children=["send_slack_message"],
        ),
    },
)


@pytest.mark.asyncio
async def test_validate_workflow_cycle(store: AdmyralStore):
    with pytest.raises(ValueError) as e:
        await validate_workflow(TEST_USER_ID, store, WORKFLOW_WITH_CYCLE)
    assert "Cycles are not allowed for workflows." == str(e.value)
