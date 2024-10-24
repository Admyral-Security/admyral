from admyral.workers.if_condition_executor import (
    execute_if_condition,
    ConditionReferenceResolution,
)
from admyral.models import (
    ConstantConditionExpression,
    UnaryConditionExpression,
    BinaryConditionExpression,
    AndConditionExpression,
    OrConditionExpression,
    UnaryOperator,
    BinaryOperator,
    Condition,
)


def evaluate(expr: Condition, execution_state: dict[str, any]) -> bool:
    resolved_condition = ConditionReferenceResolution(
        execution_state
    ).resolve_references(expr)
    return execute_if_condition(resolved_condition.model_dump())


# Condition: {{ a }}
def test_constant_condition():
    execution_state = {"a": True}
    expr = ConstantConditionExpression(value="{{ a }}")
    assert evaluate(expr, execution_state)


# Condition: not {{ a }}
def test_unary_condition():
    execution_state = {"a": "abc"}
    expr = UnaryConditionExpression(
        op=UnaryOperator.NOT, expr=ConstantConditionExpression(value="{{ a }}")
    )
    assert not evaluate(expr, execution_state)


# Condition: {{ a }} is None
def test_is_none():
    execution_state = {"a": None}
    expr = UnaryConditionExpression(
        op=UnaryOperator.IS_NONE, expr=ConstantConditionExpression(value="{{ a }}")
    )
    assert evaluate(expr, execution_state)


# Condition: {{ a }} is not None
def test_is_not_none():
    execution_state = {"a": "abc"}
    expr = UnaryConditionExpression(
        op=UnaryOperator.IS_NOT_NONE, expr=ConstantConditionExpression(value="{{ a }}")
    )
    assert evaluate(expr, execution_state)


# Condition: {{ a }} > {{ b }} and {{ b }} < {{ c }}
def test_and():
    execution_state = {"a": 2, "b": 1, "c": 3}
    expr = AndConditionExpression(
        and_expr=[
            BinaryConditionExpression(
                lhs=ConstantConditionExpression(value="{{ a }}"),
                op=BinaryOperator.GREATER_THAN,
                rhs=ConstantConditionExpression(value="{{ b }}"),
            ),
            BinaryConditionExpression(
                lhs=ConstantConditionExpression(value="{{ b }}"),
                op=BinaryOperator.LESS_THAN,
                rhs=ConstantConditionExpression(value="{{ c }}"),
            ),
        ]
    )
    assert evaluate(expr, execution_state)


# Condition: {{ a }} == {{ b }} or {{ b }} != {{ c }}
def test_or():
    execution_state = {"a": 2, "b": 1, "c": 3}
    expr = OrConditionExpression(
        or_expr=[
            BinaryConditionExpression(
                lhs=ConstantConditionExpression(value="{{ a }}"),
                op=BinaryOperator.EQUALS,
                rhs=ConstantConditionExpression(value="{{ b }}"),
            ),
            BinaryConditionExpression(
                lhs=ConstantConditionExpression(value="{{ b }}"),
                op=BinaryOperator.NOT_EQUALS,
                rhs=ConstantConditionExpression(value="{{ c }}"),
            ),
        ]
    )
    assert evaluate(expr, execution_state)


# Condition: {{ a }} in ["a", "b", "c"]
def test_in_list():
    execution_state = {"a": "b"}
    expr = BinaryConditionExpression(
        lhs=ConstantConditionExpression(value="{{ a }}"),
        op=BinaryOperator.IN,
        rhs=ConstantConditionExpression(value=["a", "b", "c"]),
    )
    assert evaluate(expr, execution_state)


# Condition: {{ a }} in {"abc": "defg"}
def test_in_dict():
    execution_state = {"a": "abc"}
    expr = BinaryConditionExpression(
        lhs=ConstantConditionExpression(value="{{ a }}"),
        op=BinaryOperator.IN,
        rhs=ConstantConditionExpression(value={"abc": "defg"}),
    )
    assert evaluate(expr, execution_state)


# Condition: not ({{ a }} is None) or ({{ b }} is not None and {{ c }} <= 123)
def test_complex():
    execution_state = {"a": None, "b": "abc", "c": 123}
    expr = OrConditionExpression(
        or_expr=[
            UnaryConditionExpression(
                op=UnaryOperator.NOT,
                expr=UnaryConditionExpression(
                    op=UnaryOperator.IS_NONE,
                    expr=ConstantConditionExpression(value="{{ a }}"),
                ),
            ),
            AndConditionExpression(
                and_expr=[
                    UnaryConditionExpression(
                        op=UnaryOperator.IS_NOT_NONE,
                        expr=ConstantConditionExpression(value="{{ b }}"),
                    ),
                    BinaryConditionExpression(
                        lhs=ConstantConditionExpression(value="{{ c }}"),
                        op=BinaryOperator.LESS_THAN_OR_EQUAL,
                        rhs=ConstantConditionExpression(value=123),
                    ),
                ]
            ),
        ]
    )
    assert evaluate(expr, execution_state)


# Condition: {{ a }} not in ["a", "b", "c"]
def test_not_in_list():
    execution_state = {"a": "b"}
    expr = BinaryConditionExpression(
        lhs=ConstantConditionExpression(value="{{ a }}"),
        op=BinaryOperator.NOT_IN,
        rhs=ConstantConditionExpression(value=["a", "b", "c"]),
    )
    assert not evaluate(expr, execution_state)
