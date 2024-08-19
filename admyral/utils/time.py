from datetime import datetime


def utc_now() -> datetime:
    return datetime.now()


def utc_now_timestamp_seconds() -> int:
    return int(datetime.now().timestamp())
