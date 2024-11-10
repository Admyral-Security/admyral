import json
from typing import Any


def count_json_payload_bytes(payload: dict[str, Any]) -> int:
    serialized_payload = json.dumps(payload).encode("utf-8")
    return len(serialized_payload)
