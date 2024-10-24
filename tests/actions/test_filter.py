from admyral.actions import filter


def test_filter_not_in():
    input_list = [
        {"email": "abc@gmail.com"},
        {"email": "def@gmail.com"},
        {"email": "ghi@gmail.com"},
    ]
    values = {"users": {"abc@gmail.com": {}, "ghi@gmail.com": {}}}
    condition = "x['email'] not in users"

    result = filter(input_list=input_list, filter=condition, values=values)

    assert result == [{"email": "def@gmail.com"}]


def test_filter_in():
    input_list = [
        {"email": "abc@gmail.com"},
        {"email": "def@gmail.com"},
        {"email": "ghi@gmail.com"},
    ]
    values = {"users": {"abc@gmail.com": {}, "ghi@gmail.com": {}}}
    condition = "x['email'] in users"

    result = filter(input_list=input_list, filter=condition, values=values)

    assert result == [
        {"email": "abc@gmail.com"},
        {"email": "ghi@gmail.com"},
    ]
