import pytest
import time
from uuid import uuid4
from temporalio.client import Client as TemporalClient

from tests.workers.utils import execute_test_workflow

from admyral.db.admyral_store import AdmyralStore
from admyral.models import WorkflowStart, WorkflowDAG, ActionNode, LoopNode, LoopType


#########################################################################################################


WORKFLOW_MISSING_SECRET = WorkflowDAG(
    name="workflow_test_missing_secret",
    start=WorkflowStart(triggers=[]),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
            children=["action_test_missing_secret"],
        ),
        "list_kandji_devices": ActionNode(
            id="list_kandji_devices",
            type="list_kandji_devices",
            secrets_mapping={"KANDJI_SECRET": "123"},
        ),
    },
)


@pytest.mark.asyncio
async def test_missing_secret(store: AdmyralStore, temporal_client: TemporalClient):
    workflow_id = str(uuid4())
    workflow_name = WORKFLOW_MISSING_SECRET.name + workflow_id

    run, run_steps, exception = await execute_test_workflow(
        store=store,
        temporal_client=temporal_client,
        workflow_id=workflow_id,
        workflow_name=workflow_name,
        workflow_dag=WORKFLOW_MISSING_SECRET,
    )

    assert exception is None
    assert run.failed_at is not None
    assert (
        run.error
        == "An exception occurred during workflow execution. Error: Invalid child node: action_test_missing_secret"
    )


#########################################################################################################


WORKFLOW_TEST_ACTION_RAISES_ERROR = WorkflowDAG(
    name="workflow_test_action_raises_error",
    start=WorkflowStart(triggers=[]),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
            children=["list_kandji_devices"],
        ),
        "list_kandji_devices": ActionNode(
            id="list_kandji_devices",
            type="list_kandji_devices",
            args={
                "platform": "windows",
            },
            secrets_mapping={"KANDJI_SECRET": "123"},
        ),
    },
)


@pytest.mark.asyncio
async def test_action_raises_error(
    store: AdmyralStore, temporal_client: TemporalClient
):
    workflow_id = str(uuid4())
    workflow_name = WORKFLOW_TEST_ACTION_RAISES_ERROR.name + workflow_id

    run, run_steps, exception = await execute_test_workflow(
        store=store,
        temporal_client=temporal_client,
        workflow_id=workflow_id,
        workflow_name=workflow_name,
        workflow_dag=WORKFLOW_TEST_ACTION_RAISES_ERROR,
    )

    assert exception is None
    assert run.failed_at is not None
    assert run_steps[1].error == "Invalid platform: windows"


#########################################################################################################


WORKFLOW_TEST_ACTION_MISSING_PARAMS = WorkflowDAG(
    name="workflow_test_action_missing_params",
    start=WorkflowStart(triggers=[]),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
            children=["get_kandji_device_details"],
        ),
        "get_kandji_device_details": ActionNode(
            id="get_kandji_device_details",
            type="get_kandji_device_details",
            secret_mappings={
                "KANDJI_SECRET": "kandji_secret",
            },
        ),
    },
)


@pytest.mark.asyncio
async def test_action_missing_params(
    store: AdmyralStore, temporal_client: TemporalClient
):
    workflow_id = str(uuid4())
    workflow_name = WORKFLOW_TEST_ACTION_MISSING_PARAMS.name + workflow_id

    run, run_steps, exception = await execute_test_workflow(
        store=store,
        temporal_client=temporal_client,
        workflow_id=workflow_id,
        workflow_name=workflow_name,
        workflow_dag=WORKFLOW_TEST_ACTION_MISSING_PARAMS,
    )

    assert exception is None
    assert run.failed_at is not None
    assert (
        run_steps[1].error
        == "get_kandji_device_details() missing 1 required positional argument: 'device_id'"
    )


#########################################################################################################


WORKFLOW_TEST_ACTION_MISSING_CUSTOM_ACTION = WorkflowDAG(
    name="workflow_test_action_missing_custom_action",
    start=WorkflowStart(triggers=[]),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
            children=["action_test_missing_custom_action"],
        ),
        "action_test_missing_custom_action": ActionNode(
            id="action_test_missing_custom_action",
            type="action_test_missing_custom_action",
        ),
    },
)


