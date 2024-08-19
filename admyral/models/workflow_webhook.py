from pydantic import BaseModel


class WorkflowWebhook(BaseModel):
    webhook_id: str
    webhook_secret: str
    workflow_id: str
