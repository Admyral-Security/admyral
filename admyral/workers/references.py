import re
import json

from admyral.typings import JsonValue


REFERENCE_REGEX = re.compile(r"{{((?!}}).)*}}")


PATTERN1 = r"\[\"((?!\"\]).)*\"\]"
OBJECT_ACCESS_REGEX = re.compile(PATTERN1)

PATTERN2 = r"\[\'((?!\'\]).)*\'\]"
OBJECT_ACCESS_2_REGEX = re.compile(PATTERN2)

PATTERN3 = r"\[((?!\])[0-9])*\]"
INDEX_ACCESS_REGEX = re.compile(PATTERN3)

ACCESS_PATH_REGEX = re.compile(f"{PATTERN3}|{PATTERN2}|{PATTERN1}")


# TODO: Shoudl we fail for an invalid access path or return None?
def _resolve_access_path(action_outputs: dict, input: str) -> JsonValue:
    input = input.strip()
    if not input.startswith("{{") or not input.endswith("}}"):
        # we have a JSON-serialized constant as input
        return json.loads(input)

    access_path = input.lstrip("{{").rstrip("}}").strip()
    if len(access_path) == 0:
        raise ValueError("Invalid reference: Access path is empty")
    current_value = action_outputs

    # access the base variable and check if it exists
    variable = access_path
    access_path_start = access_path.find("[")
    if access_path_start != -1:
        variable = access_path[:access_path_start]
    current_value = current_value.get(variable)
    if current_value is None:
        return None

    for key in ACCESS_PATH_REGEX.finditer(access_path):
        raw_value = key.group()

        if OBJECT_ACCESS_REGEX.match(raw_value) or OBJECT_ACCESS_2_REGEX.match(
            raw_value
        ):
            # Case - Object Access: ['key'] or ["key"]
            raw_value = raw_value[2:-2]
        else:
            # Case - Array Access: [index]
            raw_value = int(raw_value[1:-1])

        try:
            current_value = current_value[raw_value]
            if current_value is None:
                return None
        except (KeyError, IndexError):
            return None

    return current_value


def evaluate_references(value: JsonValue, execution_state: dict) -> JsonValue:
    if value is None or isinstance(value, (bool, int, float)):
        return value

    if isinstance(value, str):
        reference_matches = [match.group() for match in REFERENCE_REGEX.finditer(value)]

        if (
            value.startswith("{{")
            and value.endswith("}}")
            and len(reference_matches) == 1
        ):
            # We have something like: "{{ reference }}"
            return _resolve_access_path(execution_state, value)

        for reference in reference_matches:
            resolved_ref = _resolve_access_path(execution_state, reference)
            resolved_ref_str = str(resolved_ref) if resolved_ref is not None else "null"
            value = value.replace(reference, resolved_ref_str)
        return value

    if isinstance(value, dict):
        out = {}
        for key, val in value.items():
            key = evaluate_references(key, execution_state)
            value = evaluate_references(val, execution_state)
            out[key] = value
        return out

    if isinstance(value, list):
        return [evaluate_references(val, execution_state) for val in value]

    raise ValueError(f"Unsupported type: {type(value)}")
