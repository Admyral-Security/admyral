from enum import Enum
from pydantic import BaseModel
from typing import Optional, Any


class ScheduleType(str, Enum):
    CRON = "cron"
    INTERVAL_SECONDS = "interval_seconds"
    INTERVAL_MINUTES = "interval_minutes"
    INTERVAL_HOURS = "interval_hours"
    INTERVAL_DAYS = "interval_days"


class Schedule(BaseModel):
    schedule_type: ScheduleType
    value: str | int
    default_args: Optional[dict[str, Any]] = None
