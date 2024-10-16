import pytest
from typing import Annotated

from admyral.compiler.workflow_compiler import WorkflowCompiler
from admyral.models import (
    ActionNode,
    BinaryOperator,
    UnaryOperator,
    ConstantConditionExpression,
    BinaryConditionExpression,
    UnaryConditionExpression,
    AndConditionExpression,
    OrConditionExpression,
    IfNode,
    WorkflowDAG,
    WorkflowStart,
    WorkflowWebhookTrigger,
    WorkflowScheduleTrigger,
    WorkflowDefaultArgument,
)
from admyral.workflow import workflow, Webhook, Schedule
from admyral.action import action, ArgumentMetadata
from admyral.typings import JsonValue
from admyral.actions import wait


@action(
    display_name="Act1 Dummy",
    display_namespace="Custom Actions",
)
def act1_dummy() -> int:
    return 1


@action(
    display_name="Act2 Dummy",
    display_namespace="Custom Actions",
)
def act2_dummy() -> int:
    return 2


@action(
    display_name="Act3 Dummy",
    display_namespace="Custom Actions",
)
def act3_dummy(
    a: Annotated[int, ArgumentMetadata(display_name="A", description="A number")],
    b: Annotated[int, ArgumentMetadata(display_name="B", description="Another number")],
) -> int:
    return a + b


@action(
    display_name="Act4 Dummy",
    display_namespace="Custom Actions",
)
def act4_dummy() -> dict:
    return {"a": [0]}


@action(
    display_name="Act5 Dummy",
    display_namespace="Custom Actions",
)
def act5_dummy(
    x: Annotated[int, ArgumentMetadata(display_name="X", description="Some int")],
) -> int:
    return x + 1


# @action
# async def async_act1_dummy() -> int:
#     return 1


# @action
# async def async_act2_dummy(x: int) -> int:
#     return x + 1


@action(
    display_name="Dummy Test Action 1",
    display_namespace="Custom Actions",
)
def dummy_test_action1() -> str:
    print("dummy action 1")
    return "dummy action 1"


@action(
    display_name="Dummy Test Action 2",
    display_namespace="Custom Actions",
)
def dummy_test_action2(
    s: Annotated[str, ArgumentMetadata(display_name="S", description="my S")],
) -> dict:
    return {"a": s}


@action(
    display_name="Dummy Test Action 3",
    display_namespace="Custom Actions",
)
def dummy_test_action3(
    s: Annotated[str, ArgumentMetadata(display_name="S", description="my S")],
    i: Annotated[int, ArgumentMetadata(display_name="I", description="my I")],
) -> str:
    return s + i


# @action
# async def adummy_test_action1() -> str:
#     print("dummy action 1")
#     return "dummy action 1"


# @action
# async def adummy_test_action2(s: str) -> dict:
#     return {"a": s}


@action(
    display_name="Dummy Test Action with Secrets",
    display_namespace="Custom Actions",
    secrets_placeholders=["MY_SECRET", "MY_SECRET_2"],
)
def dummy_test_action_with_secrets() -> str:
    return "dummy action with secrets"


@action(
    display_name="Dummy Test Action with Secrets",
    display_namespace="Custom Actions",
)
def action_with_dict_and_list_input(
    value: Annotated[
        dict, ArgumentMetadata(display_name="Value", description="A dictionary")
    ],
    value2: Annotated[
        list, ArgumentMetadata(display_name="Value 2", description="A list of values")
    ],
) -> dict:
    return value


#########################################################################################################


@workflow
def simple_workflow_without_if(payload: dict[str, JsonValue]):
    """
    Expected Workflow Graph:

                       <START>
                     /   |     \
                  /      |         \
               /         |             \
a = act1_dummy()   b = act2_dummy()   d = act4_dummy()
            \     /                      |
c = act3_dummy(a, b)                act5_dummy(d["a"][0])
               |
act2_dummy(run_after=[a, c])
    """
    # test comment
    a = act1_dummy()
    b = act2_dummy()
    c = act3_dummy(a=a, b=b)
    act2_dummy(run_after=[a, c])
    d = act4_dummy()
    act5_dummy(x=d["a"][0])


def test_simple_workflow_without_if():
    expected_dag = WorkflowDAG(
        name="simple_workflow_without_if",
        description=None,
        start=WorkflowStart(triggers=[]),
        dag={
            "start": ActionNode(
                id="start",
                type="start",
                children=["act1_dummy", "act2_dummy", "act4_dummy"],
            ),
            # a = act1_dummy()
            "act1_dummy": ActionNode(
                id="act1_dummy",
                type="act1_dummy",
                result_name="a",
                children=["act3_dummy"],
            ),
            # b = act2_dummy()
            "act2_dummy": ActionNode(
                id="act2_dummy",
                type="act2_dummy",
                result_name="b",
                children=["act3_dummy"],
            ),
            # c = act3_dummy(a, b)
            "act3_dummy": ActionNode(
                id="act3_dummy",
                type="act3_dummy",
                result_name="c",
                args={"a": "{{ a }}", "b": "{{ b }}"},
                children=["act2_dummy_1"],
            ),
            # act2_dummy(run_after=[c])
            "act2_dummy_1": ActionNode(id="act2_dummy_1", type="act2_dummy"),
            # d = act4_dummy()
            "act4_dummy": ActionNode(
                id="act4_dummy",
                type="act4_dummy",
                result_name="d",
                children=["act5_dummy"],
            ),
            # act5_dummy(d["a"][0])
            "act5_dummy": ActionNode(
                id="act5_dummy",
                type="act5_dummy",
                args={"x": "{{ d['a'][0] }}"},
            ),
        },
    )
    dag = WorkflowCompiler().compile(simple_workflow_without_if)
    assert dag == expected_dag
    assert WorkflowDAG.model_validate(dag.model_dump()) == expected_dag


#########################################################################################################


@workflow
def simple_workflow_with_elif(payload: dict[str, JsonValue]):
    """
        Expected Workflow Graph:

             <START>
                |
            a = act1_dummy()
                |
            x = act5_dummy(a)
                |
            if a == 1
            T/       \F
    b = act5_dummy(x)  if a == 2
            |        T/        \F
            | b = act4_dummy()  b = act4_dummy()
             \       |          /
               \     |        /
                 \   |      /
                 act3_dummy(a, b)
    """
    a = act1_dummy()
    x = act5_dummy(x=a)
    if a == 1:
        b = act5_dummy(x=x)
    elif a == 2:
        b = act4_dummy()
    else:
        b = act4_dummy()
    act3_dummy(a=a, b=b)


def test_simple_workflow_with_elif():
    expected_dag = WorkflowDAG(
        name="simple_workflow_with_elif",
        description=None,
        start=WorkflowStart(triggers=[]),
        dag={
            "start": ActionNode(id="start", type="start", children=["act1_dummy"]),
            # a = act1_dummy()
            "act1_dummy": ActionNode(
                id="act1_dummy",
                type="act1_dummy",
                result_name="a",
                children=["act5_dummy"],
            ),
            # x = act5_dummy(a)
            "act5_dummy": ActionNode(
                id="act5_dummy",
                type="act5_dummy",
                result_name="x",
                args={"x": "{{ a }}"},
                children=["if"],
            ),
            # if a == 1
            "if": IfNode(
                id="if",
                type="if_condition",
                condition=BinaryConditionExpression(
                    lhs=ConstantConditionExpression(value="{{ a }}"),
                    op=BinaryOperator.EQUALS,
                    rhs=ConstantConditionExpression(value=1),
                ),
                condition_str="a == 1",
                true_children=["act5_dummy_1"],
                false_children=["if_1"],
            ),
            # b = act5_dummy(x)
            "act5_dummy_1": ActionNode(
                id="act5_dummy_1",
                type="act5_dummy",
                result_name="b",
                args={"x": "{{ x }}"},
                children=["act3_dummy"],
            ),
            # if a == 2
            "if_1": IfNode(
                id="if_1",
                type="if_condition",
                condition=BinaryConditionExpression(
                    lhs=ConstantConditionExpression(value="{{ a }}"),
                    op=BinaryOperator.EQUALS,
                    rhs=ConstantConditionExpression(value=2),
                ),
                condition_str="a == 2",
                true_children=["act4_dummy"],
                false_children=["act4_dummy_1"],
            ),
            # b = act4_dummy()
            "act4_dummy": ActionNode(
                id="act4_dummy",
                type="act4_dummy",
                result_name="b",
                children=["act3_dummy"],
            ),
            # b = act4_dummy()
            "act4_dummy_1": ActionNode(
                id="act4_dummy_1",
                type="act4_dummy",
                result_name="b",
                children=["act3_dummy"],
            ),
            # act3_dummy(a, b)
            "act3_dummy": ActionNode(
                id="act3_dummy",
                type="act3_dummy",
                args={"a": "{{ a }}", "b": "{{ b }}"},
            ),
        },
    )
    dag = WorkflowCompiler().compile(simple_workflow_with_elif)
    assert dag == expected_dag
    assert WorkflowDAG.model_validate(dag.model_dump()) == expected_dag


#########################################################################################################


@workflow
def workflow_with_if_without_else(payload: dict[str, JsonValue]):
    """
        Expected Workflow Graph:

              <START>
                 |
             a = act1_dummy()
                 |
              if a > 0
              T/     \F
    a = act2_dummy()  |
                \     |
                 \    |
                act4_dummy(a)
    """
    a = act1_dummy()
    if a > 0:
        a = act2_dummy()
    act4_dummy(run_after=[a])


def test_workflow_with_if_without_else():
    expected_dag = WorkflowDAG(
        name="workflow_with_if_without_else",
        description=None,
        start=WorkflowStart(triggers=[]),
        dag={
            "start": ActionNode(id="start", type="start", children=["act1_dummy"]),
            # a = act1_dummy()
            "act1_dummy": ActionNode(
                id="act1_dummy",
                type="act1_dummy",
                result_name="a",
                children=["if"],
            ),
            # if a > 0
            "if": IfNode(
                id="if",
                type="if_condition",
                condition=BinaryConditionExpression(
                    lhs=ConstantConditionExpression(value="{{ a }}"),
                    op=BinaryOperator.GREATER_THAN,
                    rhs=ConstantConditionExpression(value=0),
                ),
                condition_str="a > 0",
                true_children=["act2_dummy"],
                false_children=["act4_dummy"],
            ),
            # a = act2_dummy()
            "act2_dummy": ActionNode(
                id="act2_dummy",
                type="act2_dummy",
                result_name="a",
                children=["act4_dummy"],
            ),
            # act4_dummy(a)
            "act4_dummy": ActionNode(id="act4_dummy", type="act4_dummy"),
        },
    )
    dag = WorkflowCompiler().compile(workflow_with_if_without_else)
    assert dag == expected_dag
    assert WorkflowDAG.model_validate(dag.model_dump()) == expected_dag


