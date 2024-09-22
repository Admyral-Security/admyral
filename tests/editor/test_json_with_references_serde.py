from admyral.editor.json_with_references_serde import (
    serialize_json_with_reference,
    deserialize_json_with_reference,
)


def test_serialize_json_with_reference():
    assert serialize_json_with_reference("123") == '"123"'
    assert serialize_json_with_reference("123.456") == '"123.456"'
    assert serialize_json_with_reference('"true"') == '"true"'
    assert serialize_json_with_reference(123) == "123"
    assert serialize_json_with_reference("true") == '"true"'
    assert serialize_json_with_reference(False) == "false"
    assert serialize_json_with_reference({"a": 1}) == '{"a": 1}'
    assert (
        serialize_json_with_reference([{"a": 1}, 2, "3", True])
        == '[{"a": 1}, 2, "3", true]'
    )
    assert serialize_json_with_reference("True") == "True"


#########################################################################################################


def test_deserialize_json_with_reference():
    assert deserialize_json_with_reference('"123"') == "123"
    assert deserialize_json_with_reference('"123.456"') == "123.456"
    assert deserialize_json_with_reference('"true"') == "true"
    assert deserialize_json_with_reference("123") == 123
    assert deserialize_json_with_reference('"true"') == "true"
    assert deserialize_json_with_reference("false") == False  # noqa: E712
    assert deserialize_json_with_reference('{"a": 1}') == {"a": 1}
    assert deserialize_json_with_reference('[{"a": 1}, 2, "3", true]') == [
        {"a": 1},
        2,
        "3",
        True,
    ]
    assert deserialize_json_with_reference("True") == "True"


#########################################################################################################


def test_serde_pure_reference():
    """
    Textfield Input in UI:
    ```
    {{ a['b'][0]["c"] }}
    ```
    """
    input_json_obj = "{{ a['b'][0][\"c\"] }}"
    json_str = serialize_json_with_reference(input_json_obj)
    json_obj = deserialize_json_with_reference(json_str)

    assert json_str == input_json_obj
    assert json_obj == input_json_obj


#########################################################################################################


def test_serde_as_part_of_a_string():
    """
    Textfield Input in UI:
    ```
    something before {{ a['b']["c"] }} and something after
    ```
    """
    input_json_obj = "something before {{ a['b'][\"c\"] }} and something after"
    json_str = serialize_json_with_reference(input_json_obj)
    json_obj = deserialize_json_with_reference(json_str)

    assert json_str == "something before {{ a['b'][\"c\"] }} and something after"
    assert input_json_obj == json_obj


#########################################################################################################


def test_serde_normal_string():
    """
    Textfield Input in UI:
    ```
    something before and after
    ```
    """
    input_json_obj = "something before and after"
    json_str = serialize_json_with_reference(input_json_obj)
    json_obj = deserialize_json_with_reference(json_str)

    assert json_str == input_json_obj
    assert input_json_obj == json_obj


#########################################################################################################


def test_serde_int():
    """
    Textfield Input in UI:
    ```
    42
    ```
    """
    input_json_obj = 42
    json_str = serialize_json_with_reference(input_json_obj)
    json_obj = deserialize_json_with_reference(json_str)

    assert json_str == str(input_json_obj)
    assert input_json_obj == json_obj


#########################################################################################################


def test_serde_bool():
    """
    Textfield Input in UI:
    ```
    true
    ```
    """
    input_json_obj = True
    json_str = serialize_json_with_reference(input_json_obj)
    json_obj = deserialize_json_with_reference(json_str)

    assert json_str == "true"
    assert input_json_obj == json_obj


#########################################################################################################


def test_serde_list():
    """
    Textfield Input in UI:
    ```
    [
        {{ a['b'][\"c\"] }},
        "something before and after",
        42,
        true
    ]
    ```
    """
    input_json_obj = ["{{ a['b'][\"c\"] }}", "something before and after", 42, True]
    json_str = serialize_json_with_reference(input_json_obj)
    json_obj = deserialize_json_with_reference(json_str)

    assert json_str == '[{{ a[\'b\']["c"] }}, "something before and after", 42, true]'
    assert input_json_obj == json_obj


