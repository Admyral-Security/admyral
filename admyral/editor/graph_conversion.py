from admyral.models import (
    Workflow,
    EditorWorkflowGraph,
    EditorWorkflowActionNode,
    EditorWorkflowIfNode,
    EditorWorkflowStartNode,
    EditorWorkflowEdge,
    EditorWorkflowEdgeType,
    IfNode,
    ActionNode,
    WorkflowStart,
    WorkflowDAG,
    WorkflowTriggerType,
    EditorWebhookTrigger,
    EditorScheduleTrigger,
    WorkflowWebhookTrigger,
    WorkflowScheduleTrigger,
    WorkflowDefaultArgument,
    EditorScheduleType,
)
from admyral.compiler.condition_compiler import compile_condition_str
from admyral.editor.json_with_references_serde import (
    serialize_json_with_reference,
    deserialize_json_with_reference,
)


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

    for node_id, node in workflow.workflow_dag.dag.items():
        if isinstance(node, IfNode):
            # IF CONDITION NODES
            nodes.append(EditorWorkflowIfNode(id=node_id, condition=node.condition_str))
            for true_child in node.true_children:
                edges.append(
                    EditorWorkflowEdge(
                        source=node_id,
                        target=true_child,
                        type=EditorWorkflowEdgeType.TRUE,
                    )
                )
            for false_child in node.false_children:
                edges.append(
                    EditorWorkflowEdge(
                        source=node_id,
                        target=false_child,
                        type=EditorWorkflowEdgeType.FALSE,
                    )
                )
        elif node.id == "start":
            # START NODES
            nodes.append(
                EditorWorkflowStartNode(
                    id=node_id, webhook=webhook_trigger, schedules=schedule_triggers
                )
            )
            for child in node.children:
                edges.append(
                    EditorWorkflowEdge(
                        source=node_id,
                        target=child,
                        type=EditorWorkflowEdgeType.DEFAULT,
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
                )
            )
            for child in node.children:
                edges.append(
                    EditorWorkflowEdge(
                        source=node_id,
                        target=child,
                        type=EditorWorkflowEdgeType.DEFAULT,
                    )
                )

    return EditorWorkflowGraph(
        workflow_id=workflow.workflow_id,
        workflow_name=workflow.workflow_name,
        description=workflow.workflow_dag.description,
        is_active=workflow.is_active,
        nodes=nodes,
        edges=edges,
    )


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
    workflow_dag = {}
    triggers = []

    for node in editor_workflow_graph.nodes:
        if isinstance(node, EditorWorkflowStartNode):
            if node.id in workflow_dag:
                raise ValueError("Multiple start nodes found.")
            workflow_dag[node.id] = ActionNode.build_start_node()

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
                result_name=node.result_name,
                secrets_mapping=node.secrets_mapping,
                args={
                    k: deserialize_json_with_reference(v) for k, v in node.args.items()
                },
            )
            continue

        if isinstance(node, EditorWorkflowIfNode):
            workflow_dag[node.id] = IfNode(
                id=node.id,
                condition=compile_condition_str(node.condition),
                condition_str=node.condition,
            )
            continue

    for edge in editor_workflow_graph.edges:
        match edge.type:
            case EditorWorkflowEdgeType.DEFAULT:
                workflow_dag[edge.source].add_edge(edge.target)
            case EditorWorkflowEdgeType.TRUE:
                workflow_dag[edge.source].add_true_edge(edge.target)
            case EditorWorkflowEdgeType.FALSE:
                workflow_dag[edge.source].add_false_edge(edge.target)

    return Workflow(
        workflow_id=editor_workflow_graph.workflow_id,
        workflow_name=editor_workflow_graph.workflow_name,
        is_active=editor_workflow_graph.is_active,
        workflow_dag=WorkflowDAG(
            name=editor_workflow_graph.workflow_name,
            description=editor_workflow_graph.description,
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