#########################################################################################################


@workflow
def workflow_with_if_else_and_multiple_statements_in_branches(
    payload: dict[str, JsonValue],
):
    """
    Expected Workflow Graph:

              <START>
             /       \
a = act1_dummy()    b = act1_dummy()
             \       /
              if a > 0
             T/     \F
a = act2_dummy()     b = act5_dummy(a)
             |        |
c = act3_dummy(a, b)   c = act5_dummy(b)
              \       /
          d = act3_dummy(b, c)
                  |
            act3_dummy(a, d)
    """
    a = act1_dummy()
    b = act1_dummy()
    if a > 0:
        a = act2_dummy()
        c = act3_dummy(a=a, b=b)
    else:
        b = act5_dummy(x=a)
        c = act5_dummy(x=b)
    d = act3_dummy(a=b, b=c)
    act3_dummy(a=a, b=d)


def test_workflow_with_if_else_and_multiple_statements_in_branches():
    expected_dag = WorkflowDAG(
        name="workflow_with_if_else_and_multiple_statements_in_branches",
        description=None,
        start=WorkflowStart(triggers=[]),
        dag={
            "start": ActionNode(
                id="start",
                type="start",
                children=["act1_dummy", "act1_dummy_1"],
            ),
            # a = act1_dummy()
            "act1_dummy": ActionNode(
                id="act1_dummy",
                type="act1_dummy",
                result_name="a",
                children=["if"],
            ),
            # b = act1_dummy()
            "act1_dummy_1": ActionNode(
                id="act1_dummy_1",
                type="act1_dummy",
                result_name="b",
                children=["if"],
            ),
            # if a > 0
            "if": IfNode(
                id="if",
                type="if_condition",
                condition=BinaryConditionExpression(
                    lhs=ConstantConditionExpression(value="{{ a }}"),
                    op=BinaryOperator.GREATER_THAN,
                    rhs=ConstantConditionExpression(value=0),
                ),
                condition_str="a > 0",
                true_children=["act2_dummy"],
                false_children=["act5_dummy"],
            ),
            # a = act2_dummy()
            "act2_dummy": ActionNode(
                id="act2_dummy",
                type="act2_dummy",
                result_name="a",
                children=["act3_dummy"],
            ),
            # c = act3_dummy(a, b)
            "act3_dummy": ActionNode(
                id="act3_dummy",
                type="act3_dummy",
                result_name="c",
                args={"a": "{{ a }}", "b": "{{ b }}"},
                children=["act3_dummy_1"],
            ),
            # b = act5_dummy(a)
            "act5_dummy": ActionNode(
                id="act5_dummy",
                type="act5_dummy",
                result_name="b",
                args={"x": "{{ a }}"},
                children=["act5_dummy_1"],
            ),
            # c = act5_dummy(b)
            "act5_dummy_1": ActionNode(
                id="act5_dummy_1",
                type="act5_dummy",
                result_name="c",
                args={"x": "{{ b }}"},
                children=["act3_dummy_1"],
            ),
            # d = act3_dummy(b, c)
            "act3_dummy_1": ActionNode(
                id="act3_dummy_1",
                type="act3_dummy",
                result_name="d",
                args={"a": "{{ b }}", "b": "{{ c }}"},
                children=["act3_dummy_2"],
            ),
            # act3_dummy(a, d)
            "act3_dummy_2": ActionNode(
                id="act3_dummy_2",
                type="act3_dummy",
                args={"a": "{{ a }}", "b": "{{ d }}"},
            ),
        },
    )
    dag = WorkflowCompiler().compile(
        workflow_with_if_else_and_multiple_statements_in_branches
    )
    assert dag == expected_dag
    assert WorkflowDAG.model_validate(dag.model_dump()) == expected_dag


#########################################################################################################


@workflow
def workflow_parallelize_independent_if_conditions(payload: dict[str, JsonValue]):
    """
    Expected Workflow Graph:

                     <START>
                       |
                a = act1_dummy()
                /               \  
        b = act5_dummy(a)        if a == 1
           |                    T/      \F
        if a > 0     c = act2_dummy()  c = act1_dummy()
       T/        \F          /         /
b = act5_dummy(b) |         /         /
         \       /         /         /
   x = act3_dummy(a, b)   /        /
                \        |       /
                  \      |     /
                    act3_dummy(x, c)
    """
    a = act1_dummy()
    b = act5_dummy(x=a)
    if a > 0:
        b = act5_dummy(x=b)
    if a == 1:
        c = act2_dummy()
    else:
        c = act1_dummy()
    x = act3_dummy(a=a, b=b)
    act3_dummy(a=x, b=c)


def test_workflow_parallelize_independent_if_conditions():
    expected_dag = WorkflowDAG(
        name="workflow_parallelize_independent_if_conditions",
        description=None,
        start=WorkflowStart(triggers=[]),
        dag={
            "start": ActionNode(id="start", type="start", children=["act1_dummy"]),
            # a = act1_dummy()
            "act1_dummy": ActionNode(
                id="act1_dummy",
                type="act1_dummy",
                result_name="a",
                children=["act5_dummy", "if_1"],
            ),
            # b = act5_dummy(a)
            "act5_dummy": ActionNode(
                id="act5_dummy",
                type="act5_dummy",
                result_name="b",
                args={"x": "{{ a }}"},
                children=["if"],
            ),
            # if a > 0
            "if": IfNode(
                id="if",
                type="if_condition",
                condition=BinaryConditionExpression(
                    lhs=ConstantConditionExpression(value="{{ a }}"),
                    op=BinaryOperator.GREATER_THAN,
                    rhs=ConstantConditionExpression(value=0),
                ),
                condition_str="a > 0",
                true_children=["act5_dummy_1"],
                false_children=["act3_dummy"],
            ),
            # b = act5_dummy(b)
            "act5_dummy_1": ActionNode(
                id="act5_dummy_1",
                type="act5_dummy",
                result_name="b",
                args={"x": "{{ b }}"},
                children=["act3_dummy"],
            ),
            # if a == 1
            "if_1": IfNode(
                id="if_1",
                type="if_condition",
                condition=BinaryConditionExpression(
                    lhs=ConstantConditionExpression(value="{{ a }}"),
                    op=BinaryOperator.EQUALS,
                    rhs=ConstantConditionExpression(value=1),
                ),
                condition_str="a == 1",
                true_children=["act2_dummy"],
                false_children=["act1_dummy_1"],
            ),
            # c = act2_dummy()
            "act2_dummy": ActionNode(
                id="act2_dummy",
                type="act2_dummy",
                result_name="c",
                children=["act3_dummy_1"],
            ),
            # c = act1_dummy()
            "act1_dummy_1": ActionNode(
                id="act1_dummy_1",
                type="act1_dummy",
                result_name="c",
                children=["act3_dummy_1"],
            ),
            # x = act3_dummy(a, b)
            "act3_dummy": ActionNode(
                id="act3_dummy",
                type="act3_dummy",
                result_name="x",
                args={"a": "{{ a }}", "b": "{{ b }}"},
                children=["act3_dummy_1"],
            ),
            # act3_dummy(x, c)
            "act3_dummy_1": ActionNode(
                id="act3_dummy_1",
                type="act3_dummy",
                args={"a": "{{ x }}", "b": "{{ c }}"},
            ),
        },
    )
    dag = WorkflowCompiler().compile(workflow_parallelize_independent_if_conditions)
    assert dag == expected_dag
    assert WorkflowDAG.model_validate(dag.model_dump()) == expected_dag


#########################################################################################################


@workflow
def workflow_with_nested_if_condition(payload: dict[str, JsonValue]):
    """
        Expected Workflow Graph:

                     <START>
                        |
                    a = act1_dummy()
                        |
                     if a > 0
                  T/          \F
              if a == 1           a = act3_dummy(a, 3)
              T/      \F                       |
    b = act2_dummy()  b = act5_dummy(a)      if a > 1
            \        /                       T/       \F
            a = act3_dummy(a, b)    b = act5_dummy(a)  a = act1_dummy()
                 \                /                   /
                   \            /                  /
                      \       /                 /
                        \   /                /
                           act3_dummy(a, b)
    """
    a = act1_dummy()
    if a > 0:
        if a == 1:
            b = act2_dummy()
        else:
            b = act5_dummy(x=a)
        a = act3_dummy(a=a, b=b)
    else:
        a = act3_dummy(a=a, b=3)
        if a > 1:
            b = act5_dummy(x=a)
        else:
            b = act1_dummy()
    act3_dummy(a=a, b=b)


def test_workflow_with_nested_if_condition():
    expected_dag = WorkflowDAG(
        name="workflow_with_nested_if_condition",
        description=None,
        start=WorkflowStart(triggers=[]),
        dag={
            "start": ActionNode(id="start", type="start", children=["act1_dummy"]),
            # a = act1_dummy()
            "act1_dummy": ActionNode(
                id="act1_dummy",
                type="act1_dummy",
                result_name="a",
                children=["if"],
            ),
            # if a > 0
            "if": IfNode(
                id="if",
                type="if_condition",
                condition=BinaryConditionExpression(
                    lhs=ConstantConditionExpression(value="{{ a }}"),
                    op=BinaryOperator.GREATER_THAN,
                    rhs=ConstantConditionExpression(value=0),
                ),
                condition_str="a > 0",
                true_children=["if_1"],
                false_children=["act3_dummy_1"],
            ),
            # if a == 1
            "if_1": IfNode(
                id="if_1",
                type="if_condition",
                condition=BinaryConditionExpression(
                    lhs=ConstantConditionExpression(value="{{ a }}"),
                    op=BinaryOperator.EQUALS,
                    rhs=ConstantConditionExpression(value=1),
                ),
                condition_str="a == 1",
                true_children=["act2_dummy"],
                false_children=["act5_dummy"],
            ),
            # b = act2_dummy()
            "act2_dummy": ActionNode(
                id="act2_dummy",
                type="act2_dummy",
                result_name="b",
                children=["act3_dummy"],
            ),
            # b = act5_dummy(a)
            "act5_dummy": ActionNode(
                id="act5_dummy",
                type="act5_dummy",
                result_name="b",
                args={"x": "{{ a }}"},
                children=["act3_dummy"],
            ),
            # a = act3_dummy(a, b)
            "act3_dummy": ActionNode(
                id="act3_dummy",
                type="act3_dummy",
                result_name="a",
                args={"a": "{{ a }}", "b": "{{ b }}"},
                children=["act3_dummy_2"],
            ),
            # a = act3_dummy(a, 3)
            "act3_dummy_1": ActionNode(
                id="act3_dummy_1",
                type="act3_dummy",
                result_name="a",
                args={"a": "{{ a }}", "b": 3},
                children=["if_2"],
            ),
            # if a > 1
            "if_2": IfNode(
                id="if_2",
                type="if_condition",
                condition=BinaryConditionExpression(
                    lhs=ConstantConditionExpression(value="{{ a }}"),
                    op=BinaryOperator.GREATER_THAN,
                    rhs=ConstantConditionExpression(value=1),
                ),
                condition_str="a > 1",
                true_children=["act5_dummy_1"],
                false_children=["act1_dummy_1"],
            ),
            # b = act5_dummy(a)
            "act5_dummy_1": ActionNode(
                id="act5_dummy_1",
                type="act5_dummy",
                result_name="b",
                args={"x": "{{ a }}"},
                children=["act3_dummy_2"],
            ),
            # a = act1_dummy()
            "act1_dummy_1": ActionNode(
                id="act1_dummy_1",
                type="act1_dummy",
                result_name="b",
                children=["act3_dummy_2"],
            ),
            # act3_dummy(a, b)
            "act3_dummy_2": ActionNode(
                id="act3_dummy_2",
                type="act3_dummy",
                args={"a": "{{ a }}", "b": "{{ b }}"},
            ),
        },
    )
    dag = WorkflowCompiler().compile(workflow_with_nested_if_condition)
    assert dag == expected_dag
    assert WorkflowDAG.model_validate(dag.model_dump()) == expected_dag


