from typing import Optional, Literal
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime

from admyral.typings import JsonValue
from admyral.models.condition import Condition


class NodeBase(BaseModel):
    id: str
    """ Unique ID of the node used for building edges. """
    type: str
    """ The type of the node. """
    position: tuple[float, float] | None = None


class ActionNode(NodeBase):
    result_name: Optional[str] = None
    args: dict[str, JsonValue] = {}
    """ The arguments of the action. Either a reference or a JSON-serialized constant. """
    secrets_mapping: dict[str, str] = {}
    """ The mapping of secret placeholders to secret IDs. """
    children: list[str] = []

    def __str__(self) -> str:
        return f"ActionNode(id={self.id}, type={self.type}, result_name={self.result_name}, args={self.args}, secrets_mapping={self.secrets_mapping}, children={self.children})"

    def __eq__(self, value: object) -> bool:
        if not isinstance(value, ActionNode):
            return False
        return (
            self.id == value.id
            and self.type == value.type
            and self.result_name == value.result_name
            and self.args == value.args
            and self.children == value.children
        )

    @classmethod
    def build_start_node(cls) -> "ActionNode":
        return cls(id="start", type="start", result_name="payload")


class IfNode(NodeBase):
    type: Literal["if_condition"] = "if_condition"
    condition: Condition = Field(..., discriminator="type")
    condition_str: str

    true_children: list[str] = []
    false_children: list[str] = []

    def __str__(self) -> str:
        return f"IfNode(id={self.id}, type={self.type}, condition={self.condition}, true_children={self.true_children}, false_children={self.false_children})"

    def __eq__(self, value: object) -> bool:
        if not isinstance(value, IfNode):
            return False
        return (
            self.id == value.id
            and self.type == value.type
            and self.condition == value.condition
            and self.true_children == value.true_children
            and self.false_children == value.false_children
        )


class LoopType(str, Enum):
    LIST = "list"
    COUNT = "count"
    CONDITION = "condition"


class LoopNode(NodeBase):
    type: Literal["loop"] = "loop"
    # loop_body is a sub-workflow
    loop_body_dag: "dict[str, IfNode | ActionNode | LoopNode]"
    # loop_name must be snake_case
    loop_name: str
    loop_type: LoopType
    loop_condition: JsonValue
    results_to_collect: list[str] | None = None

    # children are the edges that leave the loop
    children: list[str] = []


class WorkflowTriggerType(str, Enum):
    WEBHOOK = "webhook"
    SCHEDULE = "schedule"


class WorkflowDefaultArgument(BaseModel):
    name: str
    value: JsonValue


class WorkflowTriggerBase(BaseModel):
    type: WorkflowTriggerType
    default_args: list[WorkflowDefaultArgument] = []

    @property
    def default_args_dict(self) -> dict[str, JsonValue]:
        return {arg.name: arg.value for arg in self.default_args}


class WorkflowWebhookTrigger(WorkflowTriggerBase):
    type: WorkflowTriggerType = WorkflowTriggerType.WEBHOOK


class WorkflowScheduleTrigger(WorkflowTriggerBase):
    type: WorkflowTriggerType = WorkflowTriggerType.SCHEDULE
    cron: Optional[str] = None
    interval_seconds: Optional[int] = None
    interval_minutes: Optional[int] = None
    interval_hours: Optional[int] = None
    interval_days: Optional[int] = None


class WorkflowStart(BaseModel):
    triggers: list[WorkflowWebhookTrigger | WorkflowScheduleTrigger] = []
    """ The triggers for the workflow. """


class WorkflowDAG(BaseModel):
    name: str
    description: str | None = None
    controls: list[str] | None = None
    start: WorkflowStart
    dag: dict[str, IfNode | ActionNode | LoopNode]
    version: str = "1"


class Workflow(BaseModel):
    workflow_id: str
    workflow_name: str
    workflow_dag: WorkflowDAG
    is_active: bool


class WorkflowPushRequest(BaseModel):
    workflow_code: str
    activate: bool


class WorkflowPushResponse(BaseModel):
    webhook_id: Optional[str] = None
    webhook_secret: Optional[str] = None


class TriggerStatus(str, Enum):
    SUCCESS = "SUCCESS"
    INACTIVE = "INACTIVE"


class WorkflowTriggerResponse(BaseModel):
    status: TriggerStatus

    @classmethod
    def success(cls) -> "WorkflowTriggerResponse":
        return cls(status=TriggerStatus.SUCCESS)

    @classmethod
    def inactive(cls) -> "WorkflowTriggerResponse":
        return cls(status=TriggerStatus.INACTIVE)


class WorkflowMetadata(BaseModel):
    workflow_id: str
    workflow_name: str
    workflow_description: str | None = None
    controls: list[str] | None = None
    created_at: datetime
    is_active: bool
