from typing import Optional, Any
from temporalio import workflow
from dataclasses import dataclass
from datetime import timedelta
from collections import deque, defaultdict
from admyral.utils.collections import is_not_empty
import asyncio
from pydantic import BaseModel, JsonValue
from copy import deepcopy

# Import activity, passing it through the sandbox without reloading the module
with workflow.unsafe.imports_passed_through():
    from admyral.logger import get_logger
    from admyral.models import (
        ActionNode,
        IfNode,
        WorkflowDAG,
        Workflow,
    )
    from admyral.action_registry import ActionRegistry
    from admyral.workers.references import evaluate_references
    from admyral.workers.if_condition_executor import ConditionReferenceResolution


logger = get_logger(__name__)


START_TO_CLOSE_TIMEOUT = timedelta(seconds=60 * 15)  # 15 min


# NOTE: params as objects are strongly encouraged
# see https://docs.temporal.io/develop/python/core-application#workflow-parameters
@dataclass
class WorkflowParams:
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


@workflow.defn(name="WorkflowExecutor")
class WorkflowExecutor:
    @workflow.run
    async def run(self, params: WorkflowParams) -> None:
        workflow_dag = params.workflow.workflow_dag
        in_deg = workflow_dag.get_in_deg()

        # initialize workflow run
        payload = self._inject_default_args(params.payload, params.trigger_default_args)
        workflow_run_id = await workflow.execute_activity(
            "init_workflow_run",
            args=[params.workflow.workflow_id, params.source_name, payload],
            start_to_close_timeout=timedelta(
                seconds=120
            ),  # TODO: choose a timeout here
        )

        logger.info(
            f'Triggering workflow "{params.workflow.workflow_id}" from source "{params.source_name}" with run ID "{workflow_run_id}".'
        )

        # setup states for workflow execution
        execution_state = {"payload": payload}

        eliminated_nodes = set()
        resolved_dependencies = defaultdict(int)
        number_of_executed_actions = 0

        job_queue = asyncio.Queue()
        exception_queue = asyncio.Queue()

        async def task(action_id: str, prev_step_id: str):
            nonlocal number_of_executed_actions
            nonlocal eliminated_nodes
            nonlocal resolved_dependencies

            try:
                node = params.workflow.workflow_dag.dag[action_id]

                # TODO: strong type?
                ctx_dict = {
                    "workflow_id": params.workflow.workflow_id,
                    "run_id": workflow_run_id,
                    "action_type": node.type,
                    "prev_step_id": prev_step_id,
                }

                logger.info(f"Executing action: {action_id}")

                number_of_executed_actions += 1

                # execution
                if isinstance(node, IfNode):
                    step_id, newly_eliminated_nodes = await self._execute_if_condition(
                        node,
                        execution_state,
                        params.workflow.workflow_dag,
                        in_deg,
                        ctx_dict,
                    )
                    eliminated_nodes |= newly_eliminated_nodes
                    candidates = node.true_children + node.false_children
                elif isinstance(node, ActionNode):
                    if node.id != "start":
                        step_id, execution_result = await self._execute_action_node(
                            node, execution_state, ctx_dict
                        )
                        if node.result_name is not None:
                            execution_state[node.result_name] = execution_result
                    else:
                        step_id = None
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
                        await job_queue.put(
                            JobQueueEntry(action_id=child_id, prev_step_id=step_id)
                        )

                # if now all tasks were scheduled, notify main execution loop that we are now done
                if number_of_executed_actions + len(eliminated_nodes) == len(
                    params.workflow.workflow_dag.dag
                ):
                    await job_queue.put(None)

            except Exception as e:
                logger.error(f"Error executing task: {action_id}. Exception: {e}")
                await job_queue.put(None)
                await exception_queue.put(e)

            job_queue.task_done()

        # job trigger loop
        await job_queue.put(JobQueueEntry(action_id="start", prev_step_id=None))

        exception = None
        async with asyncio.TaskGroup() as tg:
            while True:
                job = await job_queue.get()

                # Check for exceptions
                try:
                    exception = exception_queue.get_nowait()
                    # an exception occurred! cancel all active tasks
                    break
                except asyncio.QueueEmpty:
                    pass

                if job is None:
                    break

                # launch new task
                logger.info(
                    f"Scheduling action: {job.action_id}"
                )  # TODO: better log message
                tg.create_task(task(job.action_id, job.prev_step_id))

        if exception:
            raise exception

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
        action_args = {}
        for key, value in node.args.items():
            key = str(
                evaluate_references(key, execution_state)
            )  # keys of JSON objects always must be strings!
            value = evaluate_references(value, execution_state)
            action_args[key] = value

        action_type = node.type

        if action_type not in ActionRegistry.get_action_types():
            # Custom Python action
            return await workflow.execute_activity(
                "execute_python_action",
                args=[
                    ctx_dict,
                    node.secrets_mapping,
                    {"action_type": action_type, "action_args": action_args},
                ],
                start_to_close_timeout=START_TO_CLOSE_TIMEOUT,
            )
        return await workflow.execute_activity(
            action_type,
            args=[ctx_dict, node.secrets_mapping, action_args],
            start_to_close_timeout=START_TO_CLOSE_TIMEOUT,
        )

    async def _execute_if_condition(
        self,
        dag_node: IfNode,
        execution_state: dict,
        workflow_dag: WorkflowDAG,
        in_deg: dict[str, int],
        ctx_dict: dict[str, Any],
    ) -> tuple[str, set[str]]:
        # 1) evaluate if-condition

        # if we perform model_dump directly on the condition, we get a circular reference error for
        # some reason. Doing a model dump on an if-node works fine, though.
        # TODO: we should probably try to fix this in the future because ugly
        dag_node_copy = deepcopy(dag_node)
        dag_node_copy.condition = ConditionReferenceResolution(
            execution_state
        ).resolve_references(dag_node_copy.condition)
        dag_node_copy_json = dag_node_copy.model_dump()
        condition_json = dag_node_copy_json["condition"]

        step_id, condition_result = await workflow.execute_activity(
            "if_condition",
            args=[ctx_dict, {}, {"condition_expr": condition_json}],
            start_to_close_timeout=START_TO_CLOSE_TIMEOUT,
        )

        # 2) path elimination: remove the untaken path from the execution order
        eliminated_nodes = set()
        if condition_result:
            eliminated_nodes |= path_elimination(
                dag_node.false_children, workflow_dag, in_deg
            )
        else:
            eliminated_nodes |= path_elimination(
                dag_node.true_children, workflow_dag, in_deg
            )

        return step_id, eliminated_nodes


def path_elimination(
    node_ids: list[str], workflow_dag: WorkflowDAG, in_deg: dict[str, int]
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
    elminated_nodes = set()

    # BFS traversal for elimination - don't expand nodes with in_deg > 0
    queue = deque(node_ids)
    while is_not_empty(queue):
        current_node_id = queue.popleft()
        elminated_nodes.add(current_node_id)

        # reduce in_deg of children
        node = workflow_dag.dag[current_node_id]
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

    return elminated_nodes