@pytest.mark.asyncio
async def test_missing_custom_action(
    store: AdmyralStore, temporal_client: TemporalClient
):
    workflow_id = str(uuid4())
    workflow_name = WORKFLOW_TEST_ACTION_MISSING_CUSTOM_ACTION.name + workflow_id

    run, run_steps, exception = await execute_test_workflow(
        store=store,
        temporal_client=temporal_client,
        workflow_id=workflow_id,
        workflow_name=workflow_name,
        workflow_dag=WORKFLOW_TEST_ACTION_MISSING_CUSTOM_ACTION,
    )

    assert exception is None
    assert run.failed_at is not None
    assert (
        run_steps[1].error
        == "Action with type 'action_test_missing_custom_action' not found. Did you push your action?"
    )


#########################################################################################################


WORKFLOW_TEST_WAIT_ACTION = WorkflowDAG(
    name="workflow_test_wait_action",
    start=WorkflowStart(triggers=[]),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
            result_name="payload",
            children=["wait"],
        ),
        "wait": ActionNode(
            id="wait",
            type="wait",
            args={"seconds": 3},
        ),
    },
)


@pytest.mark.asyncio
async def test_wait_action(store: AdmyralStore, temporal_client: TemporalClient):
    workflow_id = str(uuid4())
    workflow_name = WORKFLOW_TEST_WAIT_ACTION.name + workflow_id

    start = time.time()

    run, run_steps, exception = await execute_test_workflow(
        store=store,
        temporal_client=temporal_client,
        workflow_id=workflow_id,
        workflow_name=workflow_name,
        workflow_dag=WORKFLOW_TEST_WAIT_ACTION,
    )

    end = time.time()

    assert exception is None
    assert run.failed_at is None
    assert end - start >= 3


#########################################################################################################


WORKFLOW_TEST_LOOP_LIST = WorkflowDAG(
    name="workflow_test_loop_list",
    start=WorkflowStart(triggers=[]),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
            children=["transform"],
        ),
        "transform": ActionNode(
            id="transform",
            type="transform",
            result_name="transform_output",
            args={
                "value": ["a", "b", "c"],
            },
            children=["loop"],
        ),
        "loop": LoopNode(
            id="loop",
            type="loop",
            loop_type=LoopType.LIST,
            loop_name="my_loop",
            loop_condition="{{ transform_output }}",
            results_to_collect=["x"],
            loop_body_dag={
                "transform_2": ActionNode(
                    id="transform_2",
                    type="transform",
                    result_name="x",
                    args={"value": "{{ my_loop_value }}"},
                    children=[],
                )
            },
        ),
    },
)


@pytest.mark.asyncio
async def test_loop_list(store: AdmyralStore, temporal_client: TemporalClient):
    workflow_id = str(uuid4())
    workflow_name = WORKFLOW_TEST_LOOP_LIST.name + workflow_id

    run, run_steps, exception = await execute_test_workflow(
        store=store,
        temporal_client=temporal_client,
        workflow_id=workflow_id,
        workflow_name=workflow_name,
        workflow_dag=WORKFLOW_TEST_LOOP_LIST,
    )

    assert exception is None
    assert run.failed_at is None
    assert len(run_steps) == 6
    assert run_steps[2].action_type == "loop"
    assert run_steps[2].result == ["a", "b", "c"]


#########################################################################################################


WORKFLOW_TEST_LOOP_COUNTER = WorkflowDAG(
    name="workflow_test_loop_counter",
    start=WorkflowStart(triggers=[]),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
            children=["transform"],
        ),
        "transform": ActionNode(
            id="transform",
            type="transform",
            result_name="transform_output",
            args={
                "value": 5,
            },
            children=["loop"],
        ),
        "loop": LoopNode(
            id="loop",
            type="loop",
            loop_type=LoopType.COUNT,
            loop_name="my_loop",
            loop_condition="{{ transform_output }}",
            results_to_collect=["x"],
            loop_body_dag={
                "transform_2": ActionNode(
                    id="transform_2",
                    type="transform",
                    result_name="x",
                    args={"value": "Iter: {{ my_loop_value }}"},
                    children=[],
                )
            },
        ),
    },
)


