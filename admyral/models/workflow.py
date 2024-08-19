from typing import Optional, Literal
from pydantic import BaseModel, Field
from enum import Enum
from collections import defaultdict
from datetime import datetime

from admyral.typings import JsonValue
from admyral.models.condition import Condition


class NodeBase(BaseModel):
    id: str
    """ Unique ID of the node used for building edges. """
    type: str
    """ The type of the node. """


class ActionNode(NodeBase):
    result_name: Optional[str] = None
    args: dict[str, JsonValue] = {}
    """ The arguments of the action. Either a reference or a JSON-serialized constant. """
    secrets_mapping: dict[str, str] = {}
    """ The mapping of secret placeholders to secret IDs. """
    children: list[str] = []

    def add_edge(self, child_node: str) -> None:
        # Note: children must be a set but we can't use a set type due to the following error
        # TypeError: Object of type set is not JSON serializable
        if child_node not in self.children:
            self.children.append(child_node)

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
        return cls(id="start", type="start")


class IfNode(NodeBase):
    type: Literal["if_condition"] = "if_condition"
    condition: Condition = Field(..., discriminator="type")
    condition_str: str

    # Children must be sets
    # Why?
    # if we have act5(a, b) and a, b are emitted variables from an if-condition block
    # then we connect each leaf node twice to act5(a, b) (once for a and once for b)
    true_children: list[str] = []
    false_children: list[str] = []

    def add_true_edge(self, child_node: str) -> None:
        # Note: children must be a set but we can't use a set type due to the following error
        # TypeError: Object of type set is not JSON serializable
        if child_node not in self.true_children:
            self.true_children.append(child_node)

    def add_false_edge(self, child_node: str) -> None:
        # Note: children must be a set but we can't use a set type due to the following error
        # TypeError: Object of type set is not JSON serializable
        if child_node not in self.false_children:
            self.false_children.append(child_node)

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


class WorkflowTriggerType(str, Enum):
    WEBHOOK = "webhook"
    SCHEDULE = "schedule"


class WorkflowDefaultArgument(BaseModel):
    name: str
    value: JsonValue


class WorkflowTriggerBase(BaseModel):
    type: WorkflowTriggerType
    default_args: list[WorkflowDefaultArgument]

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
    start: WorkflowStart
    dag: dict[str, IfNode | ActionNode]
    version: str = "1"

    # TODO: make this a property
    def get_in_deg(self) -> dict[str, int]:
        in_deg = defaultdict(int)
        for node in self.dag.values():
            if isinstance(node, IfNode):
                for true_child in node.true_children:
                    in_deg[true_child] += 1
                for false_child in node.false_children:
                    in_deg[false_child] += 1
            else:
                assert isinstance(node, ActionNode)
                for child in node.children:
                    in_deg[child] += 1
        return in_deg


class Workflow(BaseModel):
    workflow_id: str
    workflow_name: str
    workflow_dag: WorkflowDAG
    is_active: bool


class WorkflowPushRequest(BaseModel):
    workflow_dag: WorkflowDAG
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
    created_at: datetime
    is_active: bool