#########################################################################################################


@workflow
def workflow_with_nested_if_condition2(payload: dict[str, JsonValue]):
    """
        Expected Workflow Graph:

                         <START>
                            |
                        a = act1_dummy()
                            |
                         if a > 0
                      T/          \F
                 if a == 1        a = act3_dummy(a, 3)
                T/      \F              |
    b = act2_dummy()  b = act5_dummy(a) |
                \       /               |
          a = act3_dummy(a, b)          |
                     \                  |
                       \                |
                         \              |
                           \           /
                             \       /
                               \   /
                              act2_dummy()
    """
    a = act1_dummy()
    if a > 0:
        if a == 1:
            b = act2_dummy()
        else:
            b = act5_dummy(x=a)
        a = act3_dummy(a=a, b=b)
    else:
        a = act3_dummy(a=a, b=3)
    act2_dummy(run_after=[a])


def test_workflow_with_nested_if_condition2():
    expected_dag = WorkflowDAG(
        name="workflow_with_nested_if_condition2",
        description=None,
        start=WorkflowStart(triggers=[]),
        dag={
            "start": ActionNode(id="start", type="start", children=["act1_dummy"]),
            # a = act1_dummy()
            "act1_dummy": ActionNode(
                id="act1_dummy",
                type="act1_dummy",
                result_name="a",
                children=["if"],
            ),
            # if a > 0
            "if": IfNode(
                id="if",
                type="if_condition",
                condition=BinaryConditionExpression(
                    lhs=ConstantConditionExpression(value="{{ a }}"),
                    op=BinaryOperator.GREATER_THAN,
                    rhs=ConstantConditionExpression(value=0),
                ),
                condition_str="a > 0",
                true_children=["if_1"],
                false_children=["act3_dummy_1"],
            ),
            # if a == 1
            "if_1": IfNode(
                id="if_1",
                type="if_condition",
                condition=BinaryConditionExpression(
                    lhs=ConstantConditionExpression(value="{{ a }}"),
                    op=BinaryOperator.EQUALS,
                    rhs=ConstantConditionExpression(value=1),
                ),
                condition_str="a == 1",
                true_children=["act2_dummy"],
                false_children=["act5_dummy"],
            ),
            # b = act2_dummy()
            "act2_dummy": ActionNode(
                id="act2_dummy",
                type="act2_dummy",
                result_name="b",
                children=["act3_dummy"],
            ),
            # b = act5_dummy(a)
            "act5_dummy": ActionNode(
                id="act5_dummy",
                type="act5_dummy",
                result_name="b",
                args={"x": "{{ a }}"},
                children=["act3_dummy"],
            ),
            # a = act3_dummy(a, b)
            "act3_dummy": ActionNode(
                id="act3_dummy",
                type="act3_dummy",
                result_name="a",
                args={"a": "{{ a }}", "b": "{{ b }}"},
                children=["act2_dummy_1"],
            ),
            # a = act3_dummy(a, 3)
            "act3_dummy_1": ActionNode(
                id="act3_dummy_1",
                type="act3_dummy",
                result_name="a",
                args={"a": "{{ a }}", "b": 3},
                children=["act2_dummy_1"],
            ),
            # act2_dummy()
            "act2_dummy_1": ActionNode(id="act2_dummy_1", type="act2_dummy"),
        },
    )
    dag = WorkflowCompiler().compile(workflow_with_nested_if_condition2)
    assert dag == expected_dag
    assert WorkflowDAG.model_validate(dag.model_dump()) == expected_dag


#########################################################################################################


@workflow
def workflow_move_action_to_top(payload: dict[str, JsonValue]):
    """
                                   <START>
                                  /       \
                      a = act1_dummy()    act2_dummy()
                          |
                       if a > 0
                     T/        \F
              if a != 1     a = act3_dummy(a, 3)
             T/       \F
  b = act2_dummy()   b = act1_dummy()
               \      /
            a = act3_dummy(a, b)
    """
    a = act1_dummy()
    if a > 0:
        if a != 1:
            b = act2_dummy()
        else:
            b = act1_dummy()
        a = act3_dummy(a=a, b=b)
    else:
        a = act3_dummy(a=a, b=3)
    act2_dummy()


def test_workflow_move_action_to_top():
    expected_dag = WorkflowDAG(
        name="workflow_move_action_to_top",
        description=None,
        start=WorkflowStart(triggers=[]),
        dag={
            "start": ActionNode(
                id="start",
                type="start",
                children=["act1_dummy", "act2_dummy_1"],
            ),
            # a = act1_dummy()
            "act1_dummy": ActionNode(
                id="act1_dummy",
                type="act1_dummy",
                result_name="a",
                children=["if"],
            ),
            # if a > 0
            "if": IfNode(
                id="if",
                type="if_condition",
                condition=BinaryConditionExpression(
                    lhs=ConstantConditionExpression(value="{{ a }}"),
                    op=BinaryOperator.GREATER_THAN,
                    rhs=ConstantConditionExpression(value=0),
                ),
                condition_str="a > 0",
                true_children=["if_1"],
                false_children=["act3_dummy_1"],
            ),
            # if a != 1
            "if_1": IfNode(
                id="if_1",
                type="if_condition",
                condition=BinaryConditionExpression(
                    lhs=ConstantConditionExpression(value="{{ a }}"),
                    op=BinaryOperator.NOT_EQUALS,
                    rhs=ConstantConditionExpression(value=1),
                ),
                condition_str="a != 1",
                true_children=["act2_dummy"],
                false_children=["act1_dummy_1"],
            ),
            # b = act2_dummy()
            "act2_dummy": ActionNode(
                id="act2_dummy",
                type="act2_dummy",
                result_name="b",
                children=["act3_dummy"],
            ),
            # b = act1_dummy()
            "act1_dummy_1": ActionNode(
                id="act1_dummy_1",
                type="act1_dummy",
                result_name="b",
                children=["act3_dummy"],
            ),
            # a = act3_dummy(a, b)
            "act3_dummy": ActionNode(
                id="act3_dummy",
                type="act3_dummy",
                result_name="a",
                args={"a": "{{ a }}", "b": "{{ b }}"},
            ),
            # a = act3_dummy(a, 3)
            "act3_dummy_1": ActionNode(
                id="act3_dummy_1",
                type="act3_dummy",
                result_name="a",
                args={"a": "{{ a }}", "b": 3},
            ),
            # act2_dummy()
            "act2_dummy_1": ActionNode(id="act2_dummy_1", type="act2_dummy"),
        },
    )
    dag = WorkflowCompiler().compile(workflow_move_action_to_top)
    assert dag == expected_dag
    assert WorkflowDAG.model_validate(dag.model_dump()) == expected_dag


#########################################################################################################


@workflow
def workflow_with_nested_if_condition3(payload: dict[str, JsonValue]):
    """
    Expected Workflow Graph:

                                 <START>
                                    |
                                a = act1_dummy()
                                    |
                                if a > 0
                            T/    T|       \F
                           /       |           \
                         /         |              \
         b = act1_dummy()    if a == 1              d = act2_dummy()
                  |          T/      \F                   |
                  | c = act2_dummy()  c = act1_dummy()    |
                   \         \        /                   |
                     \          \    /                    |
                     d = act3_dummy(b, c)               /
                                     \                /
                                        \           /
                                       act3_dummy(a, d)
    """
    a = act1_dummy()
    if a > 0:
        b = act1_dummy()
        if a == 1:
            c = act2_dummy()
        else:
            c = act1_dummy()
        d = act3_dummy(a=b, b=c)
    else:
        d = act2_dummy()
    act3_dummy(a=a, b=d)


def test_workflow_with_nested_if_condition3():
    expected_dag = WorkflowDAG(
        name="workflow_with_nested_if_condition3",
        description=None,
        start=WorkflowStart(triggers=[]),
        dag={
            "start": ActionNode(id="start", type="start", children=["act1_dummy"]),
            # a = act1_dummy()
            "act1_dummy": ActionNode(
                id="act1_dummy",
                type="act1_dummy",
                result_name="a",
                children=["if"],
            ),
            # if a > 0
            "if": IfNode(
                id="if",
                type="if_condition",
                condition=BinaryConditionExpression(
                    lhs=ConstantConditionExpression(value="{{ a }}"),
                    op=BinaryOperator.GREATER_THAN,
                    rhs=ConstantConditionExpression(value=0),
                ),
                condition_str="a > 0",
                true_children=["act1_dummy_1", "if_1"],
                false_children=["act2_dummy_1"],
            ),
            # b = act1_dummy()
            "act1_dummy_1": ActionNode(
                id="act1_dummy_1",
                type="act1_dummy",
                result_name="b",
                children=["act3_dummy"],
            ),
            # if a == 1
            "if_1": IfNode(
                id="if_1",
                type="if_condition",
                condition=BinaryConditionExpression(
                    lhs=ConstantConditionExpression(value="{{ a }}"),
                    op=BinaryOperator.EQUALS,
                    rhs=ConstantConditionExpression(value=1),
                ),
                condition_str="a == 1",
                true_children=["act2_dummy"],
                false_children=["act1_dummy_2"],
            ),
            # c = act2_dummy()
            "act2_dummy": ActionNode(
                id="act2_dummy",
                type="act2_dummy",
                result_name="c",
                children=["act3_dummy"],
            ),
            # c = act1_dummy()
            "act1_dummy_2": ActionNode(
                id="act1_dummy_2",
                type="act1_dummy",
                result_name="c",
                children=["act3_dummy"],
            ),
            # d = act3_dummy(b, c)
            "act3_dummy": ActionNode(
                id="act3_dummy",
                type="act3_dummy",
                result_name="d",
                args={"a": "{{ b }}", "b": "{{ c }}"},
                children=["act3_dummy_1"],
            ),
            # d = act2_dummy()
            "act2_dummy_1": ActionNode(
                id="act2_dummy_1",
                type="act2_dummy",
                result_name="d",
                children=["act3_dummy_1"],
            ),
            # act3_dummy(a, d)
            "act3_dummy_1": ActionNode(
                id="act3_dummy_1",
                type="act3_dummy",
                args={"a": "{{ a }}", "b": "{{ d }}"},
            ),
        },
    )
    dag = WorkflowCompiler().compile(workflow_with_nested_if_condition3)
    assert dag == expected_dag
    assert WorkflowDAG.model_validate(dag.model_dump()) == expected_dag


