import json
import re

from admyral.typings import JsonValue


REFERENCE_REGEX = re.compile(r"{{((?!}}).)*}}")


"""

Behavior:

- If something is wrapped in quotes, it is a string.
    - Special behavior: If we have something like `"some string"` as input, then the quotes will be kept
    - If we have something like `"123"` as input, then the quotes will be removed and we will simply store 123 as a string
- In all other cases, we will JSON-deserialize the string and store the result.

    

Types:

- If a reference not wrapped in a string is used, it simply returns the value it references.
    Example 1: `{{ a['b'] }}` with `a['b'] = "abc"` will be resolved to `"abc"`.
    Example 2: `{{ a['b'] }}` with `a['b'] = 123` will be resolved to `123`.
- If a reference is wrapped in a string, it returns the reference as a string.
  - Note if it is a string within a string (e.g. `"... {{ a['b'] }} ..."`), it will not wrap the referenced value in quotes.
    Example: `"... {{ a['b'] }} ..."` with `a['b'] = "abc"` will be resolved to `"... abc ..."`.


Note:
- we handle \n and \\n exactly the same way in the UI
- empty UI field equals None

"""


def _unescape_string(value: str) -> str:
    return value.encode("utf-8").decode("unicode_escape")


def _escape_string(value: str) -> str:
    return value.encode("unicode_escape").decode("utf-8")


def _is_float(value: str) -> bool:
    try:
        float(value)
        return True
    except ValueError:
        return False


def _is_string_escaped_json_value(value: str) -> bool:
    if not (
        _is_float(value)
        or value.isdecimal()
        or value in ("true", "false")
        or (value.startswith("{") and value.endswith("}"))
        or (value.startswith("[") and value.endswith("]"))
        or value == "null"
    ):
        return False
    try:
        json.loads(value)
        return True
    except json.JSONDecodeError:
        return False


def _handle_value_inside_container(value: JsonValue) -> str:
    if not isinstance(value, str):
        return serialize_json_with_reference(value)

    if value.startswith("{{") and value.endswith("}}"):
        return value
    return json.dumps(value)


def serialize_json_with_reference(value: JsonValue) -> str:
    if value is None or isinstance(value, (bool, int, float)):
        return json.dumps(value)

    if isinstance(value, str):
        if value == "":
            return '""'
        # handle string escaping for ints, floats, bools, dicts, and lists
        # if _is_string_escaped_json_value(value):
        #     return f'"{_escape_string(value)}"'
        # return _escape_string(value)
        if _is_string_escaped_json_value(value):
            return f'"{value}"'
        return value

    if isinstance(value, list):
        content = ", ".join(_handle_value_inside_container(item) for item in value)
        return f"[{content}]"

    if isinstance(value, dict):
        content = ", ".join(
            f"{_handle_value_inside_container(k)}: {_handle_value_inside_container(v)}"
            for k, v in value.items()
        )
        return f"{{{content}}}"

    raise ValueError(f"Unsupported value type: {type(value)}")


def deserialize_json_with_reference(value: str) -> JsonValue:
    value = value.replace("\\n", "\n")
    value = _unescape_string(value)

    if value == "":
        return None

    # handle string escaping for ints, floats, bools, dicts, and lists
    if value.startswith('"') and value.endswith('"'):
        return value[1:-1]

    # Handle pure reference
    if value.startswith("{{") and value.endswith("}}"):
        return value

    # Handle Integers
    if value.isdecimal():
        return int(value)

    # Handle Floats
    if _is_float(value):
        return float(value)

    # Handle Booleans
    if value in ("true", "false"):
        return value == "true"

    # Handle Null
    if value == "null":
        return None

    is_list = value.startswith("[") and value.endswith("]")
    is_dict = value.startswith("{") and value.endswith("}")
    if not is_dict and not is_list:
        # just a normal string
        return value

    # Handle Arrays and Objects
    # We might have something like the following string:
    # [{{ a['b'][0]["c"] }}, "something before and after", 42, true]
    #
    # => we must wrap the references within quotes such that we can do json.loads

    # Compute which positions are within quotes (i.e., "..." or '...')
    is_within_string = [False for _ in range(len(value))]
    idx = 0
    while idx < len(value):
        # Find the next " or '
        while idx < len(value) and value[idx] not in ('"', "'"):
            if value[idx] == "{" and idx + 1 < len(value) and value[idx + 1] == "{":
                # Skip reference: {{ <some-reference> }}
                idx += 2
                while idx < len(value) and (
                    value[idx] != "}"
                    or (idx + 1 < len(value) and value[idx + 1] != "}")
                ):
                    idx += 1
            idx += 1

        if idx == len(value):
            break

        # we have found a quote (" or ')
        expected_quote = value[idx]
        idx += 1
        while idx < len(value) and value[idx] != expected_quote:
            is_within_string[idx] = True

            if value[idx] == "{" and idx + 1 < len(value) and value[idx + 1] == "{":
                # Skip reference: {{ <some-reference> }}
                is_within_string[idx + 1] = True

                idx += 2
                while idx < len(value) and (
                    value[idx] != "}"
                    or (idx + 1 < len(value) and value[idx + 1] != "}")
                ):
                    is_within_string[idx] = True
                    idx += 1

            idx += 1

        idx += 1

    # Iterate over references and check whether we need to wrap them within "..."
    replacements = []
    for match in REFERENCE_REGEX.finditer(value):
        start, end = match.span()
        if is_within_string[start]:
            # Already within a quote, however, we must still replace "
            replacements.append(
                (start, end, match.group().replace('\\"', '"').replace('"', '\\"'))
            )
        else:
            # We need to wrap the reference within quotes because it is currently not
            # within quotes
            replacements.append(
                (
                    start,
                    end,
                    f'"{match.group().replace('\\"', '\"').replace('\"', '\\"')}"',
                )
            )

    # Wrap references into qutoes which are not yet within quotes
    # We can't simply just use regex replace because a reference might be used multiple times
    # where some usages are within quotes and some are not.
    out = [value]
    for start, end, replacement in reversed(replacements):
        str1 = out[-1][end:]
        str2 = out[-1][:start]

        out[-1] = str1
        out.append(replacement)
        out.append(str2)

    out = "".join(reversed(out))

    try:
        return json.loads(out)
    except json.JSONDecodeError:
        # normal string
        return value
