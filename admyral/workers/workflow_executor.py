from typing import Optional, Any
from temporalio import workflow
from temporalio.common import RetryPolicy
from temporalio.exceptions import ActivityError
from dataclasses import dataclass
from datetime import timedelta
from collections import deque, defaultdict
from admyral.utils.collections import is_not_empty
import asyncio
from pydantic import BaseModel, JsonValue
from copy import deepcopy

# Import activity, passing it through the sandbox without reloading the module
with workflow.unsafe.imports_passed_through():
    from admyral.exceptions import AdmyralFailureError
    from admyral.logger import get_logger
    from admyral.models import (
        ActionNode,
        IfNode,
        Workflow,
        LoopNode,
        LoopType,
    )
    from admyral.action_registry import ActionRegistry
    from admyral.workers.references import evaluate_references
    from admyral.workers.if_condition_executor import ConditionReferenceResolution
    from admyral.utils.collections import is_not_empty
    from admyral.utils.memory import count_json_payload_bytes
    from admyral.config.config import TEMPORAL_PAYLOAD_LIMIT
    from admyral.utils.graph import calculate_in_deg


logger = get_logger(__name__)


START_TO_CLOSE_TIMEOUT = timedelta(seconds=6 * 60 * 60)  # 6 hours
ACTION_RETRY_POLICY = RetryPolicy(
    maximum_attempts=3,
    non_retryable_error_types=["NonRetryableActionError"],
)


# NOTE: params as objects are strongly encouraged
# see https://docs.temporal.io/develop/python/core-application#workflow-parameters
@dataclass
class WorkflowParams:
    user_id: str
    workflow: Workflow
    source_name: str
    payload: dict[str, Any]
    trigger_default_args: dict[str, Any]


class JobQueueEntry(BaseModel):
    action_id: str
    prev_step_id: Optional[str] = None


# Workflow code requirements:
# - no threading
# - no randomness
# - no external calls to processes
# - no network I/O
# - no global state mutation
# - no system date or time
#
# run methods only accept positional parameters


async def _execute_activity(action_type: str, args: list[JsonValue]) -> JsonValue:
    # Use Temporal's default converter
    size_bytes = count_json_payload_bytes(args)
    logger.info(f"Activity {action_type} args size: {size_bytes} bytes")

    if size_bytes > TEMPORAL_PAYLOAD_LIMIT:
        raise AdmyralFailureError("Input payload too large.")

    try:
        return await workflow.execute_activity(
            action_type,
            args=args,
            start_to_close_timeout=START_TO_CLOSE_TIMEOUT,
            retry_policy=ACTION_RETRY_POLICY,
        )
    except ActivityError as e:
        logger.error(
            f"Error executing activity of type {action_type}: {e.message}. Cause: {e.cause}"
        )
        raise e


async def _execute_action(
    action_type: str, args: list[JsonValue], error_args: list[JsonValue]
) -> JsonValue:
    try:
        return await _execute_activity(action_type, args)
    except AdmyralFailureError as e:
        if e.message == "Input payload too large.":
            await _execute_activity("store_action_input_too_large_error", error_args)
        raise e


async def _store_reference_resolution_error(
    ctx_dict: dict[str, Any], error: str
) -> None:
    await _execute_activity(
        "store_reference_resolution_error",
        args=[
            ctx_dict["run_id"],
            ctx_dict["prev_step_id"],
            ctx_dict["action_type"],
            f"Failed to evaluate reference. {error}",
        ],
    )


