from datetime import datetime, UTC


def utc_now() -> datetime:
    return datetime.now(UTC)


def utc_now_timestamp_seconds() -> int:
    return int(datetime.now(UTC).timestamp())