@pytest.mark.asyncio
async def test_loop_counter(store: AdmyralStore, temporal_client: TemporalClient):
    workflow_id = str(uuid4())
    workflow_name = WORKFLOW_TEST_LOOP_COUNTER.name + workflow_id

    run, run_steps, exception = await execute_test_workflow(
        store=store,
        temporal_client=temporal_client,
        workflow_id=workflow_id,
        workflow_name=workflow_name,
        workflow_dag=WORKFLOW_TEST_LOOP_COUNTER,
    )

    assert exception is None
    assert run.failed_at is None
    assert len(run_steps) == 8
    assert run_steps[2].action_type == "loop"
    assert run_steps[2].result == [
        "Iter: 0",
        "Iter: 1",
        "Iter: 2",
        "Iter: 3",
        "Iter: 4",
    ]


#########################################################################################################


WORKFLOW_TEST_2_NESTED_LOOPS = WorkflowDAG(
    name="workflow_test_loop_counter",
    start=WorkflowStart(triggers=[]),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
            children=["loop"],
        ),
        "loop": LoopNode(
            id="loop",
            type="loop",
            loop_type=LoopType.COUNT,
            loop_name="outer_loop",
            loop_condition=2,
            results_to_collect=["inner_loop"],
            loop_body_dag={
                "inner_loop": LoopNode(
                    id="inner_loop",
                    type="loop",
                    loop_type=LoopType.COUNT,
                    loop_name="inner_loop",
                    loop_condition=2,
                    results_to_collect=["x"],
                    loop_body_dag={
                        "transform_2": ActionNode(
                            id="transform_2",
                            type="transform",
                            result_name="x",
                            args={
                                "value": "({{ outer_loop_value }}, {{ inner_loop_value }})"
                            },
                            children=[],
                        )
                    },
                    children=[],
                ),
            },
        ),
    },
)


@pytest.mark.asyncio
async def test_2_nested_loops(store: AdmyralStore, temporal_client: TemporalClient):
    workflow_id = str(uuid4())
    workflow_name = WORKFLOW_TEST_2_NESTED_LOOPS.name + workflow_id

    run, run_steps, exception = await execute_test_workflow(
        store=store,
        temporal_client=temporal_client,
        workflow_id=workflow_id,
        workflow_name=workflow_name,
        workflow_dag=WORKFLOW_TEST_2_NESTED_LOOPS,
    )

    assert exception is None
    assert run.failed_at is None
    assert len(run_steps) == 8
    assert run_steps[1].action_type == "loop"
    assert run_steps[1].result == [["(0, 0)", "(0, 1)"], ["(1, 0)", "(1, 1)"]]


#########################################################################################################


WORKFLOW_TEST_3_NESTED_LOOPS = WorkflowDAG(
    name="workflow_test_loop_counter",
    start=WorkflowStart(triggers=[]),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
            children=["loop"],
        ),
        "loop": LoopNode(
            id="loop",
            type="loop",
            loop_type=LoopType.COUNT,
            loop_name="outer_loop",
            loop_condition=2,
            results_to_collect=["inner_loop"],
            loop_body_dag={
                "inner_loop": LoopNode(
                    id="inner_loop",
                    type="loop",
                    loop_type=LoopType.COUNT,
                    loop_name="inner_loop",
                    loop_condition=2,
                    results_to_collect=["inner_inner_loop"],
                    loop_body_dag={
                        "inner_inner_loop": LoopNode(
                            id="inner_inner_loop",
                            type="loop",
                            loop_type=LoopType.COUNT,
                            loop_name="inner_inner_loop",
                            loop_condition=2,
                            results_to_collect=["x"],
                            loop_body_dag={
                                "transform_2": ActionNode(
                                    id="transform_2",
                                    type="transform",
                                    result_name="x",
                                    args={
                                        "value": "({{ outer_loop_value }}, {{ inner_loop_value }}, {{ inner_inner_loop_value }})"
                                    },
                                    children=[],
                                )
                            },
                        )
                    },
                    children=[],
                ),
            },
        ),
    },
)