#########################################################################################################


@workflow
def workflow_multiple_nested_if_conditions(payload: dict[str, JsonValue]):
    """
    Expected Workflow Graph:

                          <START>
                             |
                        a = act1_dummy()
                             |
                         if a == 1
                            T|
                        b = act2_dummy()
                             |
                          if b == 2
                        T/        \F
        c = act3_dummy(a, b)      act4_dummy()
                  |
        x = act3_dummy(b, c)
                  |
              if x > 0
                 T|
                act5_dummy(x)
    """
    a = act1_dummy()
    if a == 1:
        b = act2_dummy()
        if b == 2:
            c = act3_dummy(a=a, b=b)
            x = act3_dummy(a=b, b=c)
            if x > 0:
                act5_dummy(x=x)
        else:
            act4_dummy()


def test_workflow_multiple_nested_if_conditions():
    expected_dag = WorkflowDAG(
        name="workflow_multiple_nested_if_conditions",
        description=None,
        start=WorkflowStart(triggers=[]),
        dag={
            "start": ActionNode(id="start", type="start", children=["act1_dummy"]),
            # a = act1_dummy()
            "act1_dummy": ActionNode(
                id="act1_dummy",
                type="act1_dummy",
                result_name="a",
                children=["if"],
            ),
            # if a == 1
            "if": IfNode(
                id="if",
                type="if_condition",
                condition=BinaryConditionExpression(
                    lhs=ConstantConditionExpression(value="{{ a }}"),
                    op=BinaryOperator.EQUALS,
                    rhs=ConstantConditionExpression(value=1),
                ),
                condition_str="a == 1",
                true_children=["act2_dummy"],
            ),
            # b = act2_dummy()
            "act2_dummy": ActionNode(
                id="act2_dummy",
                type="act2_dummy",
                result_name="b",
                children=["if_1"],
            ),
            # if b == 2
            "if_1": IfNode(
                id="if_1",
                type="if_condition",
                condition=BinaryConditionExpression(
                    lhs=ConstantConditionExpression(value="{{ b }}"),
                    op=BinaryOperator.EQUALS,
                    rhs=ConstantConditionExpression(value=2),
                ),
                condition_str="b == 2",
                true_children=["act3_dummy"],
                false_children=["act4_dummy"],
            ),
            # c = act3_dummy(a, b)
            "act3_dummy": ActionNode(
                id="act3_dummy",
                type="act3_dummy",
                result_name="c",
                args={"a": "{{ a }}", "b": "{{ b }}"},
                children=["act3_dummy_1"],
            ),
            # x = act3_dummy(b, c)
            "act3_dummy_1": ActionNode(
                id="act3_dummy_1",
                type="act3_dummy",
                result_name="x",
                args={"a": "{{ b }}", "b": "{{ c }}"},
                children=["if_2"],
            ),
            # if x > 0
            "if_2": IfNode(
                id="if_2",
                type="if_condition",
                condition=BinaryConditionExpression(
                    lhs=ConstantConditionExpression(value="{{ x }}"),
                    op=BinaryOperator.GREATER_THAN,
                    rhs=ConstantConditionExpression(value=0),
                ),
                condition_str="x > 0",
                true_children=["act5_dummy"],
            ),
            # act5_dummy(x)
            "act5_dummy": ActionNode(
                id="act5_dummy",
                type="act5_dummy",
                args={"x": "{{ x }}"},
            ),
            # act4_dummy()
            "act4_dummy": ActionNode(id="act4_dummy", type="act4_dummy"),
        },
    )
    dag = WorkflowCompiler().compile(workflow_multiple_nested_if_conditions)
    assert dag == expected_dag
    assert WorkflowDAG.model_validate(dag.model_dump()) == expected_dag


#########################################################################################################


@workflow
def workflow_with_unsupported_statement_in_body(payload: dict[str, JsonValue]):
    a = act1_dummy()
    a += 1


def test_workflow_with_unsupported_statement_in_body():
    with pytest.raises(Exception) as e:
        WorkflowCompiler().compile(workflow_with_unsupported_statement_in_body)
    assert str(e.value) == "Unsupported statement in workflow function: a += 1\n"


#########################################################################################################


def unregistered_action():
    return 1


@workflow
def workflow_not_an_action(payload: dict[str, JsonValue]):
    unregistered_action()


def test_workflow_not_an_action():
    with pytest.raises(Exception) as e:
        WorkflowCompiler().compile(workflow_not_an_action)
    assert (
        str(e.value)
        == 'Function "unregistered_action" is not an action. Please register the function as an action if you want to use it in the workflow.'
    )


#########################################################################################################


@workflow
def workflow_multi_target(payload: dict[str, JsonValue]):
    a, b = act1_dummy(), act1_dummy()  # noqa F841


def test_workflow_multi_target():
    with pytest.raises(Exception) as e:
        WorkflowCompiler().compile(workflow_multi_target)
    assert (
        str(e.value)
        == "Failed to compile a, b = act1_dummy(), act1_dummy()\nOnly single target assignments are supported."
    )


#########################################################################################################


@workflow
def workflow_with_unary_condition_expression(payload: dict[str, JsonValue]):
    a = act1_dummy()
    if not a:
        a = act2_dummy()


def test_workflow_with_unary_condition_expression():
    expected_dag = WorkflowDAG(
        name="workflow_with_unary_condition_expression",
        description=None,
        start=WorkflowStart(triggers=[]),
        dag={
            "start": ActionNode(id="start", type="start", children=["act1_dummy"]),
            # a = act1_dummy()
            "act1_dummy": ActionNode(
                id="act1_dummy",
                type="act1_dummy",
                result_name="a",
                children=["if"],
            ),
            # if not a
            "if": IfNode(
                id="if",
                type="if_condition",
                condition=UnaryConditionExpression(
                    op=UnaryOperator.NOT,
                    expr=ConstantConditionExpression(value="{{ a }}"),
                ),
                condition_str="not a",
                true_children=["act2_dummy"],
                false_children=[],
            ),
            # a = act2_dummy()
            "act2_dummy": ActionNode(
                id="act2_dummy", type="act2_dummy", result_name="a"
            ),
        },
    )
    dag = WorkflowCompiler().compile(workflow_with_unary_condition_expression)
    assert dag == expected_dag
    assert WorkflowDAG.model_validate(dag.model_dump()) == expected_dag


#########################################################################################################


@workflow
def workflow_with_or_condition_expression(payload: dict[str, JsonValue]):
    a = act1_dummy()
    if a == 1 or a == 2:
        a = act2_dummy()


def test_workflow_with_or_condition_expression():
    expected_dag = WorkflowDAG(
        name="workflow_with_or_condition_expression",
        description=None,
        start=WorkflowStart(triggers=[]),
        dag={
            "start": ActionNode(id="start", type="start", children=["act1_dummy"]),
            # a = act1_dummy()
            "act1_dummy": ActionNode(
                id="act1_dummy",
                type="act1_dummy",
                result_name="a",
                children=["if"],
            ),
            # if a == 1 or a == 2
            "if": IfNode(
                id="if",
                type="if_condition",
                condition=OrConditionExpression(
                    or_expr=[
                        BinaryConditionExpression(
                            lhs=ConstantConditionExpression(value="{{ a }}"),
                            op=BinaryOperator.EQUALS,
                            rhs=ConstantConditionExpression(value=1),
                        ),
                        BinaryConditionExpression(
                            lhs=ConstantConditionExpression(value="{{ a }}"),
                            op=BinaryOperator.EQUALS,
                            rhs=ConstantConditionExpression(value=2),
                        ),
                    ]
                ),
                condition_str="a == 1 or a == 2",
                true_children=["act2_dummy"],
                false_children=[],
            ),
            # a = act2_dummy()
            "act2_dummy": ActionNode(
                id="act2_dummy", type="act2_dummy", result_name="a"
            ),
        },
    )
    dag = WorkflowCompiler().compile(workflow_with_or_condition_expression)
    assert dag == expected_dag
    assert WorkflowDAG.model_validate(dag.model_dump()) == expected_dag


#########################################################################################################


@workflow
def workflow_with_and_but_unary(payload: dict[str, JsonValue]):
    a = act1_dummy()
    if a == 1 and not a:
        a = act2_dummy()


def test_workflow_with_and_but_unary():
    expected_dag = WorkflowDAG(
        name="workflow_with_and_but_unary",
        description=None,
        start=WorkflowStart(triggers=[]),
        dag={
            "start": ActionNode(id="start", type="start", children=["act1_dummy"]),
            # a = act1_dummy()
            "act1_dummy": ActionNode(
                id="act1_dummy",
                type="act1_dummy",
                result_name="a",
                children=["if"],
            ),
            # if a == 1 and not a
            "if": IfNode(
                id="if",
                type="if_condition",
                condition=AndConditionExpression(
                    and_expr=[
                        BinaryConditionExpression(
                            lhs=ConstantConditionExpression(value="{{ a }}"),
                            op=BinaryOperator.EQUALS,
                            rhs=ConstantConditionExpression(value=1),
                        ),
                        UnaryConditionExpression(
                            op=UnaryOperator.NOT,
                            expr=ConstantConditionExpression(value="{{ a }}"),
                        ),
                    ]
                ),
                condition_str="a == 1 and not a",
                true_children=["act2_dummy"],
                false_children=[],
            ),
            # a = act2_dummy()
            "act2_dummy": ActionNode(
                id="act2_dummy", type="act2_dummy", result_name="a"
            ),
        },
    )
    dag = WorkflowCompiler().compile(workflow_with_and_but_unary)
    assert dag == expected_dag
    assert WorkflowDAG.model_validate(dag.model_dump()) == expected_dag


#########################################################################################################


@workflow
def workflow_invalid_expression(payload: dict[str, JsonValue]):
    a = act1_dummy()
    yield a


