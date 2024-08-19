from admyral.models import (
    condition_validate,
    AndConditionExpression,
    BinaryConditionExpression,
    ConstantConditionExpression,
    BinaryOperator,
)


def test_condition_json_conversion():
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
    expr_json = expr.model_dump()
    expr_cond = condition_validate(expr_json)
    assert expr == expr_cond