@pytest.mark.asyncio
async def test_3_nested_loops(store: AdmyralStore, temporal_client: TemporalClient):
    workflow_id = str(uuid4())
    workflow_name = WORKFLOW_TEST_3_NESTED_LOOPS.name + workflow_id

    run, run_steps, exception = await execute_test_workflow(
        store=store,
        temporal_client=temporal_client,
        workflow_id=workflow_id,
        workflow_name=workflow_name,
        workflow_dag=WORKFLOW_TEST_3_NESTED_LOOPS,
    )

    assert exception is None
    assert run.failed_at is None
    assert len(run_steps) == 16
    assert run_steps[1].action_type == "loop"
    assert run_steps[1].result == [
        [["(0, 0, 0)", "(0, 0, 1)"], ["(0, 1, 0)", "(0, 1, 1)"]],
        [["(1, 0, 0)", "(1, 0, 1)"], ["(1, 1, 0)", "(1, 1, 1)"]],
    ]


#########################################################################################################


WORKFLOW_TEST_LOOP_COLLECT_ALL = WorkflowDAG(
    name="workflow_test_loop_list",
    start=WorkflowStart(triggers=[]),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
            children=["transform"],
        ),
        "transform": ActionNode(
            id="transform",
            type="transform",
            result_name="transform_output",
            args={
                "value": ["a", "b"],
            },
            children=["loop"],
        ),
        "loop": LoopNode(
            id="loop",
            type="loop",
            loop_type=LoopType.LIST,
            loop_name="my_loop",
            loop_condition="{{ transform_output }}",
            results_to_collect=None,
            loop_body_dag={
                "transform_2": ActionNode(
                    id="transform_2",
                    type="transform",
                    result_name="x",
                    args={"value": "1) {{ my_loop_value }}"},
                    children=["transform_3"],
                ),
                "transform_3": ActionNode(
                    id="transform_3",
                    type="transform",
                    result_name="y",
                    args={"value": "2) {{ my_loop_value }}"},
                    children=[],
                ),
            },
        ),
    },
)


@pytest.mark.asyncio
async def test_loop_collect_all(store: AdmyralStore, temporal_client: TemporalClient):
    workflow_id = str(uuid4())
    workflow_name = WORKFLOW_TEST_LOOP_COLLECT_ALL.name + workflow_id

    run, run_steps, exception = await execute_test_workflow(
        store=store,
        temporal_client=temporal_client,
        workflow_id=workflow_id,
        workflow_name=workflow_name,
        workflow_dag=WORKFLOW_TEST_LOOP_COLLECT_ALL,
    )

    assert exception is None
    assert run.failed_at is None
    assert len(run_steps) == 7
    assert run_steps[2].action_type == "loop"
    assert run_steps[2].result == [
        {"my_loop_value": "a", "x": "1) a", "y": "2) a"},
        {"my_loop_value": "b", "x": "1) b", "y": "2) b"},
    ]


#########################################################################################################


WORKFLOW_TEST_LOOP_COLLECT_MULTIPLE = WorkflowDAG(
    name="workflow_test_loop_list",
    start=WorkflowStart(triggers=[]),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
            children=["transform"],
        ),
        "transform": ActionNode(
            id="transform",
            type="transform",
            result_name="transform_output",
            args={
                "value": ["a", "b"],
            },
            children=["loop"],
        ),
        "loop": LoopNode(
            id="loop",
            type="loop",
            loop_type=LoopType.LIST,
            loop_name="my_loop",
            loop_condition="{{ transform_output }}",
            results_to_collect=["x", "y"],
            loop_body_dag={
                "transform_2": ActionNode(
                    id="transform_2",
                    type="transform",
                    result_name="x",
                    args={"value": "1) {{ my_loop_value }}"},
                    children=["transform_3"],
                ),
                "transform_3": ActionNode(
                    id="transform_3",
                    type="transform",
                    result_name="y",
                    args={"value": "2) {{ my_loop_value }}"},
                    children=[],
                ),
            },
        ),
    },
)


