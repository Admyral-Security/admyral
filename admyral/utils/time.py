from datetime import datetime


def utc_now() -> datetime:
    return datetime.utcnow()


def utc_now_timestamp_seconds() -> int:
    return int(datetime.utcnow().timestamp())
