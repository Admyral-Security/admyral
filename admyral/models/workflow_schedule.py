from pydantic import BaseModel
from typing import Optional

from admyral.typings import JsonValue


class WorkflowSchedule(BaseModel):
    schedule_id: str
    workflow_id: str
    cron: Optional[str] = None
    interval_seconds: Optional[int] = None
    interval_minutes: Optional[int] = None
    interval_hours: Optional[int] = None
    interval_days: Optional[int] = None
    default_args: dict[str, JsonValue] = {}
