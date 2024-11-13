from datetime import datetime, timezone


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def utc_now_timestamp_seconds() -> int:
    return int(datetime.now(timezone.utc).timestamp())