def test_workflow_invalid_expression():
    with pytest.raises(Exception) as e:
        WorkflowCompiler().compile(workflow_invalid_expression)
    assert str(e.value) == "Failed to compile (yield a)\nUnsupported expression."


#########################################################################################################


@workflow
def workflow_unsupported_comparison_operator(payload: dict[str, JsonValue]):
    a = act1_dummy()
    if a in "abc":
        a = act2_dummy()


def test_workflow_unsupported_comparison_operator():
    expected_dag = WorkflowDAG(
        name="workflow_unsupported_comparison_operator",
        description=None,
        start=WorkflowStart(triggers=[]),
        dag={
            "start": ActionNode(id="start", type="start", children=["act1_dummy"]),
            # a = act1_dummy()
            "act1_dummy": ActionNode(
                id="act1_dummy",
                type="act1_dummy",
                result_name="a",
                children=["if"],
            ),
            # if a in "abc"
            "if": IfNode(
                id="if",
                type="if_condition",
                condition=BinaryConditionExpression(
                    lhs=ConstantConditionExpression(value="{{ a }}"),
                    op=BinaryOperator.IN,
                    rhs=ConstantConditionExpression(value="abc"),
                ),
                condition_str='a in "abc"',
                true_children=["act2_dummy"],
                false_children=[],
            ),
            # a = act2_dummy()
            "act2_dummy": ActionNode(
                id="act2_dummy", type="act2_dummy", result_name="a"
            ),
        },
    )
    dag = WorkflowCompiler().compile(workflow_unsupported_comparison_operator)
    assert dag == expected_dag
    assert WorkflowDAG.model_validate(dag.model_dump()) == expected_dag


#########################################################################################################


@workflow
def workflow_with_function_call_in_condition_expression(payload: dict[str, JsonValue]):
    if act1_dummy() == 1:
        act2_dummy()


def test_workflow_with_function_call_in_condition_expression():
    with pytest.raises(Exception) as e:
        WorkflowCompiler().compile(workflow_with_function_call_in_condition_expression)
    assert str(e.value) == "Unsupported condition expression: act1_dummy()\n"


#########################################################################################################


@workflow
def workflow_input(payload: dict[str, JsonValue]):
    """
    Input:

    {
        "a": "value1",
        "b": "value2"
    }

    => we extract the parameters from body
    """
    act3_dummy(a=payload["a"], b=payload["b"])


def test_workflow_input():
    expected_dag = WorkflowDAG(
        name="workflow_input",
        description=None,
        start=WorkflowStart(triggers=[]),
        dag={
            "start": ActionNode(id="start", type="start", children=["act3_dummy"]),
            # act3_dummy(a, b)
            "act3_dummy": ActionNode(
                id="act3_dummy",
                type="act3_dummy",
                args={"a": "{{ payload['a'] }}", "b": "{{ payload['b'] }}"},
            ),
        },
    )
    dag = WorkflowCompiler().compile(workflow_input)
    assert dag == expected_dag
    assert WorkflowDAG.model_validate(dag.model_dump()) == expected_dag


#########################################################################################################


@workflow
def workflow_input_with_json_body(payload: dict[str, JsonValue]):
    """
    Input:

    Arbitrary JSON body
    """
    act5_dummy(x=payload["a"][0])


def test_workflow_input_with_json_body():
    expected_dag = WorkflowDAG(
        name="workflow_input_with_json_body",
        description=None,
        start=WorkflowStart(triggers=[]),
        dag={
            "start": ActionNode(id="start", type="start", children=["act5_dummy"]),
            # act5_dummy(payload["a"][0])
            "act5_dummy": ActionNode(
                id="act5_dummy",
                type="act5_dummy",
                args={"x": "{{ payload['a'][0] }}"},
            ),
        },
    )
    dag = WorkflowCompiler().compile(workflow_input_with_json_body)
    assert dag == expected_dag
    assert WorkflowDAG.model_validate(dag.model_dump()) == expected_dag


#########################################################################################################


@workflow
def workflow_input_with_json_body2(payload: dict[str, JsonValue] = {}):
    act5_dummy(x=payload["a"][0])


def test_workflow_input_with_json_body_and_default():
    with pytest.raises(Exception) as e:
        WorkflowCompiler().compile(workflow_input_with_json_body2)
    assert (
        str(e.value)
        == 'Failed to compile workflow "workflow_input_with_json_body2" because the workflow function must have exactly one parameter called "payload" and no default value: payload: dict[str, JsonValue]'
    )


#########################################################################################################


@workflow(
    description="This is a description of my workflow", controls=["CC4.1", "CC2.3"]
)
def workflow_with_controls(payload: dict[str, JsonValue]):
    dummy_test_action1()


def test_workflow_with_controls():
    expected_dag = WorkflowDAG(
        name="workflow_with_controls",
        description="This is a description of my workflow",
        start=WorkflowStart(triggers=[]),
        controls=["CC4.1", "CC2.3"],
        dag={
            "start": ActionNode(
                id="start", type="start", children=["dummy_test_action1"]
            ),
            # dummy_test_action1()
            "dummy_test_action1": ActionNode(
                id="dummy_test_action1",
                type="dummy_test_action1",
            ),
        },
    )
    dag = WorkflowCompiler().compile(workflow_with_controls)
    assert dag == expected_dag
    assert WorkflowDAG.model_validate(dag.model_dump()) == expected_dag


#########################################################################################################


@workflow
def workflow_input_mixed(payload: dict[str, JsonValue]):
    """
    Expected Workflow Graph:

                           <START>
                         /         \
    x = act5_dummy(payload["a"][0])       y = act3_dummy(a, payload["b"]
                         \         /
                        z = act3_dummy(x, y)
                             |
                         act3_dummy(z, b)
    
    Input:

    {
        "a": "value1",
        ...
    }
    """
    x = act5_dummy(x=payload["a"][0])
    y = act3_dummy(a=payload["a"], b=payload["b"])
    z = act3_dummy(a=x, b=y)
    act3_dummy(a=z, b=payload["b"])


def test_workflow_input_mixed():
    expected_dag = WorkflowDAG(
        name="workflow_input_mixed",
        description=None,
        start=WorkflowStart(triggers=[]),
        dag={
            "start": ActionNode(
                id="start",
                type="start",
                children=["act5_dummy", "act3_dummy"],
            ),
            # act5_dummy(payload["a"][0])
            "act5_dummy": ActionNode(
                id="act5_dummy",
                type="act5_dummy",
                args={"x": "{{ payload['a'][0] }}"},
                result_name="x",
                children=["act3_dummy_1"],
            ),
            # act3_dummy(a, payload["b"])
            "act3_dummy": ActionNode(
                id="act3_dummy",
                type="act3_dummy",
                args={"a": "{{ payload['a'] }}", "b": "{{ payload['b'] }}"},
                result_name="y",
                children=["act3_dummy_1"],
            ),
            # act3_dummy(x, y)
            "act3_dummy_1": ActionNode(
                id="act3_dummy_1",
                type="act3_dummy",
                args={"a": "{{ x }}", "b": "{{ y }}"},
                result_name="z",
                children=["act3_dummy_2"],
            ),
            # act3_dummy(z, b)
            "act3_dummy_2": ActionNode(
                id="act3_dummy_2",
                type="act3_dummy",
                args={"a": "{{ z }}", "b": "{{ payload['b'] }}"},
            ),
        },
    )
    dag = WorkflowCompiler().compile(workflow_input_mixed)
    assert dag == expected_dag
    assert WorkflowDAG.model_validate(dag.model_dump()) == expected_dag


#########################################################################################################


@workflow
def workflow_with_variable_dependency(payload: dict[str, JsonValue]):
    """
    Expected Workflow Graph:

        <START>
           |
        a = act1_dummy()
           |
        a = act2_dummy()
           |
         act5_dummy(a)
    """
    a = act1_dummy()
    a = act2_dummy()
    act5_dummy(x=a)


def test_workflow_with_variable_dependency():
    expected_dag = WorkflowDAG(
        name="workflow_with_variable_dependency",
        description=None,
        start=WorkflowStart(triggers=[]),
        dag={
            "start": ActionNode(id="start", type="start", children=["act1_dummy"]),
            # a = act1_dummy()
            "act1_dummy": ActionNode(
                id="act1_dummy",
                type="act1_dummy",
                result_name="a",
                children=["act2_dummy"],
            ),
            # a = act2_dummy()
            "act2_dummy": ActionNode(
                id="act2_dummy",
                type="act2_dummy",
                result_name="a",
                children=["act5_dummy"],
            ),
            # act5_dummy(a)
            "act5_dummy": ActionNode(
                id="act5_dummy",
                type="act5_dummy",
                args={"x": "{{ a }}"},
            ),
        },
    )
    dag = WorkflowCompiler().compile(workflow_with_variable_dependency)
    assert dag == expected_dag
    assert WorkflowDAG.model_validate(dag.model_dump()) == expected_dag


#########################################################################################################


# TODO: Support async workflows later on
# @workflow
# async def async_workflow(x: int):
#     a = await async_act1_dummy()
#     b = await async_act2_dummy(x=a)
#     act3_dummy(a=b, b=x)


# def test_async_workflow():
#     expected_dag = WorkflowDAG(
#         name=None,
#         description=None,
#         start=WorkflowStart(
#             triggers=[]
#         ),
#         dag={
#             "start": ActionNode(id="start", name="<START>", type="start", children=["async_act1_dummy"]),
#             # a = await async_act1_dummy()
#             "async_act1_dummy": ActionNode(id="async_act1_dummy", name="async_act1_dummy", type="async_act1_dummy", result_name="a", children=["async_act2_dummy"]),
#             # b = await async_act2_dummy(a)
#             "async_act2_dummy": ActionNode(id="async_act2_dummy", name="async_act2_dummy", type="async_act2_dummy", result_name="b", args={"x": "{{ a }}"}, children=["act3_dummy"]),
#             # act3_dummy(a, b)
#             "act3_dummy": ActionNode(id="act3_dummy", name="act3_dummy", type="act3_dummy", args={"a": "{{ b }}", "b": "{{ x }}"}),
#         }
#     )
#     compiler = WorkflowCompiler()
#     dag = compiler.compile(async_workflow)
#     assert dag == expected_dag


#########################################################################################################


@workflow(
    description="This is a description of my workflow",
    triggers=[Webhook(), Schedule(cron="0 0 * * *"), Schedule(interval_seconds=60)],
)
def workflow_triggers(payload: dict[str, JsonValue]):
    a = dummy_test_action1()
    b = dummy_test_action2(s=a)
    c = dummy_test_action2(s=b["a"])
    dummy_test_action1(run_after=[c])


