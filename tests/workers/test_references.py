import pytest

from admyral.workers.references import evaluate_references
from admyral.exceptions import AdmyralFailureError


def test_multiple_references_in_a_single_string():
    execution_state = {"a": "abc", "b": "def", "c": "ghi"}
    value = "{{ a }} {{ b }} {{ c }}"
    assert evaluate_references(value, execution_state) == "abc def ghi"


#########################################################################################################


def test_deeply_nested_references():
    execution_state = {"a": {"b": {"c": [{"d": ["", "", "abc"]}]}}}
    value = "{{ a['b']['c'][0]['d'][2] }}"
    assert evaluate_references(value, execution_state) == "abc"


#########################################################################################################


def test_non_string_reference_int():
    execution_state = {"a": 123}
    value = "{{ a }}"
    assert evaluate_references(value, execution_state) == 123


#########################################################################################################


def test_non_string_reference_bool():
    execution_state = {"a": True}
    value = "{{ a }}"
    assert evaluate_references(value, execution_state)


#########################################################################################################


def test_dict_with_references():
    execution_state = {"a": "abc", "b": "def", "c": "ghi"}
    value = {"a": "{{ a }}", "b": {"c": "{{ b }}"}}
    assert evaluate_references(value, execution_state) == {
        "a": "abc",
        "b": {"c": "def"},
    }


#########################################################################################################


def test_list_with_references():
    execution_state = {"a": "abc", "b": "def", "c": "ghi"}
    value = ["{{ a }}", {"b": "{{ b }}"}, "something before and after", 42, True]
    assert evaluate_references(value, execution_state) == [
        "abc",
        {"b": "def"},
        "something before and after",
        42,
        True,
    ]


#########################################################################################################


def test_key_with_list():
    execution_state = {"a": ["abc", "def", "ghi"]}
    value = '{{ a["abc"] }}'
    with pytest.raises(AdmyralFailureError) as e:
        evaluate_references(value, execution_state)
    assert (
        e.value.message
        == 'Invalid access path: a["abc"]. Expected a dictionary, got list.'
    )


#########################################################################################################


def test_key_not_in_dict():
    execution_state = {"a": {"b": "def"}}
    value = "{{ a['c'] }}"
    with pytest.raises(AdmyralFailureError) as e:
        evaluate_references(value, execution_state)
    assert e.value.message == "Invalid access path: a['c']. Key 'c' not found."


#########################################################################################################


def test_invalid_int_conversion():
    execution_state = {"a": ["b", "def"]}
    value = "{{ a[True] }}"
    with pytest.raises(AdmyralFailureError) as e:
        evaluate_references(value, execution_state)
    assert (
        e.value.message
        == "Invalid access path segment: a[True]. Must be either a string or integer."
    )


#########################################################################################################


def test_invalid_list_access():
    execution_state = {"a": {"b": "def"}}
    value = "{{ a[1] }}"
    with pytest.raises(AdmyralFailureError) as e:
        evaluate_references(value, execution_state)
    assert e.value.message == "Invalid access path: a[1]. Expected a list, got dict."


#########################################################################################################


def test_index_out_of_bounds():
    execution_state = {"a": ["abc", "def", "ghi"]}
    value = "{{ a[3] }}"
    with pytest.raises(AdmyralFailureError) as e:
        evaluate_references(value, execution_state)
    assert e.value.message == "Invalid access path: a[3]. Index 3 out of bounds."


#########################################################################################################


def test_empty_access_path():
    execution_state = {"a": "abc"}
    value = "{{ a[] }}"
    with pytest.raises(AdmyralFailureError) as e:
        evaluate_references(value, execution_state)
    assert (
        e.value.message
        == "Invalid access path segment: a[]. Must be either a string or integer."
    )


#########################################################################################################


def test_empty_reference():
    execution_state = {"a": "abc"}
    value = "{{}}"
    with pytest.raises(AdmyralFailureError) as e:
        evaluate_references(value, execution_state)
    assert e.value.message == "Invalid reference: Access path is empty."


#########################################################################################################


def test_evaluate_references_unsupported_type():
    execution_state = {"a": {"b": "def"}}

    class Dummy:
        def __init__(self, value):
            self.value = value

    value = Dummy("abc")
    with pytest.raises(AdmyralFailureError) as e:
        evaluate_references(value, execution_state)
    assert e.value.message == "Unsupported type: Dummy"
