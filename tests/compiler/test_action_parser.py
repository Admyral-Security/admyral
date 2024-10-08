import pytest

from admyral.compiler.action_parser import parse_action
from admyral.models import PythonAction, Argument


CODE_TEST_1 = """def custom_action(s: Annotated[str, ArgumentMetadata(display_name='String',
    description='A string')]) ->str:
    print(f'Hey! This is my Custom Async Action: {s}')
    my_secret = ctx.get().secrets.get('MY_SECRET')
    print(f'My Secret: {my_secret}')
    return f'Custom Async Action: {s}'
"""


MODULE_TEST_1 = f"""import os
from os import environ as env
import json as j
import asyncio, time as t, random as r
import numpy as np
import torch.nn as nn
from temporalio.client import Client
from typing import Annotated
from admyral.context import ctx
from admyral.action import action, ArgumentMetadata


@action
def random_other_action():
    return "random"


@action(
    display_name="My Custom Action",
    display_namespace="Custom Actions",
    description="This is a custom action",
    requirements=["os", "json", "time", "numpy"],
    secrets_placeholders=["MY_SECRET", "MY_SECRET2"]
)
{CODE_TEST_1}"""


EXPECTED_IMPORT_TEST_1 = """import os
from os import environ as env
import json as j
import asyncio
import time as t
import random as r
import numpy as np
from typing import Annotated
from admyral.context import ctx
from admyral.action import action, ArgumentMetadata
"""


def test_action_parser():
    expected_python_action = PythonAction(
        action_type="custom_action",
        import_statements=EXPECTED_IMPORT_TEST_1,
        code=CODE_TEST_1,
        display_name="My Custom Action",
        display_namespace="Custom Actions",
        description="This is a custom action",
        requirements=["numpy"],
        secrets_placeholders=["MY_SECRET", "MY_SECRET2"],
        arguments=[
            Argument(
                arg_name="s",
                display_name="String",
                description="A string",
                arg_type="str",
                is_optional=False,
                default_value=None,
            )
        ],
    )
    python_action = parse_action(MODULE_TEST_1, "custom_action")
    assert python_action == expected_python_action


#########################################################################################################


CODE_TEST_2 = """def custom_action1():
    print('Hey! This is my Custom Action 1')
    return 'Custom Action 1'
"""


MODULE_TEST_2 = f"""from admyral.action import action

@action(
    display_name="My Custom Action 1",
    display_namespace="Custom Actions",
)
{CODE_TEST_2}"""


def test_action_parser_2():
    expected_python_action = PythonAction(
        action_type="custom_action1",
        import_statements="from admyral.action import action\n",
        code=CODE_TEST_2,
        display_name="My Custom Action 1",
        display_namespace="Custom Actions",
        arguments=[],
    )
    python_action = parse_action(MODULE_TEST_2, "custom_action1")
    assert python_action == expected_python_action


#########################################################################################################


CODE_TEST_3 = """def test_action(value: Annotated[dict, ArgumentMetadata(display_name=
    'Value', description='A dictionary')], value2: Annotated[list,
    ArgumentMetadata(display_name='Value 2', description='A list of values'
    )]=['Hello'], value2_5: Annotated[Optional[int], ArgumentMetadata(
    display_name='Value 2.5', description='Some number')]=None, value3:
    Annotated[dict, ArgumentMetadata(display_name='Value 3', description=
    'Some number')]={'a': 1, 'b': {'c': ['d', 'e']}}, value4: Annotated[
    Optional[list], ArgumentMetadata(display_name='Value 4', description=
    'A list of values')]=None, value5: Annotated[list, ArgumentMetadata(
    display_name='Value 5', description='A list of values')]=['ABC', 123, 
    True, {'a': 1}], *, value6: Annotated[str | None, ArgumentMetadata(
    display_name='Value 6', description='A list of values')]=None) ->dict:
    return value
"""


MODULE_TEST_3 = f"""from typing import Annotated, Optional
from admyral.action import action, ArgumentMetadata

@action(
    display_name="Test Action",
    display_namespace="Test",
    description="Test 123"
)
{CODE_TEST_3}"""