@workflow.defn(name="WorkflowExecutor")
class WorkflowExecutor:
    @workflow.run
    async def run(self, params: WorkflowParams) -> None:
        workflow_dag = params.workflow.workflow_dag

        # initialize workflow run
        payload = self._inject_default_args(params.payload, params.trigger_default_args)

        init_workflow_run_result = await _execute_activity(
            "init_workflow_run",
            args=[params.workflow.workflow_id, params.source_name, payload],
        )
        workflow_run_id, start_step_id = (
            init_workflow_run_result["run_id"],
            init_workflow_run_result["step_id"],
        )

        logger.info(
            f'Triggering workflow "{params.workflow.workflow_id}" from source "{params.source_name}" with run ID "{workflow_run_id}".'
        )

        # setup states for workflow execution
        execution_state = {"payload": payload}

        async def execution_loop(
            dag: dict[str, ActionNode | IfNode | LoopNode],
            execution_state: dict,
            prev_step_id: str | None = None,
            is_loop_body: bool = False,
        ) -> dict[str, JsonValue]:
            # calculate in_deg for current top-level DAG
            in_deg = calculate_in_deg(dag)

            # determine start nodes
            if is_loop_body:
                start_node_ids = [
                    node_id for node_id in dag.keys() if in_deg[node_id] == 0
                ]
                if len(start_node_ids) != 1:
                    raise ValueError("Workflow must have exactly one start node.")
            else:
                start_node_ids = ["start"]

            eliminated_nodes = set()
            resolved_dependencies = defaultdict(int)

            number_of_running_tasks = 0

            job_queue = asyncio.Queue()
            job_queue_length = 0

            async def push_job(job: JobQueueEntry | None) -> None:
                nonlocal job_queue_length
                job_queue_length += 1
                await job_queue.put(job)

            exception_queue = asyncio.Queue()

            async def task(action_id: str, prev_step_id: str) -> None:
                nonlocal number_of_running_tasks
                nonlocal eliminated_nodes
                nonlocal resolved_dependencies

                try:
                    node = dag[action_id]

                    # TODO: strong type?
                    ctx_dict = {
                        "user_id": params.user_id,
                        "workflow_id": params.workflow.workflow_id,
                        "run_id": workflow_run_id,
                        "action_type": node.type,
                        "prev_step_id": prev_step_id,
                    }

                    logger.info(f"Executing action: {action_id}")

                    # execution
                    if isinstance(node, IfNode):
                        (
                            step_id,
                            newly_eliminated_nodes,
                        ) = await self._execute_if_condition(
                            node,
                            execution_state,
                            dag,
                            in_deg,
                            ctx_dict,
                        )
                        eliminated_nodes |= newly_eliminated_nodes
                        candidates = node.true_children + node.false_children

                    elif isinstance(node, ActionNode):
                        if node.id != "start":
                            if node.type == "wait":
                                await asyncio.sleep(node.args.get("seconds", 0))

                            step_id, execution_result = await self._execute_action_node(
                                node, execution_state, ctx_dict
                            )
                            if node.result_name is not None:
                                execution_state[node.result_name] = execution_result
                        else:
                            # start node
                            step_id = start_step_id
                        candidates = node.children

                    elif isinstance(node, LoopNode):
                        aggregated_result = []

                        # initialize loop state
                        step_id = await _execute_activity(
                            "init_loop_action",
                            args=[
                                workflow_run_id,
                                prev_step_id,
                                node.loop_name,
                                node.loop_condition,
                                node.loop_type.value,
                            ],
                        )

                        match node.loop_type:
                            case LoopType.LIST | LoopType.COUNT:
                                loop_condition = evaluate_references(
                                    node.loop_condition, execution_state
                                )

                                if node.loop_type == LoopType.LIST and not isinstance(
                                    loop_condition, list
                                ):
                                    raise ValueError(
                                        "Loop list parameter must be a list."
                                    )

                                if node.loop_type == LoopType.COUNT and not isinstance(
                                    loop_condition, int
                                ):
                                    raise ValueError("Loop count must be an integer.")

                                if node.loop_type == LoopType.LIST:
                                    iter_values = loop_condition
                                else:
                                    assert node.loop_type == LoopType.COUNT
                                    iter_values = range(loop_condition)

                                for value in iter_values:
                                    loop_body_execution_state = deepcopy(
                                        execution_state
                                    )
                                    loop_body_execution_state[
                                        f"{node.loop_name}_value"
                                    ] = value

                                    loop_iter_execution_state = await execution_loop(
                                        node.loop_body_dag,
                                        loop_body_execution_state,
                                        prev_step_id=step_id,
                                        is_loop_body=True,
                                    )

                                    # aggregate results from iteration
                                    if node.results_to_collect:
                                        if len(node.results_to_collect) == 1:
                                            aggregated_result.append(
                                                loop_iter_execution_state[
                                                    node.results_to_collect[0]
                                                ]
                                            )
                                        else:
                                            aggregated_result.append(
                                                {
                                                    result_name: loop_iter_execution_state.get(
                                                        result_name
                                                    )
                                                    for result_name in node.results_to_collect
                                                }
                                            )
                                    else:
                                        aggregated_result.append(
                                            loop_iter_execution_state
                                        )

                            case LoopType.CONDITION:
                                raise ValueError(
                                    "Condition loop type is not yet available."
                                )

                        execution_state[node.loop_name] = aggregated_result
                        candidates = node.children

                    else:
                        raise RuntimeError(f"Invalid node type: {type(node)}")

                    # schedule next actions
                    for child_id in candidates:
                        # mark the current node as resolved for each child
                        resolved_dependencies[child_id] += 1
                        # we only schedule a child if all its dependencies (i.e., its parents) are resolved
                        if (
                            child_id not in eliminated_nodes
                            and resolved_dependencies[child_id] == in_deg[child_id]
                        ):
                            await push_job(
                                JobQueueEntry(action_id=child_id, prev_step_id=step_id)
                            )

                except Exception as e:
                    logger.error(f"Error executing task: {action_id}. Exception: {e}")
                    await push_job(None)
                    await exception_queue.put(e)

                finally:
                    number_of_running_tasks -= 1
                    if job_queue_length == 0:
                        await push_job(None)

                    job_queue.task_done()

            # job trigger loop
            for node_id in start_node_ids:
                await push_job(
                    JobQueueEntry(action_id=node_id, prev_step_id=prev_step_id)
                )

            exception = None
            async with asyncio.TaskGroup() as tg:
                # we run the scheduling loop until all tasks are completed and no
                # more task needs to be executed.
                while job_queue_length > 0 or number_of_running_tasks > 0:
                    job = await job_queue.get()
                    job_queue_length -= 1

                    # Check for exceptions
                    try:
                        exception = exception_queue.get_nowait()
                        # an exception occurred! we stop the scheduling loop
                        # but we let the currently running tasks complete
                        break
                    except asyncio.QueueEmpty:
                        pass

                    if job is None:
                        continue

                    # launch new task
                    logger.info(
                        f"Scheduling action: {job.action_id}"
                    )  # TODO: better log message
                    number_of_running_tasks += 1
                    tg.create_task(task(job.action_id, job.prev_step_id))

            if exception:
                raise AdmyralFailureError(
                    f"An exception occurred during workflow execution. Error: {str(exception)}"
                )

            return execution_state

        try:
            await execution_loop(workflow_dag.dag, execution_state)
        except Exception as e:
            logger.error(
                f"An exception occurred during workflow execution. Error: {str(e)}"
            )
            return

        await _execute_activity("mark_workflow_as_completed", args=[workflow_run_id])

        logger.info(
            f'Workflow execution of workflow "{params.workflow.workflow_id}" with run ID "{workflow_run_id}" completed successfully.'
        )

    def _inject_default_args(
        self,
        payload: dict[str, JsonValue],
        trigger_default_args: dict[str, JsonValue],
    ) -> dict[str, JsonValue]:
        # We have the following value priority:
        # 1. Value in payload
        # 2. Default value in trigger (already handled before, i.e., during scheduling or on API server-side for webhooks)

        # handle trigger default args
        for arg_name, arg_value in trigger_default_args.items():
            if arg_name not in payload:
                payload[arg_name] = arg_value

        return payload

    async def _execute_action_node(
        self, node: ActionNode, execution_state: dict, ctx_dict: dict[str, Any]
    ) -> tuple[str, Any]:
        # evaluate the references of the action arguments
        try:
            action_args = {}
            for key, value in node.args.items():
                key = str(
                    evaluate_references(key, execution_state)
                )  # keys of JSON objects always must be strings!
                value = evaluate_references(value, execution_state)
                action_args[key] = value
        except AdmyralFailureError as e:
            await _store_reference_resolution_error(ctx_dict, e.message)
            raise e

        action_type = node.type

        action = ActionRegistry.get_or_none(action_type)
        if not action:
            # Custom Python action
            # Note: we filter the action_args in execute_python_action
            # because first need to fetch the custom action.
            return await _execute_action(
                "execute_python_action",
                args=[
                    ctx_dict,
                    node.secrets_mapping,
                    {"action_type": action_type, "action_args": action_args},
                ],
                error_args=[ctx_dict["run_id"], action_type, ctx_dict["prev_step_id"]],
            )

        # filter action_args based on action arguments
        # Why filter action_args? Because an action might have been updated,
        # i.e., an argument might have been removed. This would cause the
        # function call to fail. Hence, we filter the arguments to only include
        # the ones that are actually defined by the action.
        defined_args = set(map(lambda arg: arg.arg_name, action.arguments))
        action_args = {k: v for k, v in action_args.items() if k in defined_args}

        return await _execute_action(
            action_type,
            args=[ctx_dict, node.secrets_mapping, action_args],
            error_args=[ctx_dict["run_id"], action_type, ctx_dict["prev_step_id"]],
        )

    async def _execute_if_condition(
        self,
        dag_node: IfNode,
        execution_state: dict,
        dag: dict[str, ActionNode | IfNode | LoopNode],
        in_deg: dict[str, int],
        ctx_dict: dict[str, Any],
    ) -> tuple[str, set[str]]:
        # 1) evaluate if-condition

        # if we perform model_dump directly on the condition, we get a circular reference error for
        # some reason. Doing a model dump on an if-node works fine, though.
        # TODO: we should probably try to fix this in the future because ugly
        dag_node_copy = deepcopy(dag_node)

        try:
            dag_node_copy.condition = ConditionReferenceResolution(
                execution_state
            ).resolve_references(dag_node_copy.condition)
        except AdmyralFailureError as e:
            await _store_reference_resolution_error(ctx_dict, e.message)
            raise e

        dag_node_copy_json = dag_node_copy.model_dump()
        condition_json = dag_node_copy_json["condition"]

        step_id, condition_result = await _execute_action(
            "if_condition",
            args=[ctx_dict, {}, {"condition_expr": condition_json}],
            error_args=[ctx_dict["run_id"], "if_condition", ctx_dict["prev_step_id"]],
        )

        # 2) path elimination: remove the untaken path from the execution order
        eliminated_nodes = set()
        if condition_result:
            eliminated_nodes |= path_elimination(dag_node.false_children, dag, in_deg)
        else:
            eliminated_nodes |= path_elimination(dag_node.true_children, dag, in_deg)

        return step_id, eliminated_nodes


