from collections import deque

from admyral.models import (
    Workflow,
    EditorWorkflowGraph,
    EditorWorkflowActionNode,
    EditorWorkflowIfNode,
    EditorWorkflowStartNode,
    EditorWorkflowEdge,
    IfNode,
    ActionNode,
    LoopNode,
    LoopType,
    WorkflowStart,
    WorkflowDAG,
    WorkflowTriggerType,
    EditorWebhookTrigger,
    EditorScheduleTrigger,
    WorkflowWebhookTrigger,
    WorkflowScheduleTrigger,
    WorkflowDefaultArgument,
    EditorScheduleType,
    EditorWorkflowLoopNode,
    EditorWorkflowEdgeHandle,
)
from admyral.compiler.condition_compiler import compile_condition_str
from admyral.editor.json_with_references_serde import (
    serialize_json_with_reference,
    deserialize_json_with_reference,
)
from admyral.utils.collections import is_empty, is_not_empty
from admyral.utils.graph import is_dag, calculate_in_deg, calculate_out_deg


def workflow_to_editor_workflow_graph(
    workflow: Workflow, webhook_id: str | None, webhook_secret: str | None
) -> EditorWorkflowGraph:
    """
    Transform Workflow to editor workflow graph.

    Args:
        workflow: Workflow to transform.

    Returns:
        editor workflow graph.
    """
    webhook_trigger = None
    schedule_triggers = []
    for trigger in workflow.workflow_dag.start.triggers:
        match trigger.type:
            case WorkflowTriggerType.WEBHOOK:
                if webhook_trigger:
                    raise ValueError("Multiple webhook triggers found.")

                webhook_trigger = EditorWebhookTrigger(
                    webhook_id=webhook_id,
                    webhook_secret=webhook_secret,
                    default_args=[
                        (k, serialize_json_with_reference(v))
                        for k, v in trigger.default_args_dict.items()
                    ],
                )

            case WorkflowTriggerType.SCHEDULE:
                schedule_triggers.append(_build_editor_schedule_trigger(trigger))

            case _:
                raise ValueError(f"Unhandled trigger type: {trigger.type}")

    nodes = []
    edges = []

    def _process_dag(dag: dict[str, IfNode | ActionNode | LoopNode]):
        for node_id, node in dag.items():
            if isinstance(node, IfNode):
                # IF CONDITION NODES
                nodes.append(
                    EditorWorkflowIfNode(
                        id=node_id, condition=node.condition_str, position=node.position
                    )
                )
                for true_child in node.true_children:
                    edges.append(
                        EditorWorkflowEdge(
                            source=node_id,
                            source_handle=EditorWorkflowEdgeHandle.TRUE,
                            target=true_child,
                            target_handle=EditorWorkflowEdgeHandle.TARGET,
                        )
                    )
                for false_child in node.false_children:
                    edges.append(
                        EditorWorkflowEdge(
                            source=node_id,
                            source_handle=EditorWorkflowEdgeHandle.FALSE,
                            target=false_child,
                            target_handle=EditorWorkflowEdgeHandle.TARGET,
                        )
                    )

            elif isinstance(node, LoopNode):
                # LOOP NODES
                nodes.append(
                    EditorWorkflowLoopNode(
                        id=node_id,
                        loop_name=node.loop_name,
                        loop_type=node.loop_type,
                        loop_condition=serialize_json_with_reference(
                            node.loop_condition
                        ),
                        results_to_collect=""
                        if node.results_to_collect is None
                        else ", ".join(node.results_to_collect),
                        position=node.position,
                    )
                )

                for child in node.children:
                    edges.append(
                        EditorWorkflowEdge(
                            source=node_id,
                            source_handle=EditorWorkflowEdgeHandle.SOURCE,
                            target=child,
                            target_handle=EditorWorkflowEdgeHandle.TARGET,
                        )
                    )

                _process_dag(node.loop_body_dag)

                # connect loop start to the subgraph start nodes
                # and subgraph leaves to the loop end
                in_deg = calculate_in_deg(node.loop_body_dag)
                out_deg = calculate_out_deg(node.loop_body_dag)

                for loop_body_node_id in node.loop_body_dag.keys():
                    if in_deg[loop_body_node_id] == 0:
                        edges.append(
                            EditorWorkflowEdge(
                                source=node_id,
                                source_handle=EditorWorkflowEdgeHandle.LOOP_BODY_START,
                                target=loop_body_node_id,
                                target_handle=EditorWorkflowEdgeHandle.TARGET,
                            )
                        )
                    if isinstance(node.loop_body_dag[loop_body_node_id], IfNode):
                        if out_deg[f"{loop_body_node_id}_$$$true$$$"] == 0:
                            edges.append(
                                EditorWorkflowEdge(
                                    source=loop_body_node_id,
                                    source_handle=EditorWorkflowEdgeHandle.TRUE,
                                    target=node_id,
                                    target_handle=EditorWorkflowEdgeHandle.LOOP_BODY_END,
                                )
                            )
                        if out_deg[f"{loop_body_node_id}_$$$false$$$"] == 0:
                            edges.append(
                                EditorWorkflowEdge(
                                    source=loop_body_node_id,
                                    source_handle=EditorWorkflowEdgeHandle.FALSE,
                                    target=node_id,
                                    target_handle=EditorWorkflowEdgeHandle.LOOP_BODY_END,
                                )
                            )
                    else:
                        assert isinstance(
                            node.loop_body_dag[loop_body_node_id], ActionNode
                        )
                        if out_deg[loop_body_node_id] == 0:
                            edges.append(
                                EditorWorkflowEdge(
                                    source=loop_body_node_id,
                                    source_handle=EditorWorkflowEdgeHandle.SOURCE,
                                    target=node_id,
                                    target_handle=EditorWorkflowEdgeHandle.LOOP_BODY_END,
                                )
                            )

            elif node.id == "start":
                # START NODES
                nodes.append(
                    EditorWorkflowStartNode(
                        id=node_id,
                        webhook=webhook_trigger,
                        schedules=schedule_triggers,
                        position=node.position,
                    )
                )
                for child in node.children:
                    edges.append(
                        EditorWorkflowEdge(
                            source=node_id,
                            source_handle=EditorWorkflowEdgeHandle.SOURCE,
                            target=child,
                            target_handle=EditorWorkflowEdgeHandle.TARGET,
                        )
                    )

            else:
                # ACTION NODES
                nodes.append(
                    EditorWorkflowActionNode(
                        id=node_id,
                        action_type=node.type,
                        result_name=node.result_name,
                        secrets_mapping=node.secrets_mapping,
                        args={
                            k: serialize_json_with_reference(v)
                            for k, v in node.args.items()
                        },
                        position=node.position,
                    )
                )
                for child in node.children:
                    edges.append(
                        EditorWorkflowEdge(
                            source=node_id,
                            source_handle=EditorWorkflowEdgeHandle.SOURCE,
                            target=child,
                            target_handle=EditorWorkflowEdgeHandle.TARGET,
                        )
                    )

    _process_dag(workflow.workflow_dag.dag)

    return EditorWorkflowGraph(
        workflow_id=workflow.workflow_id,
        workflow_name=workflow.workflow_name,
        description=workflow.workflow_dag.description,
        controls=workflow.workflow_dag.controls,
        is_active=workflow.is_active,
        nodes=nodes,
        edges=edges,
    )


