from typing import Annotated

from admyral.action import action, ArgumentMetadata
from admyral.workflow import workflow
from admyral.typings import JsonValue


@action(
    display_name="Action 1",
    display_namespace="Custom Actions",
)
def action1() -> dict:
    return {"a": 1}


@action(
    display_name="Action 2",
    display_namespace="Custom Actions",
)
def action2(
    a: Annotated[int, ArgumentMetadata(display_name="A", description="A number")],
) -> int:
    return a + 1


@action(
    display_name="Action 3",
    display_namespace="Custom Actions",
)
def action3(
    a: Annotated[int, ArgumentMetadata(display_name="A", description="A number")],
) -> int:
    return a - 1


@action(
    display_name="Action 4",
    display_namespace="Custom Actions",
)
def action4(
    a: Annotated[int, ArgumentMetadata(display_name="A", description="A number")],
    b: Annotated[int, ArgumentMetadata(display_name="B", description="Another number")],
) -> int:
    return a + b


global result
result = 0


@action(
    display_name="Action 5",
    display_namespace="Custom Actions",
)
def action5(
    a: Annotated[int, ArgumentMetadata(display_name="A", description="A number")],
) -> None:
    global result
    result = a


@workflow
def example_workflow(payload: dict[str, JsonValue]):
    a = action1()
    if payload["x"] == 1:
        b = action2(a=a["a"])
    else:
        b = action3(a=a["a"])
    action5(a=b)


def test_example_workflow_execution():
    global result
    result = 0
    example_workflow({"x": 1})
    assert result == 2

    result = 0
    example_workflow({"x": 2})
    assert result == 0


# @action
# async def async_action1() -> dict:
#     return {"a": 1}


# @action
# async def async_action2(a: int) -> int:
#     return a + 1


# @action
# async def async_action3(a: int) -> int:
#     return a - 1


# @action
# async def async_action4(a: int, b: int) -> int:
#     return a + b


# @action
# async def async_action5(a: int) -> None:
#     global result
#     result = a


# @workflow
# async def async_example_workflow(x: int):
#     a = await async_action1()
#     if x == 1:
#         b = await async_action2(a=a["a"])
#     else:
#         b = await async_action3(a=a["a"])
#     await async_action5(a=b)


# @pytest.mark.asyncio
# async def test_async_example_workflow():
#     global result
#     result = 0
#     await async_example_workflow.call_func(x=1)
#     assert result == 2

#     result = 0
#     await async_example_workflow.call_func(x=2)
#     assert result == 0
