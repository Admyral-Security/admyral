from typing import Literal
from pydantic import BaseModel
from enum import Enum

from admyral.models.action import ActionMetadata
from admyral.models.workflow import LoopType


########################################################
# Editor Actions
########################################################


class ActionNamespace(BaseModel):
    namespace: str
    actions: list[ActionMetadata]


class EditorActions(BaseModel):
    namespaces: list[ActionNamespace]


########################################################
# Editor Workflow Graph
########################################################


class EditorWorkflowBaseNode(BaseModel):
    id: str
    type: str
    """ Node Type """
    action_type: str
    """ Action Type """
    position: tuple[float, float] | None = None


class EditorWebhookTrigger(BaseModel):
    webhook_id: str | None
    webhook_secret: str | None
    default_args: list[tuple[str, str]]


class EditorScheduleType(str, Enum):
    CRON = "Cron"
    INTERVAL_SECONDS = "Interval Seconds"
    INTERVAL_MINUTES = "Interval Minutes"
    INTERVAL_HOURS = "Interval Hours"
    INTERVAL_DAYS = "Interval Days"


class EditorScheduleTrigger(BaseModel):
    schedule_type: EditorScheduleType
    value: str
    default_args: list[tuple[str, str]]


class EditorWorkflowStartNode(EditorWorkflowBaseNode):
    type: Literal["start"] = "start"
    action_type: Literal["start"] = "start"

    webhook: EditorWebhookTrigger | None
    schedules: list[EditorScheduleTrigger]


class EditorWorkflowActionNode(EditorWorkflowBaseNode):
    type: Literal["action"] = "action"
    result_name: str | None
    secrets_mapping: dict[str, str]
    args: dict[str, str]


class EditorWorkflowLoopNode(EditorWorkflowBaseNode):
    type: Literal["loop"] = "loop"
    action_type: Literal["loop"] = "loop"

    loop_name: str
    loop_type: LoopType
    loop_condition: str | int
    results_to_collect: str


class EditorWorkflowIfNode(EditorWorkflowBaseNode):
    type: Literal["if_condition"] = "if_condition"
    action_type: Literal["if_condition"] = "if_condition"
    condition: str


type EditorWorkflowNode = (
    EditorWorkflowStartNode
    | EditorWorkflowActionNode
    | EditorWorkflowIfNode
    | EditorWorkflowLoopNode
)


class EditorWorkflowEdgeHandle(str, Enum):
    SOURCE = "source"
    TARGET = "target"
    TRUE = "true"
    FALSE = "false"
    LOOP_BODY_START = "loop_body_start"
    LOOP_BODY_END = "loop_body_end"


class EditorWorkflowEdge(BaseModel):
    source: str
    source_handle: EditorWorkflowEdgeHandle
    target: str
    target_handle: EditorWorkflowEdgeHandle


class EditorWorkflowGraph(BaseModel):
    workflow_id: str
    workflow_name: str
    description: str | None
    controls: list[str] | None
    is_active: bool
    nodes: list[EditorWorkflowNode]
    edges: list[EditorWorkflowEdge]