# TODO: write unit tests
def validate_no_edges_leave_loop(
    adj_list: dict[str, list[str]],
    loop_nodes: set[str],
    node: str,
    loop_stack: list[str],
    loop_assignments: dict[str, str],
) -> None:
    if node in loop_nodes:
        loop_stack.append(node)

    if assignment := loop_assignments.get(node):
        # check assignment
        # - if the loop stack is not empty, then the assignment must be the current loop (top of the stack)
        # - if the loop stack is empty, then the assignment must not be part of a loop
        if (is_not_empty(loop_stack) and loop_stack[-1] != assignment) or (
            is_empty(loop_stack) and assignment != ""
        ):
            raise ValueError("Edges must not leave or enter a loop body.")
    else:
        loop_assignments[node] = "" if is_empty(loop_stack) else loop_stack[-1]

    if node.endswith("_end") and node[: -len("_end")] in loop_nodes:
        loop_stack.pop()

    for child in adj_list[node]:
        validate_no_edges_leave_loop(
            adj_list, loop_nodes, child, loop_stack, loop_assignments
        )


# TODO: write unit tests
def validate_editor_workflow_graph(editor_workflow_graph: EditorWorkflowGraph) -> None:
    # build adjacency list and check for cycles
    # for simplicity, we split the loop nodes into two nodes: the loop start and the loop end
    loop_nodes = set()
    adj_list = {}
    for node in editor_workflow_graph.nodes:
        adj_list[node.id] = []
        if isinstance(node, EditorWorkflowLoopNode):
            loop_nodes.add(node.id)
            adj_list[f"{node.id}_end"] = []

    for edge in editor_workflow_graph.edges:
        # disallow self-loops
        if edge.source == edge.target:
            raise ValueError("Self-loops are not allowed.")

        if edge.target in loop_nodes:
            if edge.target_handle == EditorWorkflowEdgeHandle.LOOP_BODY_END:
                adj_list[edge.source].append(f"{edge.target}_end")
                if len(adj_list[edge.source]) > 1:
                    raise ValueError(
                        "The last node of a loop body must only be connected to the loop end."
                    )
            else:
                adj_list[edge.source].append(edge.target)
        elif edge.source in loop_nodes:
            if edge.target_handle == EditorWorkflowEdgeHandle.LOOP_BODY_START:
                adj_list[edge.source].append(edge.target)
            else:
                adj_list[f"{edge.source}_end"].append(edge.target)
        else:
            adj_list[edge.source].append(edge.target)

    if not is_dag(adj_list, "start"):
        raise ValueError(
            "Cycles are not allowed for workflows. Workflow must be a DAG."
        )

    # check that no node before a loop node connects to a node within the loop body
    # and that no edge leaves a loop body.
    validate_no_edges_leave_loop(adj_list, loop_nodes, "start", [], {})