def test_workflow_triggers():
    expected_dag = WorkflowDAG(
        name="workflow_triggers",
        description="This is a description of my workflow",
        start=WorkflowStart(
            triggers=[
                WorkflowWebhookTrigger(default_args=[]),
                WorkflowScheduleTrigger(cron="0 0 * * *", default_args=[]),
                WorkflowScheduleTrigger(interval_seconds=60, default_args=[]),
            ],
        ),
        dag={
            "start": ActionNode(
                id="start",
                type="start",
                children=["dummy_test_action1"],
            ),
            # a = dummy_test_action1()
            "dummy_test_action1": ActionNode(
                id="dummy_test_action1",
                type="dummy_test_action1",
                result_name="a",
                children=["dummy_test_action2"],
            ),
            # b = dummy_test_action2(a)
            "dummy_test_action2": ActionNode(
                id="dummy_test_action2",
                type="dummy_test_action2",
                result_name="b",
                args={"s": "{{ a }}"},
                children=["dummy_test_action2_1"],
            ),
            # c = dummy_test_action2(b["a"])
            "dummy_test_action2_1": ActionNode(
                id="dummy_test_action2_1",
                type="dummy_test_action2",
                result_name="c",
                args={"s": "{{ b['a'] }}"},
                children=["dummy_test_action1_1"],
            ),
            # dummy_test_action1(run_after=[c])
            "dummy_test_action1_1": ActionNode(
                id="dummy_test_action1_1",
                type="dummy_test_action1",
            ),
        },
    )
    dag = WorkflowCompiler().compile(workflow_triggers)
    assert dag == expected_dag
    assert WorkflowDAG.model_validate(dag.model_dump()) == expected_dag


#########################################################################################################


@workflow(
    description="This is a description of my workflow",
    triggers=[
        Webhook(a=1, b="test"),
        Schedule(cron="0 0 * * *", a=2, b="test2"),
        Schedule(interval_seconds=60, a=3, b="test3"),
    ],
)
def workflow_with_parameters(payload: dict[str, JsonValue]):
    """
    Expected workflow DAG:

                               <START>
                             /        \
    x = dummy_test_action2(a)           y = dummy_test_action2(b)
                             \        /
                    dummy_test_action3(x["a"], y["a"])

    """
    x = dummy_test_action2(s=payload["a"])
    y = dummy_test_action2(s=payload["b"])
    dummy_test_action3(s=x["a"], i=y["a"])


def test_workflow_with_parameters():
    expected_dag = WorkflowDAG(
        name="workflow_with_parameters",
        description="This is a description of my workflow",
        start=WorkflowStart(
            triggers=[
                WorkflowWebhookTrigger(
                    default_args=[
                        WorkflowDefaultArgument(name="a", value=1),
                        WorkflowDefaultArgument(name="b", value="test"),
                    ]
                ),
                WorkflowScheduleTrigger(
                    cron="0 0 * * *",
                    default_args=[
                        WorkflowDefaultArgument(name="a", value=2),
                        WorkflowDefaultArgument(name="b", value="test2"),
                    ],
                ),
                WorkflowScheduleTrigger(
                    interval_seconds=60,
                    default_args=[
                        WorkflowDefaultArgument(name="a", value=3),
                        WorkflowDefaultArgument(name="b", value="test3"),
                    ],
                ),
            ],
        ),
        dag={
            "start": ActionNode(
                id="start",
                type="start",
                children=["dummy_test_action2", "dummy_test_action2_1"],
            ),
            # x = dummy_test_action2(a)
            "dummy_test_action2": ActionNode(
                id="dummy_test_action2",
                type="dummy_test_action2",
                result_name="x",
                args={"s": "{{ payload['a'] }}"},
                children=["dummy_test_action3"],
            ),
            # y = dummy_test_action2(b)
            "dummy_test_action2_1": ActionNode(
                id="dummy_test_action2_1",
                type="dummy_test_action2",
                result_name="y",
                args={"s": "{{ payload['b'] }}"},
                children=["dummy_test_action3"],
            ),
            # dummy_test_action3(x["a"], y["a"])
            "dummy_test_action3": ActionNode(
                id="dummy_test_action3",
                type="dummy_test_action3",
                args={"s": "{{ x['a'] }}", "i": "{{ y['a'] }}"},
            ),
        },
    )
    dag = WorkflowCompiler().compile(workflow_with_parameters)
    assert dag == expected_dag
    assert WorkflowDAG.model_validate(dag.model_dump()) == expected_dag


#########################################################################################################


@workflow(
    description="This is a description of my workflow",
    triggers=[Webhook()],
)
def workflow_with_payload_and_if_condition(payload: dict[str, JsonValue]):
    if payload["x"] == payload["y"]:
        dummy_test_action1()
    else:
        dummy_test_action2(s=payload["a"])


def test_workflow_with_payload_and_if_condition():
    expected_dag = WorkflowDAG(
        name="workflow_with_payload_and_if_condition",
        description="This is a description of my workflow",
        start=WorkflowStart(triggers=[WorkflowWebhookTrigger(default_args=[])]),
        dag={
            "start": ActionNode(id="start", type="start", children=["if"]),
            # if x == payload["y"]
            "if": IfNode(
                id="if",
                type="if_condition",
                condition=BinaryConditionExpression(
                    lhs=ConstantConditionExpression(value="{{ payload['x'] }}"),
                    op=BinaryOperator.EQUALS,
                    rhs=ConstantConditionExpression(value="{{ payload['y'] }}"),
                ),
                condition_str='x == payload["y"]',
                true_children=["dummy_test_action1"],
                false_children=["dummy_test_action2"],
            ),
            # dummy_test_action1()
            "dummy_test_action1": ActionNode(
                id="dummy_test_action1",
                type="dummy_test_action1",
            ),
            # dummy_test_action2(payload["a"])
            "dummy_test_action2": ActionNode(
                id="dummy_test_action2",
                type="dummy_test_action2",
                args={"s": "{{ payload['a'] }}"},
            ),
        },
    )
    dag = WorkflowCompiler().compile(workflow_with_payload_and_if_condition)
    assert dag == expected_dag
    assert WorkflowDAG.model_validate(dag.model_dump()) == expected_dag


#########################################################################################################


# @workflow(
#     name="My Async Workflow",
#     description="This is a description of my async workflow",
#     triggers=[
#         Webhook(),
#         Schedule(cron="0 0 * * *"),
#         Schedule(interval_seconds=60)
#     ]
# )
# async def async_workflow():
#     a = await adummy_test_action1()
#     b = await adummy_test_action2(s=a)
#     c = await adummy_test_action2(s=b["a"])
#     await adummy_test_action1(run_after=[c])


# @pytest.mark.asyncio
# async def test_async_workflow():
#     expected_dag = WorkflowDAG(
#         name="My Async Workflow",
#         description="This is a description of my async workflow",
#         start=WorkflowStart(
#             required_args=[],
#             triggers=[
#                 WorkflowWebhookTrigger(default_args=[]),
#                 WorkflowScheduleTrigger(cron="0 0 * * *", default_args=[]),
#                 WorkflowScheduleTrigger(interval_seconds=60, default_args=[])
#             ]
#         ),
#         dag={
#             "start": ActionNode(id="start", name="<START>", type="start", children=["adummy_test_action1"]),
#             # a = await adummy_test_action1()
#             "adummy_test_action1": ActionNode(id="adummy_test_action1", name="adummy_test_action1", type="adummy_test_action1", result_name="a", children=["adummy_test_action2"]),
#             # b = await adummy_test_action2(a)
#             "adummy_test_action2": ActionNode(id="adummy_test_action2", name="adummy_test_action2", type="adummy_test_action2", result_name="b", args={"s": "{{ a }}"}, children=["adummy_test_action2_1"]),
#             # c = await adummy_test_action2(b["a"])
#             "adummy_test_action2_1": ActionNode(id="adummy_test_action2_1", name="adummy_test_action2", type="adummy_test_action2", result_name="c", args={"s": "{{ b.a }}"}, children=["adummy_test_action1_1"]),
#             # await adummy_test_action1(run_after=[c])
#             "adummy_test_action1_1": ActionNode(id="adummy_test_action1_1", name="adummy_test_action1", type="adummy_test_action1"),
#         }
#     )

#     dag = await async_workflow(return_workflow_dag=True)
#     assert dag == expected_dag


#########################################################################################################


@workflow
def missing_secrets_workflow(payload: dict[str, JsonValue]):
    dummy_test_action_with_secrets()


def test_missing_secrets_workflow():
    with pytest.raises(Exception) as e:
        WorkflowCompiler().compile(missing_secrets_workflow)
    assert (
        str(e.value)
        == "Failed to compile dummy_test_action_with_secrets because provided secrets do not match secrets placeholders."
    )


#########################################################################################################


@workflow
def unknown_secrets_workflow(payload: dict[str, JsonValue]):
    dummy_test_action_with_secrets(secrets={"UNKNOWN_SECRET": "my_secret"})


def test_unknown_secrets_workflow():
    with pytest.raises(Exception) as e:
        WorkflowCompiler().compile(unknown_secrets_workflow)
    assert (
        str(e.value)
        == "Failed to compile dummy_test_action_with_secrets because provided secrets do not match secrets placeholders."
    )


#########################################################################################################


@workflow
def too_many_with_unknown_secrets_workflow(payload: dict[str, JsonValue]):
    dummy_test_action_with_secrets(
        secrets={
            "MY_SECRET": "my_secret",
            "MY_SECRET_2": "my_secret_2",
            "UNKNOWN_SECRET": "my_secret",
        }
    )


def test_too_many_with_unknown_secrets_workflow():
    with pytest.raises(Exception) as e:
        WorkflowCompiler().compile(too_many_with_unknown_secrets_workflow)
    assert (
        str(e.value)
        == "Failed to compile dummy_test_action_with_secrets because provided secrets do not match secrets placeholders."
    )


#########################################################################################################


@workflow
def dict_and_list_construction_workflow(payload: dict[str, JsonValue]):
    result = action_with_dict_and_list_input(value={"key": "value"}, value2=[1, 2, 3])
    action_with_dict_and_list_input(
        value={
            "one": result,
            "two": f"adapted {result['key']} ... {result['key']}",
            "three": None,
            "nested": {
                result["key"]: result,
                "key2": f"Test 123 {result['key']} "
                f"Test 123 {result['key']} "
                "abcedefghijklmnopqrstuvwxyz",
            },
        },
        value2=[
            [1, 2],
            result,
            f"""{result['key']}""",
            {"something": {"deeply": "nested"}},
        ],
    )


