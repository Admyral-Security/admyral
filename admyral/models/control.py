from pydantic import BaseModel


class Control(BaseModel):
    control_id: int
    control_name: str
    control_description: str


class ControlsWorkflowsMapping(BaseModel):
    control_id: int
    workflow_id: str