def editor_workflow_graph_to_workflow(
    editor_workflow_graph: EditorWorkflowGraph,
) -> Workflow:
    """
    Transform editor workflow graph to Workflow.

    Args:
        editor_workflow_graph: Editor workflow graph to transform.

    Returns:
        Workflow.
    """

    validate_editor_workflow_graph(editor_workflow_graph)

    workflow_dag = {}
    triggers = []

    loop_nodes = []
    for node in editor_workflow_graph.nodes:
        if isinstance(node, EditorWorkflowStartNode):
            if node.id in workflow_dag:
                raise ValueError("Multiple start nodes found.")
            workflow_dag[node.id] = ActionNode.build_start_node()
            workflow_dag[node.id].position = node.position

            if node.webhook:
                triggers.append(
                    WorkflowWebhookTrigger(
                        default_args=[
                            WorkflowDefaultArgument(
                                name=k, value=deserialize_json_with_reference(v)
                            )
                            for k, v in node.webhook.default_args
                        ]
                    )
                )

            for schedule in node.schedules:
                triggers.append(_build_workflow_schedule_trigger(schedule))

            continue

        if isinstance(node, EditorWorkflowActionNode):
            workflow_dag[node.id] = ActionNode(
                id=node.id,
                type=node.action_type,
                result_name=node.result_name if node.result_name else None,
                secrets_mapping=node.secrets_mapping,
                args={
                    k: deserialize_json_with_reference(v) for k, v in node.args.items()
                },
                position=node.position,
            )
            continue

        if isinstance(node, EditorWorkflowIfNode):
            workflow_dag[node.id] = IfNode(
                id=node.id,
                condition=compile_condition_str(node.condition),
                condition_str=node.condition,
                position=node.position,
            )
            continue

        if isinstance(node, EditorWorkflowLoopNode):
            if node.loop_type == LoopType.COUNT:
                try:
                    node.loop_condition = int(node.loop_condition, 10)
                except ValueError:
                    raise ValueError("Loop count must be an integer.")
                if node.loop_condition < 0:
                    raise ValueError("Loop count must not be negative.")

            results_to_collect = None
            if node.results_to_collect:
                results_to_collect = [
                    result_name.strip()
                    for result_name in node.results_to_collect.split(",")
                ]

            workflow_dag[node.id] = LoopNode(
                id=node.id,
                loop_name=node.loop_name,
                loop_type=node.loop_type,
                loop_condition=deserialize_json_with_reference(node.loop_condition),
                loop_body_dag={},
                results_to_collect=results_to_collect,
                position=node.position,
            )
            loop_nodes.append(node.id)
            continue

    loop_body_starts = set()

    for edge in editor_workflow_graph.edges:
        if edge.source_handle == EditorWorkflowEdgeHandle.LOOP_BODY_START:
            loop_body_starts.add(edge.target)

        if isinstance(workflow_dag[edge.source], IfNode):
            if edge.source_handle == EditorWorkflowEdgeHandle.TRUE:
                workflow_dag[edge.source].true_children.append(edge.target)
            else:
                workflow_dag[edge.source].false_children.append(edge.target)
        else:
            workflow_dag[edge.source].children.append(edge.target)

    # Algorithm idea:
    # perform DFS => if we hit a loop node, then continue exploration until we hit the end of the loop
    # if we hit another loop node on the way, then we have a nested loop which we need to collapse first
    def extract_loop_bodies(
        dag: dict[str, IfNode | ActionNode | LoopNode], node_id: str
    ) -> None:
        node = workflow_dag[node_id]

        if isinstance(node, LoopNode) and is_empty(node.loop_body_dag):
            # Extract loop body

            loop_body_dag = {}
            queue = deque(
                child_id for child_id in node.children if child_id in loop_body_starts
            )

            # remove all nodes from the dag that are part of the loop body
            # and move them into loop_body_dag
            while queue:
                loop_body_node_id = queue.popleft()

                # if we hit another loop node first, then we need to extract its loop body first
                if isinstance(dag[loop_body_node_id], LoopNode):
                    extract_loop_bodies(workflow_dag, loop_body_node_id)

                loop_body_node = dag.pop(loop_body_node_id)

                # process the children of the node within the loop body
                children = []
                for loop_body_child_id in loop_body_node.children:
                    if loop_body_child_id == node_id:
                        # found a loop end => skip
                        continue

                    if loop_body_child_id not in loop_body_dag:
                        queue.append(loop_body_child_id)
                        loop_body_dag[loop_body_child_id] = dag[loop_body_child_id]

                    children.append(loop_body_child_id)

                loop_body_node.children = children
                loop_body_dag[loop_body_node_id] = loop_body_node

            node.children = [
                child_id
                for child_id in node.children
                if child_id not in loop_body_starts
            ]
            node.loop_body_dag = loop_body_dag

        # filter out the loop nodes
        node_children = (
            node.true_children + node.false_children
            if isinstance(node, IfNode)
            else node.children
        )
        for child in node_children:
            extract_loop_bodies(workflow_dag, child)

    extract_loop_bodies(workflow_dag, "start")

    return Workflow(
        workflow_id=editor_workflow_graph.workflow_id,
        workflow_name=editor_workflow_graph.workflow_name,
        is_active=editor_workflow_graph.is_active,
        workflow_dag=WorkflowDAG(
            name=editor_workflow_graph.workflow_name,
            description=editor_workflow_graph.description,
            controls=editor_workflow_graph.controls,
            start=WorkflowStart(triggers=triggers),
            dag=workflow_dag,
        ),
    )


