from enum import Enum
from pydantic import JsonValue  # noqa F401


class ScheduleType(str, Enum):
    CRON = "cron"
    INTERVAL_SECONDS = "interval_seconds"
    INTERVAL_MINUTES = "interval_minutes"
    INTERVAL_HOURS = "interval_hours"
    INTERVAL_DAYS = "interval_days"
