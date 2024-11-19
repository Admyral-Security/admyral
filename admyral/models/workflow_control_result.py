from pydantic import BaseModel


class WorkflowControlResult(BaseModel):
    workflow_id: str
    run_id: str
    result: bool