@pytest.mark.asyncio
async def test_loop_collect_multiple(
    store: AdmyralStore, temporal_client: TemporalClient
):
    workflow_id = str(uuid4())
    workflow_name = WORKFLOW_TEST_LOOP_COLLECT_MULTIPLE.name + workflow_id

    run, run_steps, exception = await execute_test_workflow(
        store=store,
        temporal_client=temporal_client,
        workflow_id=workflow_id,
        workflow_name=workflow_name,
        workflow_dag=WORKFLOW_TEST_LOOP_COLLECT_MULTIPLE,
    )

    assert exception is None
    assert run.failed_at is None
    assert len(run_steps) == 7
    assert run_steps[2].action_type == "loop"
    assert run_steps[2].result == [
        {"x": "1) a", "y": "2) a"},
        {"x": "1) b", "y": "2) b"},
    ]


#########################################################################################################


WORKFLOW_TEST_LOOP_INVALID_LOOP_CONDITION = WorkflowDAG(
    name="workflow_test_loop_invalid_loop_condition",
    start=WorkflowStart(triggers=[]),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
            children=["loop"],
        ),
        "loop": LoopNode(
            id="loop",
            type="loop",
            loop_type=LoopType.COUNT,
            loop_name="my_loop",
            loop_condition=["a", "b", "c"],
            results_to_collect=None,
            loop_body_dag={
                "transform_2": ActionNode(
                    id="transform_2",
                    type="transform",
                    result_name="x",
                    args={"value": "{{ my_loop_value }}"},
                    children=[],
                )
            },
        ),
    },
)


@pytest.mark.asyncio
async def test_loop_invalid_loop_condition(
    store: AdmyralStore, temporal_client: TemporalClient
):
    workflow_id = str(uuid4())
    workflow_name = WORKFLOW_TEST_LOOP_INVALID_LOOP_CONDITION.name + workflow_id

    run, run_steps, exception = await execute_test_workflow(
        store=store,
        temporal_client=temporal_client,
        workflow_id=workflow_id,
        workflow_name=workflow_name,
        workflow_dag=WORKFLOW_TEST_LOOP_INVALID_LOOP_CONDITION,
    )

    assert run.failed_at is not None
    assert (
        run.error
        == "An exception occurred during workflow execution. Error: Loop count must be an integer."
    )


#########################################################################################################


WORKFLOW_TEST_LOOP_MISSING_EDGE = WorkflowDAG(
    name="workflow_test_loop_missing_edge",
    start=WorkflowStart(triggers=[]),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
            children=["loop"],
        ),
        "loop": LoopNode(
            id="loop",
            type="loop",
            loop_type=LoopType.LIST,
            loop_name="my_loop",
            loop_condition=["a"],
            results_to_collect=["y"],
            loop_body_dag={
                "wait": ActionNode(
                    id="wait",
                    type="wait",
                    args={"seconds": 2},
                    children=["transform_2"],
                ),
                "transform_2": ActionNode(
                    id="transform_2",
                    type="transform",
                    result_name="x",
                    args={"value": "{{ my_loop_value }}"},
                    children=[],
                ),
                "transform_3": ActionNode(
                    id="transform_3",
                    type="transform",
                    result_name="y",
                    args={"value": "{{ x }}"},
                    children=[],
                ),
            },
        ),
    },
)


@pytest.mark.asyncio
async def test_missing_edge_between_referencing_nodes(
    store: AdmyralStore, temporal_client: TemporalClient
):
    workflow_id = str(uuid4())
    workflow_name = WORKFLOW_TEST_LOOP_MISSING_EDGE.name + workflow_id

    run, run_steps, exception = await execute_test_workflow(
        store=store,
        temporal_client=temporal_client,
        workflow_id=workflow_id,
        workflow_name=workflow_name,
        workflow_dag=WORKFLOW_TEST_LOOP_MISSING_EDGE,
    )

    assert run.failed_at is not None
    assert (
        run.error
        == "An exception occurred during workflow execution. Error: Invalid access path: x. Variable 'x' not found."
    )
