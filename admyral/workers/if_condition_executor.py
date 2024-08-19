from typing import Any
from multipledispatch import dispatch

from admyral.typings import JsonValue
from admyral.models import (
    UnaryOperator,
    BinaryOperator,
    IVisitor,
    ConditionExpression,
    ConstantConditionExpression,
    UnaryConditionExpression,
    BinaryConditionExpression,
    AndConditionExpression,
    OrConditionExpression,
    Condition,
    condition_validate,
)
from admyral.workers.references import evaluate_references


# TODO: error handling for incompatible types
class ConditionEvaluator(IVisitor):
    @dispatch(ConstantConditionExpression)
    def visit(self, expr: ConstantConditionExpression) -> Any:  # noqa F811
        return expr.value

    @dispatch(UnaryConditionExpression)
    def visit(self, expr: UnaryConditionExpression) -> Any:  # noqa F811
        match expr.op:
            case UnaryOperator.NOT:
                return not expr.expr.accept(self)
            case UnaryOperator.IS_NONE:
                return expr.expr.accept(self) is None
            case UnaryOperator.IS_NOT_NONE:
                return expr.expr.accept(self) is not None

    @dispatch(BinaryConditionExpression)
    def visit(self, expr: BinaryConditionExpression) -> Any:  # noqa F811
        lhs = expr.lhs.accept(self)
        rhs = expr.rhs.accept(self)
        match expr.op:
            case BinaryOperator.EQUALS:
                return lhs == rhs
            case BinaryOperator.NOT_EQUALS:
                return lhs != rhs
            case BinaryOperator.GREATER_THAN:
                return lhs > rhs
            case BinaryOperator.LESS_THAN:
                return lhs < rhs
            case BinaryOperator.GREATER_THAN_OR_EQUAL:
                return lhs >= rhs
            case BinaryOperator.LESS_THAN_OR_EQUAL:
                return lhs <= rhs
            case BinaryOperator.IN:
                return lhs in rhs
            case _:
                raise ValueError(f"Invalid operator: {expr.op.value}")

    @dispatch(AndConditionExpression)
    def visit(self, expr: AndConditionExpression) -> Any:  # noqa F811
        return all([expr.accept(self) for expr in expr.and_expr])

    @dispatch(OrConditionExpression)
    def visit(self, expr: OrConditionExpression) -> Any:  # noqa F811
        return any([expr.accept(self) for expr in expr.or_expr])

    def evaluate(self, expr: ConditionExpression) -> bool:
        return bool(expr.accept(self))


class ConditionReferenceResolution(IVisitor):
    def __init__(self, execution_state: dict[str, JsonValue]) -> None:
        self.execution_state = execution_state

    @dispatch(ConstantConditionExpression)
    def visit(self, expr: ConstantConditionExpression) -> Any:  # noqa F811
        expr.value = evaluate_references(expr.value, self.execution_state)
        return expr

    @dispatch(UnaryConditionExpression)
    def visit(self, expr: UnaryConditionExpression) -> Any:  # noqa F811
        expr.expr.accept(self)
        return expr

    @dispatch(BinaryConditionExpression)
    def visit(self, expr: BinaryConditionExpression) -> Any:  # noqa F811
        expr.lhs.accept(self)
        expr.rhs.accept(self)
        return expr

    @dispatch(AndConditionExpression)
    def visit(self, expr: AndConditionExpression) -> Any:  # noqa F811
        expr.and_expr = [expr.accept(self) for expr in expr.and_expr]
        return expr

    @dispatch(OrConditionExpression)
    def visit(self, expr: OrConditionExpression) -> Any:  # noqa F811
        expr.or_expr = [expr.accept(self) for expr in expr.or_expr]
        return expr

    def resolve_references(self, expr: ConditionExpression) -> Condition:
        expr.accept(self)
        return expr


def execute_if_condition(condition_expr: JsonValue) -> bool:
    condition = condition_validate(condition_expr)
    return ConditionEvaluator().evaluate(condition)