#########################################################################################################


def test_serde_object():
    """
    Textfield Input in UI:
    ```
    {
        "abc": {{ a['b']["c"] }},
        "def": "something before {{ a['b'][\"c\"] }} and after"
    }
    ```
    """
    input_json_obj = {
        "abc": "{{ a['b'][\"c\"] }}",
        "def": "something before {{ a['b'][\"c\"] }} and after",
    }
    json_str = serialize_json_with_reference(input_json_obj)
    json_obj = deserialize_json_with_reference(json_str)

    assert (
        json_str
        == '{"abc": {{ a[\'b\']["c"] }}, "def": "something before {{ a[\'b\'][\\"c\\"] }} and after"}'
    )
    assert json_obj == input_json_obj


#########################################################################################################


def test_serde_pure_reference2():
    """
    Textfield Input in UI:
    ```
    "something before {{ a['b'][\"c\"] }} and after"
    ```
    """
    json_str = '"something {{ a[\'b\'][0][\\"c\\"] }} else"'
    assert (
        deserialize_json_with_reference(json_str)
        == "something {{ a['b'][0][\"c\"] }} else"
    )


#########################################################################################################


def test_serde_pure_reference3():
    """
    Textfield Input in UI:
    ```
    "something {{ a['b'][0]["c"] }} else"
    ```
    """
    json_str = '"something {{ a[\'b\'][0]["c"] }} else"'
    assert (
        deserialize_json_with_reference(json_str)
        == "something {{ a['b'][0][\"c\"] }} else"
    )


#########################################################################################################


def test_escaped_string_serialization():
    """
    Textfield Input in UI:
    ```
    "something before and after"
    ```
    """
    input_json_obj = '"something before and after"'
    json_obj = deserialize_json_with_reference(input_json_obj)
    json_str = serialize_json_with_reference(json_obj)

    assert json_obj == "something before and after"
    assert json_str == "something before and after"


#########################################################################################################


def test_none_serialization():
    input_value = None
    json_str = serialize_json_with_reference(input_value)
    json_obj = deserialize_json_with_reference(json_str)

    assert json_str == "null"
    assert json_obj is None


#########################################################################################################


def test_string_escaping_serialization():
    """
    Textfield Input in UI:
    ```
    "{"foo": [1, 4, 7, 10], "bar": "bar"}"
    ```

    Note: the " wil be automatically escaped by the UI.
    """
    input_value = '"{"foo": [1, 4, 7, 10], "bar": "baz"}"'
    json_obj = deserialize_json_with_reference(input_value)
    json_str = serialize_json_with_reference(json_obj)

    assert json_obj == '{"foo": [1, 4, 7, 10], "bar": "baz"}'
    assert json_str == input_value


#########################################################################################################


def test_empty_string_serialization():
    """
    Textfield Input in UI:
    ```

    ```
    """
    input_value = ""
    json_obj = deserialize_json_with_reference(input_value)
    json_str = serialize_json_with_reference(json_obj)

    assert json_obj is None
    assert json_str == "null"


#########################################################################################################


def test_invalid_list():
    """
    Textfield Input in UI:
    ```
    [\n"]
    ```
    """
    input_value = '[\\n"]'
    json_obj = deserialize_json_with_reference(input_value)
    json_str = serialize_json_with_reference(json_obj)

    assert json_obj == '[\n"]'
    assert json_str == '[\\n"]'


#########################################################################################################


def test_invalid_list_in_string():
    """
    Textfield Input in UI:
    ```
    "[\n]"
    ```
    """
    input_value = '"[\\n"]"'
    json_obj = deserialize_json_with_reference(input_value)
    json_str = serialize_json_with_reference(json_obj)

    assert json_obj == '[\n"]'
    assert json_str == '[\\n"]'


#########################################################################################################


def test_empty_reference():
    """
    Textfield Input in UI:
    ```
    {{}}
    ```
    """
    input_value = "{{}}"
    json_obj = deserialize_json_with_reference(input_value)
    json_str = serialize_json_with_reference(json_obj)

    assert json_obj == "{{}}"
    assert json_str == "{{}}"