def test_dict_and_list_construction_workflow():
    expected_dag = WorkflowDAG(
        name="dict_and_list_construction_workflow",
        start=WorkflowStart(triggers=[]),
        dag={
            "start": ActionNode(
                id="start",
                type="start",
                children=["action_with_dict_and_list_input"],
            ),
            # result = action_with_dict_and_list_input(
            #     value={"key": "value"},
            #     value2=[1, 2, 3]
            # )
            "action_with_dict_and_list_input": ActionNode(
                id="action_with_dict_and_list_input",
                type="action_with_dict_and_list_input",
                result_name="result",
                args={"value": {"key": "value"}, "value2": [1, 2, 3]},
                children=["action_with_dict_and_list_input_1"],
            ),
            # action_with_dict_and_list_input(
            #     value={
            #         "one": result,
            #         "two": f"adapted {result['key']} ... {result['key']}",
            #         "three": None,
            #         "nested": {
            #             result["key"]: result,
            #             "key2": f"Test 123 {result['key']} "
            #                 f"Test 123 {result['key']} "
            #                 "abcedefghijklmnopqrstuvwxyz"
            #         }
            #     },
            #     value2=[[1, 2], result, f"""{result['key']}"""]
            # )
            "action_with_dict_and_list_input_1": ActionNode(
                id="action_with_dict_and_list_input_1",
                type="action_with_dict_and_list_input",
                result_name=None,
                args={
                    "value": {
                        "one": "{{ result }}",
                        "two": "adapted {{ result['key'] }} ... {{ result['key'] }}",
                        "three": None,
                        "nested": {
                            "{{ result['key'] }}": "{{ result }}",
                            "key2": "Test 123 {{ result['key'] }} Test 123 {{ result['key'] }} abcedefghijklmnopqrstuvwxyz",
                        },
                    },
                    "value2": [
                        [1, 2],
                        "{{ result }}",
                        "{{ result['key'] }}",
                        {"something": {"deeply": "nested"}},
                    ],
                },
                children=[],
            ),
        },
    )
    dag = WorkflowCompiler().compile(dict_and_list_construction_workflow)
    assert dag == expected_dag
    assert WorkflowDAG.model_validate(dag.model_dump()) == expected_dag


#########################################################################################################


@workflow
def complex_if_condition_workflow(payload: dict[str, JsonValue]):
    # Note: and has higher precedence than or
    if payload["a"] == 1 and payload["b"] != 2 or payload["c"] <= 3:
        act1_dummy()
    elif payload["d"] in ["a", "b"]:
        act1_dummy()
    elif (payload["e"] is None) or (payload["f"] is not None):
        act1_dummy()
    elif (payload["a"] > 1) or (payload["b"] < 2 and payload["c"] >= 3):
        act1_dummy()
    elif payload["h"] in payload["l"]:
        act1_dummy()
    elif payload["k"]:
        act1_dummy()
    elif 1:
        act1_dummy()
    elif "abc":
        act1_dummy()
    elif not payload["m"]:
        act1_dummy()
    elif payload["n"] in {"abc": "defg"}:
        act1_dummy()


def test_complex_if_condition_workflow():
    expected_dag = WorkflowDAG(
        name="complex_if_condition_workflow",
        start=WorkflowStart(triggers=[]),
        dag={
            "start": ActionNode(
                id="start",
                type="start",
                children=["if"],
            ),
            # if payload["a"] == 1 and payload["b"] != 2 or payload["c"] <= 3
            "if": IfNode(
                id="if",
                type="if_condition",
                condition=OrConditionExpression(
                    or_expr=[
                        AndConditionExpression(
                            and_expr=[
                                BinaryConditionExpression(
                                    lhs=ConstantConditionExpression(
                                        value="{{ payload['a'] }}"
                                    ),
                                    op=BinaryOperator.EQUALS,
                                    rhs=ConstantConditionExpression(value=1),
                                ),
                                BinaryConditionExpression(
                                    lhs=ConstantConditionExpression(
                                        value="{{ payload['b'] }}"
                                    ),
                                    op=BinaryOperator.NOT_EQUALS,
                                    rhs=ConstantConditionExpression(value=2),
                                ),
                            ]
                        ),
                        BinaryConditionExpression(
                            lhs=ConstantConditionExpression(value="{{ payload['c'] }}"),
                            op=BinaryOperator.LESS_THAN_OR_EQUAL,
                            rhs=ConstantConditionExpression(value=3),
                        ),
                    ]
                ),
                condition_str='payload["a"] == 1 and payload["b"] != 2 or payload["c"] <= 3',
                true_children=["act1_dummy"],
                false_children=["if_1"],
            ),
            # act1_dummy()
            "act1_dummy": ActionNode(
                id="act1_dummy",
                type="act1_dummy",
            ),
            # elif payload["d"] in ["a", "b"]
            "if_1": IfNode(
                id="if_1",
                type="if_condition",
                condition=BinaryConditionExpression(
                    lhs=ConstantConditionExpression(value="{{ payload['d'] }}"),
                    op=BinaryOperator.IN,
                    rhs=ConstantConditionExpression(value=["a", "b"]),
                ),
                condition_str='payload["d"] in ["a", "b"]',
                true_children=["act1_dummy_1"],
                false_children=["if_2"],
            ),
            # act1_dummy()
            "act1_dummy_1": ActionNode(
                id="act1_dummy_1",
                type="act1_dummy",
            ),
            # elif (payload["e"] is None) or (payload["f"] is not None)
            "if_2": IfNode(
                id="if_2",
                type="if_condition",
                condition=OrConditionExpression(
                    or_expr=[
                        UnaryConditionExpression(
                            op=UnaryOperator.IS_NONE,
                            expr=ConstantConditionExpression(
                                value="{{ payload['e'] }}"
                            ),
                        ),
                        UnaryConditionExpression(
                            op=UnaryOperator.IS_NOT_NONE,
                            expr=ConstantConditionExpression(
                                value="{{ payload['f'] }}"
                            ),
                        ),
                    ]
                ),
                condition_str='(payload["e"] is None) or (payload["f"] is not None)',
                true_children=["act1_dummy_2"],
                false_children=["if_3"],
            ),
            # act1_dummy()
            "act1_dummy_2": ActionNode(
                id="act1_dummy_2",
                type="act1_dummy",
            ),
            # elif (payload["a"] > 1) or (payload["b"] < 2 and payload["c"] >= 3)
            "if_3": IfNode(
                id="if_3",
                type="if_condition",
                condition=OrConditionExpression(
                    or_expr=[
                        BinaryConditionExpression(
                            lhs=ConstantConditionExpression(value="{{ payload['a'] }}"),
                            op=BinaryOperator.GREATER_THAN,
                            rhs=ConstantConditionExpression(value=1),
                        ),
                        AndConditionExpression(
                            and_expr=[
                                BinaryConditionExpression(
                                    lhs=ConstantConditionExpression(
                                        value="{{ payload['b'] }}"
                                    ),
                                    op=BinaryOperator.LESS_THAN,
                                    rhs=ConstantConditionExpression(value=2),
                                ),
                                BinaryConditionExpression(
                                    lhs=ConstantConditionExpression(
                                        value="{{ payload['c'] }}"
                                    ),
                                    op=BinaryOperator.GREATER_THAN_OR_EQUAL,
                                    rhs=ConstantConditionExpression(value=3),
                                ),
                            ]
                        ),
                    ]
                ),
                condition_str='(payload["a"] > 1) or (payload["b"] < 2 and payload["c"] >= 3)',
                true_children=["act1_dummy_3"],
                false_children=["if_4"],
            ),
            # act1_dummy()
            "act1_dummy_3": ActionNode(
                id="act1_dummy_3",
                type="act1_dummy",
            ),
            # elif payload["h"] in payload["l"]
            "if_4": IfNode(
                id="if_4",
                type="if_condition",
                condition=BinaryConditionExpression(
                    lhs=ConstantConditionExpression(value="{{ payload['h'] }}"),
                    op=BinaryOperator.IN,
                    rhs=ConstantConditionExpression(value="{{ payload['l'] }}"),
                ),
                condition_str='payload["h"] in payload["l"]',
                true_children=["act1_dummy_4"],
                false_children=["if_5"],
            ),
            # act1_dummy()
            "act1_dummy_4": ActionNode(
                id="act1_dummy_4",
                type="act1_dummy",
            ),
            # elif payload["k"]
            "if_5": IfNode(
                id="if_5",
                type="if_condition",
                condition=ConstantConditionExpression(value="{{ payload['k'] }}"),
                condition_str='payload["k"]',
                true_children=["act1_dummy_5"],
                false_children=["if_6"],
            ),
            # act1_dummy()
            "act1_dummy_5": ActionNode(
                id="act1_dummy_5",
                type="act1_dummy",
            ),
            # elif 1
            "if_6": IfNode(
                id="if_6",
                type="if_condition",
                condition=ConstantConditionExpression(value=1),
                condition_str="1",
                true_children=["act1_dummy_6"],
                false_children=["if_7"],
            ),
            # act1_dummy()
            "act1_dummy_6": ActionNode(
                id="act1_dummy_6",
                type="act1_dummy",
            ),
            # elif "abc"
            "if_7": IfNode(
                id="if_7",
                type="if_condition",
                condition=ConstantConditionExpression(value="abc"),
                condition_str='"abc"',
                true_children=["act1_dummy_7"],
                false_children=["if_8"],
            ),
            # act1_dummy()
            "act1_dummy_7": ActionNode(
                id="act1_dummy_7",
                type="act1_dummy",
            ),
            # elif not payload["m"]
            "if_8": IfNode(
                id="if_8",
                type="if_condition",
                condition=UnaryConditionExpression(
                    op=UnaryOperator.NOT,
                    expr=ConstantConditionExpression(value="{{ payload['m'] }}"),
                ),
                condition_str='not payload["m"]',
                true_children=["act1_dummy_8"],
                false_children=["if_9"],
            ),
            # act1_dummy()
            "act1_dummy_8": ActionNode(
                id="act1_dummy_8",
                type="act1_dummy",
            ),
            # elif payload["n"] in {"abc": "defg"}
            "if_9": IfNode(
                id="if_9",
                type="if_condition",
                condition=BinaryConditionExpression(
                    lhs=ConstantConditionExpression(value="{{ payload['n'] }}"),
                    op=BinaryOperator.IN,
                    rhs=ConstantConditionExpression(value={"abc": "defg"}),
                ),
                condition_str='payload["n"] in {"abc": "defg"}',
                true_children=["act1_dummy_9"],
                false_children=[],
            ),
            # act1_dummy()
            "act1_dummy_9": ActionNode(
                id="act1_dummy_9",
                type="act1_dummy",
            ),
        },
    )
    dag = WorkflowCompiler().compile(complex_if_condition_workflow)
    assert dag == expected_dag
    assert WorkflowDAG.model_validate(dag.model_dump()) == expected_dag


#########################################################################################################


