from admyral.workers.references import evaluate_references


def test_multiple_references_in_a_single_string():
    execution_state = {"a": "abc", "b": "def", "c": "ghi"}
    value = "{{ a }} {{ b }} {{ c }}"
    assert evaluate_references(value, execution_state) == "abc def ghi"


def test_deeply_nested_references():
    execution_state = {"a": {"b": {"c": [{"d": ["", "", "abc"]}]}}}
    value = "{{ a['b']['c'][0]['d'][2] }}"
    assert evaluate_references(value, execution_state) == "abc"


def test_non_existing_reference():
    execution_state = {"a": {"b": {"c": [{"d": ["", "", "abc"]}]}}}
    value = "{{ a['d']['c'][0]['d'][2] }}"
    assert evaluate_references(value, execution_state) is None


def test_non_string_reference_int():
    execution_state = {"a": 123}
    value = "{{ a }}"
    assert evaluate_references(value, execution_state) == 123


def test_non_string_reference_bool():
    execution_state = {"a": True}
    value = "{{ a }}"
    assert evaluate_references(value, execution_state)


def test_dict_with_references():
    execution_state = {"a": "abc", "b": "def", "c": "ghi"}
    value = {"a": "{{ a }}", "b": {"c": "{{ b }}"}}
    assert evaluate_references(value, execution_state) == {
        "a": "abc",
        "b": {"c": "def"},
    }


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
