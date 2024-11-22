import yaml
import re

from admyral.models import WorkflowDAG, WorkflowTriggerType, ActionNode
from admyral.action_registry import ActionRegistry
from admyral.db.store_interface import StoreInterface


SNAKE_CASE_REGEX = re.compile(r"^[a-z]+(_[a-z]+)*$")
VALID_WORKFLOW_NAME_REGEX = re.compile(r"^[a-zA-Z][a-zA-Z0-9 _]*$")


def has_cycle(workflow: WorkflowDAG) -> bool:
    def dfs(node_id: str, visited: set[str]) -> bool:
        if node_id in visited:
            return True
        visited.add(node_id)
        node = workflow.dag[node_id]
        children = (
            node.children
            if isinstance(node, ActionNode)
            else node.true_children + node.false_children
        )
        for child_id in children:
            if dfs(child_id, visited):
                return True
        visited.remove(node_id)
        return False

    return dfs("start", set())


async def validate_workflow(
    user_id: str, db: StoreInterface, workflow: WorkflowDAG
) -> None:
    if workflow.version != "1":
        raise ValueError("Valid workflow schema versions: 1.")

    if not VALID_WORKFLOW_NAME_REGEX.match(workflow.name):
        raise ValueError(
            "Invalid workflow name. Workflow names must start with a letter and can only contain alphanumeric characters, underscores, and spaces.",
        )

    # verify that only one webhook trigger is present
    if (
        len(
            [
                trigger
                for trigger in workflow.start.triggers
                if trigger.type == WorkflowTriggerType.WEBHOOK
            ]
        )
        > 1
    ):
        raise ValueError("At most one webhook trigger is allowed.")

    # validate schedule triggers: only one of cron, interval_seconds, interval_minutes, interval_hours, interval_days is set
    if any(
        len(
            list(
                filter(
                    lambda x: x is not None,
                    [
                        trigger.cron,
                        trigger.interval_seconds,
                        trigger.interval_minutes,
                        trigger.interval_hours,
                        trigger.interval_days,
                    ],
                )
            )
        )
        > 1
        for trigger in workflow.start.triggers
        if trigger.type == WorkflowTriggerType.SCHEDULE
    ):
        raise ValueError(
            "At most one schedule type (cron, interval seconds, etc.) per schedule trigger is allowed."
        )

    # workflow must have exactly one start node
    start_nodes = [node for node in workflow.dag.values() if node.type == "start"]
    if len(start_nodes) != 1:
        raise ValueError("There must be exactly one start node.")
    if start_nodes[0].id != "start":
        raise ValueError("The start node must have id 'start'.")
    if start_nodes[0].result_name != "payload":
        raise ValueError("The start node must have result_name 'payload'.")

    # result name must be in snake case
    if not all(
        node.result_name is None
        or node.result_name == ""
        or SNAKE_CASE_REGEX.match(node.result_name)
        for node in workflow.dag.values()
        if isinstance(node, ActionNode)
    ):
        raise ValueError(
            "If a result name is provided, then the result name must be in snake_case."
        )

    # check all node IDs are unique
    node_id_and_dag_key_mismatches = [
        (dag_key, node.id)
        for (dag_key, node) in workflow.dag.items()
        if dag_key != node.id
    ]
    if len(node_id_and_dag_key_mismatches) > 0:
        raise ValueError(
            f"The following node IDs do not match their DAG keys: {node_id_and_dag_key_mismatches}"
        )

    # check that all children are valid node IDs
    for node in workflow.dag.values():
        children = (
            node.children
            if isinstance(node, ActionNode)
            else node.true_children + node.false_children
        )
        for child_id in children:
            # start node must not have incoming edges
            if child_id == "start":
                raise ValueError("Start node cannot be a child of any node.")
            if child_id not in workflow.dag:
                raise ValueError(f"Child node ID '{child_id}' not found.")

    # check whether the action types are valid
    for node in workflow.dag.values():
        if node.type == "start" or node.type == "if_condition":
            continue

        # check action registry
        if ActionRegistry.is_registered(node.type):
            continue

        # check database for custom actions
        if await db.get_action(user_id, node.type):
            continue

        raise ValueError(f"Invalid action '{node.type}'.")

    # check for cycles
    if has_cycle(workflow):
        raise ValueError("Cycles are not allowed for workflows.")


def compile_from_yaml_workflow(yaml_workflow_str: str) -> WorkflowDAG:
    yaml_workflow_dict = yaml.safe_load(yaml_workflow_str)
    return WorkflowDAG.model_validate(yaml_workflow_dict)


def decompile_workflow_to_yaml(workflow_dag: WorkflowDAG) -> str:
    return yaml.dump(workflow_dag.model_dump(mode="json"))