def path_elimination(
    node_ids: list[str],
    dag: dict[str, ActionNode | IfNode | LoopNode],
    in_deg: dict[str, int],
) -> set[str]:
    """
    Path Elimination for if-conditions.

    Consider the following DAG:

              ...
              ||
            if cond
          //        \\
    action1          action2
          \\        //
            action3
              ||
              ...

    In our execution model, we execute an action if all its dependencies are resolved, i.e.,
    incoming degree is 0. Therefore, we must reduce the incoming degree of action3 in order to
    be able to execute it. This is done by eliminating the path that is not taken by the if-condition.
    """
    eliminated_nodes = set()

    # BFS traversal for elimination - don't expand nodes with in_deg > 0
    queue = deque(node_ids)
    while is_not_empty(queue):
        current_node_id = queue.popleft()
        eliminated_nodes.add(current_node_id)

        # reduce in_deg of children
        node = dag[current_node_id]
        if isinstance(node, IfNode):
            for child_id in node.true_children:
                in_deg[child_id] -= 1
                # remove child if it does not have a dependency anymore (i.e., in_deg == 0)
                if in_deg[child_id] == 0:
                    queue.append(child_id)
            for child_id in node.false_children:
                in_deg[child_id] -= 1
                # remove child if it does not have a dependency anymore (i.e., in_deg == 0)
                if in_deg[child_id] == 0:
                    queue.append(child_id)
        else:
            for child_id in node.children:
                in_deg[child_id] -= 1
                # remove child if it does not have a dependency anymore (i.e., in_deg == 0)
                if in_deg[child_id] == 0:
                    queue.append(child_id)

    return eliminated_nodes