def test_action_parser_3():
    expected_python_action = PythonAction(
        action_type="test_action",
        import_statements="\n".join(
            [
                "from typing import Annotated, Optional",
                "from admyral.action import action, ArgumentMetadata",
            ]
        )
        + "\n",
        code=CODE_TEST_3,
        arguments=[
            Argument(
                arg_name="value",
                display_name="Value",
                description="A dictionary",
                arg_type="dict",
                is_optional=False,
                default_value=None,
            ),
            Argument(
                arg_name="value2",
                display_name="Value 2",
                description="A list of values",
                arg_type="list",
                is_optional=False,
                default_value=["Hello"],
            ),
            Argument(
                arg_name="value2_5",
                display_name="Value 2.5",
                description="Some number",
                arg_type="Optional[int]",
                is_optional=True,
                default_value=None,
            ),
            Argument(
                arg_name="value3",
                display_name="Value 3",
                description="Some number",
                arg_type="dict",
                is_optional=False,
                default_value={"a": 1, "b": {"c": ["d", "e"]}},
            ),
            Argument(
                arg_name="value4",
                display_name="Value 4",
                description="A list of values",
                arg_type="Optional[list]",
                is_optional=True,
                default_value=None,
            ),
            Argument(
                arg_name="value5",
                display_name="Value 5",
                description="A list of values",
                arg_type="list",
                is_optional=False,
                default_value=["ABC", 123, True, {"a": 1}],
            ),
            Argument(
                arg_name="value6",
                display_name="Value 6",
                description="A list of values",
                arg_type="(str | None)",
                is_optional=True,
                default_value=None,
            ),
        ],
        display_name="Test Action",
        display_namespace="Test",
        description="Test 123",
    )
    python_action = parse_action(MODULE_TEST_3, "test_action")
    assert python_action == expected_python_action


#########################################################################################################


CODE_TEST_4 = """def custom_action1(arg: int) ->str:
    print('Hey! This is my Custom Action 1')
    return 'Custom Action 1'
"""


def test_missing_argument_annotation():
    with pytest.raises(ValueError) as e:
        parse_action(CODE_TEST_4, "custom_action1")

    assert (
        str(e.value.args[0])
        == "Arguments must be annotated using Annotated[<type>, ArgumentMetadata(...)]."
    )


#########################################################################################################


CODE_TEST_5 = """from typing import Annotated
from admyral.action import action, ArgumentMetadata

@action(
    display_name="Custom Action 1",
    display_namespace="Test",
    description="Test 123"
)
def custom_action1(arg: Annotated[int, ArgumentMetadata(display_name="Arg", description="description 1", description="description 2")]) ->str:
    print('Hey! This is my Custom Action 1')
    return 'Custom Action 1'
"""


def test_duplicate_parameter_in_argument_metadata():
    with pytest.raises(ValueError) as e:
        parse_action(CODE_TEST_5, "custom_action1")

    assert (
        str(e.value.args[0])
        == "Found duplicate ArgumentMetadata parameter: description. ArgumentMetadata parameters must be unique."
    )


#########################################################################################################


CODE_TEST_6 = """from typing import Annotated
from admyral.action import action, ArgumentMetadata

@action(
    display_name="Custom Action 1",
    display_namespace="Test",
    description="Test 123"
)
def custom_action1(*args) ->str:
    print('Hey! This is my Custom Action 1')
    return 'Custom Action 1'
"""


def test_varargs_parameter():
    with pytest.raises(ValueError) as e:
        parse_action(CODE_TEST_6, "custom_action1")

    assert str(e.value.args[0]) == "Varargs parameter is not supported for actions."


#########################################################################################################


CODE_TEST_7 = """from typing import Annotated
from admyral.action import action, ArgumentMetadata

@action(
    display_name="Custom Action 1",
    display_namespace="Test",
    description="Test 123"
)
def custom_action1(**kwargs) ->str:
    print('Hey! This is my Custom Action 1')
    return 'Custom Action 1'
"""


def test_kwargs_parameter():
    with pytest.raises(ValueError) as e:
        parse_action(CODE_TEST_7, "custom_action1")

    assert str(e.value.args[0]) == "Kwargs parameter is not supported for actions."