@workflow
def if_only_true_branch_workflow(payload: dict[str, JsonValue]):
    result = action_with_dict_and_list_input(value={"key": "value"}, value2=[1, 2, 3])
    if result["key"] == "value" and result["key"] is not None:
        action_with_dict_and_list_input(
            value={
                "one": result,
                "two": f"adapted {result['key']} ... {result['key']}",
                "three": None,
                "nested": {
                    result["key"]: result,
                    "key2": f"Test 123 {result['key']} "
                    f"Test 123 {result['key']} "
                    "abcedefghijklmnopqrstuvwxyz",
                },
            },
            value2=[[1, 2], result, f"""{result["key"]}"""],
        )


def test_if_only_true_branch_workflow():
    expected_dag = WorkflowDAG(
        name="if_only_true_branch_workflow",
        start=WorkflowStart(triggers=[]),
        dag={
            "start": ActionNode(
                id="start",
                type="start",
                children=["action_with_dict_and_list_input"],
            ),
            "action_with_dict_and_list_input": ActionNode(
                id="action_with_dict_and_list_input",
                type="action_with_dict_and_list_input",
                result_name="result",
                args={"value": {"key": "value"}, "value2": [1, 2, 3]},
                children=["if"],
            ),
            "if": IfNode(
                id="if",
                type="if_condition",
                condition=AndConditionExpression(
                    and_expr=[
                        BinaryConditionExpression(
                            lhs=ConstantConditionExpression(
                                value="{{ result['key'] }}"
                            ),
                            op=BinaryOperator.EQUALS,
                            rhs=ConstantConditionExpression(value="value"),
                        ),
                        UnaryConditionExpression(
                            op=UnaryOperator.IS_NOT_NONE,
                            expr=ConstantConditionExpression(
                                value="{{ result['key'] }}"
                            ),
                        ),
                    ]
                ),
                condition_str="result['key'] == 'value' and result['key'] is not None",
                true_children=["action_with_dict_and_list_input_1"],
                false_children=[],
            ),
            "action_with_dict_and_list_input_1": ActionNode(
                id="action_with_dict_and_list_input_1",
                type="action_with_dict_and_list_input",
                result_name=None,
                args={
                    "value": {
                        "one": "{{ result }}",
                        "two": "adapted {{ result['key'] }} ... {{ result['key'] }}",
                        "three": None,
                        "nested": {
                            "{{ result['key'] }}": "{{ result }}",
                            "key2": "Test 123 {{ result['key'] }} Test 123 {{ result['key'] }} abcedefghijklmnopqrstuvwxyz",
                        },
                    },
                    "value2": [
                        [1, 2],
                        "{{ result }}",
                        "{{ result['key'] }}",
                    ],
                },
            ),
        },
    )
    dag = WorkflowCompiler().compile(if_only_true_branch_workflow)
    assert dag == expected_dag
    assert WorkflowDAG.model_validate(dag.model_dump()) == expected_dag


#########################################################################################################


@workflow
def workflow_without_payload_param():
    act1_dummy()


def test_workflow_without_payload_param():
    with pytest.raises(Exception) as e:
        WorkflowCompiler().compile(workflow_without_payload_param)
    assert (
        str(e.value)
        == 'Failed to compile workflow "workflow_without_payload_param" because the workflow function must have exactly one parameter called "payload" and no default value: payload: dict[str, JsonValue]'
    )


#########################################################################################################


@workflow
def workflow_remove_transitive_dependencies_bug(payload: dict[str, JsonValue]):
    """
    Expected Workflow Graph:

                <START>
                  |
            a = act1_dummy()
                  |
             if a == 1
              True|
            b = act5_dummy(x=a)
                  |
            c = act5_dummy(x=b)
                  |
        d = wait(seconds=1, run_after=[c])
                  |
        e = act5_dummy(x=c, run_after=[d])
                  |
              if e == 2
              True|
            act3_dummy(a=d, b=a)
    """
    a = act1_dummy()
    if a == 1:
        b = act5_dummy(x=a)
        c = act5_dummy(x=b)
        d = wait(seconds=1, run_after=[c])
        e = act5_dummy(x=c, run_after=[d])
        if e == 2:
            act3_dummy(a=b, b=a)


def test_workflow_remove_transitive_dependencies_bug():
    expected_dag = WorkflowDAG(
        name="workflow_remove_transitive_dependencies_bug",
        start=WorkflowStart(triggers=[]),
        dag={
            "start": ActionNode(
                id="start",
                type="start",
                children=["act1_dummy"],
            ),
            # a = act1_dummy()
            "act1_dummy": ActionNode(
                id="act1_dummy",
                type="act1_dummy",
                result_name="a",
                children=["if"],
            ),
            # if a == 1
            "if": IfNode(
                id="if",
                type="if_condition",
                condition=BinaryConditionExpression(
                    lhs=ConstantConditionExpression(value="{{ a }}"),
                    op=BinaryOperator.EQUALS,
                    rhs=ConstantConditionExpression(value=1),
                ),
                condition_str="a == 1",
                true_children=["act5_dummy"],
            ),
            # b = act5_dummy(x=a)
            "act5_dummy": ActionNode(
                id="act5_dummy",
                type="act5_dummy",
                args={"x": "{{ a }}"},
                result_name="b",
                children=["act5_dummy_1"],
            ),
            # c = act5_dummy(x=b)
            "act5_dummy_1": ActionNode(
                id="act5_dummy_1",
                type="act5_dummy",
                args={"x": "{{ b }}"},
                result_name="c",
                children=["wait"],
            ),
            # d = wait(seconds=1, run_after=[c])
            "wait": ActionNode(
                id="wait",
                type="wait",
                args={"seconds": 1},
                result_name="d",
                children=["act5_dummy_2"],
            ),
            # d = act5_dummy(x=c)
            "act5_dummy_2": ActionNode(
                id="act5_dummy_2",
                type="act5_dummy",
                args={"x": "{{ c }}"},
                result_name="e",
                children=["if_1"],
            ),
            # if d == 2
            "if_1": IfNode(
                id="if_1",
                type="if_condition",
                condition=BinaryConditionExpression(
                    lhs=ConstantConditionExpression(value="{{ e }}"),
                    op=BinaryOperator.EQUALS,
                    rhs=ConstantConditionExpression(value=2),
                ),
                condition_str="e == 2",
                true_children=["act3_dummy"],
            ),
            # act3_dummy(a=b, b=a)
            "act3_dummy": ActionNode(
                id="act3_dummy",
                type="act3_dummy",
                args={"a": "{{ b }}", "b": "{{ a }}"},
            ),
        },
    )
    dag = WorkflowCompiler().compile(workflow_remove_transitive_dependencies_bug)
    assert dag == expected_dag
    assert WorkflowDAG.model_validate(dag.model_dump()) == expected_dag


#########################################################################################################


@workflow
def workflow_remove_transitive_dependencies_bug2(payload: dict[str, JsonValue]):
    """
    Expected Workflow Graph:

                <START>
                  |
            a = act1_dummy()
                  |
             if a == 1
              True|
            b = act5_dummy(x=a)
                  |
            c = act5_dummy(x=b)
                  |
            act3_dummy(a=b, b=c)
    """
    a = act1_dummy()
    if a == 1:
        b = act5_dummy(x=a)
        c = act5_dummy(x=b)
        act3_dummy(a=b, b=c)


def test_workflow_remove_transitive_dependencies_bug2():
    expected_dag = WorkflowDAG(
        name="workflow_remove_transitive_dependencies_bug2",
        start=WorkflowStart(triggers=[]),
        dag={
            "start": ActionNode(
                id="start",
                type="start",
                children=["act1_dummy"],
            ),
            # a = act1_dummy()
            "act1_dummy": ActionNode(
                id="act1_dummy",
                type="act1_dummy",
                result_name="a",
                children=["if"],
            ),
            # if a == 1
            "if": IfNode(
                id="if",
                type="if_condition",
                condition=BinaryConditionExpression(
                    lhs=ConstantConditionExpression(value="{{ a }}"),
                    op=BinaryOperator.EQUALS,
                    rhs=ConstantConditionExpression(value=1),
                ),
                condition_str="a == 1",
                true_children=["act5_dummy"],
            ),
            # b = act5_dummy(x=a)
            "act5_dummy": ActionNode(
                id="act5_dummy",
                type="act5_dummy",
                args={"x": "{{ a }}"},
                result_name="b",
                children=["act5_dummy_1"],
            ),
            # c = act5_dummy(x=b)
            "act5_dummy_1": ActionNode(
                id="act5_dummy_1",
                type="act5_dummy",
                args={"x": "{{ b }}"},
                result_name="c",
                children=["act3_dummy"],
            ),
            # act3_dummy(a=b, b=c)
            "act3_dummy": ActionNode(
                id="act3_dummy",
                type="act3_dummy",
                args={"a": "{{ b }}", "b": "{{ c }}"},
            ),
        },
    )
    dag = WorkflowCompiler().compile(workflow_remove_transitive_dependencies_bug2)
    assert dag == expected_dag
    assert WorkflowDAG.model_validate(dag.model_dump()) == expected_dag


#########################################################################################################


@workflow
def workflow_use_variable_only_emitted_by_one_branch(payload: dict[str, JsonValue]):
    """
    Expected Workflow Graph:

                <START>
                  |
             if payload["a"] == 1
            True/           \False
    b = act1_dummy()        |
                  \        /
                act5_dummy(x=b)

    Note: should pass None to act5_dummy if the condition is False
    """
    if payload["a"] == 1:
        b = act1_dummy()
    act5_dummy(x=b)


def test_workflow_use_variable_only_emitted_by_one_branch():
    expected_dag = WorkflowDAG(
        name="workflow_use_variable_only_emitted_by_one_branch",
        start=WorkflowStart(triggers=[]),
        dag={
            "start": ActionNode(
                id="start",
                type="start",
                children=["if"],
            ),
            # if payload["a] == 1
            "if": IfNode(
                id="if",
                type="if_condition",
                condition=BinaryConditionExpression(
                    lhs=ConstantConditionExpression(value="{{ payload['a'] }}"),
                    op=BinaryOperator.EQUALS,
                    rhs=ConstantConditionExpression(value=1),
                ),
                condition_str="payload['a'] == 1",
                true_children=["act1_dummy"],
                false_children=["act5_dummy"],
            ),
            # b = act1_dummy()
            "act1_dummy": ActionNode(
                id="act1_dummy",
                type="act1_dummy",
                result_name="b",
                children=["act5_dummy"],
            ),
            # act5_dummy(x=b)
            "act5_dummy": ActionNode(
                id="act5_dummy",
                type="act5_dummy",
                args={"x": "{{ b }}"},
            ),
        },
    )
    dag = WorkflowCompiler().compile(workflow_use_variable_only_emitted_by_one_branch)
    assert dag == expected_dag
    assert WorkflowDAG.model_validate(dag.model_dump()) == expected_dag