def _build_editor_schedule_trigger(
    trigger: WorkflowScheduleTrigger,
) -> EditorScheduleTrigger:
    """
    Build editor schedule trigger.

    Args:
        trigger: Workflow schedule trigger.

    Returns:
        Editor schedule trigger.
    """
    default_args = [
        (arg.name, serialize_json_with_reference(arg.value))
        for arg in trigger.default_args
    ]

    if trigger.cron:
        return EditorScheduleTrigger(
            schedule_type=EditorScheduleType.CRON,
            value=trigger.cron,
            default_args=default_args,
        )

    if trigger.interval_seconds:
        return EditorScheduleTrigger(
            schedule_type=EditorScheduleType.INTERVAL_SECONDS,
            value=str(trigger.interval_seconds),
            default_args=default_args,
        )

    if trigger.interval_minutes:
        return EditorScheduleTrigger(
            schedule_type=EditorScheduleType.INTERVAL_MINUTES,
            value=str(trigger.interval_minutes),
            default_args=default_args,
        )

    if trigger.interval_hours:
        return EditorScheduleTrigger(
            schedule_type=EditorScheduleType.INTERVAL_HOURS,
            value=str(trigger.interval_hours),
            default_args=default_args,
        )

    if trigger.interval_days:
        return EditorScheduleTrigger(
            schedule_type=EditorScheduleType.INTERVAL_DAYS,
            value=str(trigger.interval_days),
            default_args=default_args,
        )

    raise ValueError("Unhandled schedule trigger.")


def _build_workflow_schedule_trigger(
    trigger: EditorScheduleTrigger,
) -> WorkflowScheduleTrigger:
    """
    Build workflow schedule trigger.

    Args:
        trigger: Editor schedule trigger.

    Returns:
        Workflow schedule trigger.
    """
    default_args = [
        WorkflowDefaultArgument(name=k, value=deserialize_json_with_reference(v))
        for k, v in trigger.default_args
    ]

    match trigger.schedule_type:
        case EditorScheduleType.CRON:
            return WorkflowScheduleTrigger(
                cron=trigger.value, default_args=default_args
            )

        case EditorScheduleType.INTERVAL_SECONDS:
            return WorkflowScheduleTrigger(
                interval_seconds=int(trigger.value), default_args=default_args
            )

        case EditorScheduleType.INTERVAL_MINUTES:
            return WorkflowScheduleTrigger(
                interval_minutes=int(trigger.value), default_args=default_args
            )

        case EditorScheduleType.INTERVAL_HOURS:
            return WorkflowScheduleTrigger(
                interval_hours=int(trigger.value), default_args=default_args
            )

        case EditorScheduleType.INTERVAL_DAYS:
            return WorkflowScheduleTrigger(
                interval_days=int(trigger.value), default_args=default_args
            )

        case _:
            raise ValueError("Unhandled schedule type.")
