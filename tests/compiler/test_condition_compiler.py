import pytest

from admyral.compiler.condition_compiler import compile_condition_str
from admyral.models import (
    OrConditionExpression,
    AndConditionExpression,
    BinaryConditionExpression,
    UnaryConditionExpression,
    ConstantConditionExpression,
    BinaryOperator,
    UnaryOperator,
)


def test_compile_condition_str():
    condition = "a > b and b < c or not (c == d and d['a'] != e)"
    compiled_condition = compile_condition_str(condition)
    expected_condition = OrConditionExpression(
        or_expr=[
            AndConditionExpression(
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
            ),
            UnaryConditionExpression(
                op=UnaryOperator.NOT,
                expr=AndConditionExpression(
                    and_expr=[
                        BinaryConditionExpression(
                            lhs=ConstantConditionExpression(value="{{ c }}"),
                            op=BinaryOperator.EQUALS,
                            rhs=ConstantConditionExpression(value="{{ d }}"),
                        ),
                        BinaryConditionExpression(
                            lhs=ConstantConditionExpression(value="{{ d['a'] }}"),
                            op=BinaryOperator.NOT_EQUALS,
                            rhs=ConstantConditionExpression(value="{{ e }}"),
                        ),
                    ]
                ),
            ),
        ]
    )
    assert compiled_condition == expected_condition


def test_missing_parenthesis():
    condition = "a > b and b < c or not (c == d and d['a'] != e"
    with pytest.raises(SyntaxError) as e:
        compile_condition_str(condition)
    assert str(e.value) == "'(' was never closed (<unknown>, line 1)"


def test_missing_condition():
    condition = "a > b and b < c or not (c == d and d['a'] != e) and"
    with pytest.raises(SyntaxError) as e:
        compile_condition_str(condition)
    assert str(e.value) == "invalid syntax (<unknown>, line 1)"


def test_python_function():
    condition = "len(f) > 0"
    with pytest.raises(RuntimeError) as e:
        compile_condition_str(condition)
    assert str(e.value) == "Unsupported condition expression: len(f)\n"
