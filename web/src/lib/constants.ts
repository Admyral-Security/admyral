export const REFERENCE_HANDLE_EXPLANATION = `To refer to the output of an action, use the provided reference handle of the action.
To access a specific part of the output, use the reference handle followed by a "." and the key path to a value in the JSON output of an action.

Example 1: For the output {"body": {"key": "value"}} of the action with reference handle "ref_handle", use <<ref_handle.body.key>> to refer to the value of "key" inside the "body" JSON object.
Example 2: For the output {"value": ["a", "b"]} of the action with reference handle "ref_handle", use <<ref_handle.value[0]>> to refer to the first value in the JSON array of "value".`;
