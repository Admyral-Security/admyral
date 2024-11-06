from __future__ import annotations
from pydantic import BaseModel


class WorkflowControl(BaseModel):
    workflow_id: str
    run_id: str
    result: bool
