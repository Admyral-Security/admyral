from __future__ import annotations
from pydantic import BaseModel
from datetime import datetime

from admyral.typings import JsonValue


class WorkflowRunStep(BaseModel):
    step_id: str
    action_type: str
    prev_step_id: str | None = None
    logs: str | None = None
    result: JsonValue | None = None
    input_args: JsonValue | None = None


class WorkflowRun(BaseModel):
    run_id: str
    trigger_id: int
    payload: JsonValue | None
    created_at: datetime
    steps: list[WorkflowRunStep] | None = None


class WorkflowRunMetadata(BaseModel):
    run_id: str
    created_at: datetime


class WorkflowRunStepMetadata(BaseModel):
    step_id: str
    action_type: str
