from pydantic import BaseModel, Field, ConfigDict
from enum import Enum
from abc import abstractmethod, ABC
from typing import Any, Literal, Annotated

from admyral.typings import JsonValue


class IVisitor(ABC):
    @abstractmethod
    def visit(self) -> Any: ...


"""
Condition Grammer:

Constant := JsonValue
BinaryOperator := "==" | "!=" | ">" | "<" | ">=" | "<=" | "in"
UnaryOperator := "not" | "is None" | "is not None"

UnaryExpression := UnaryOperator ConditionExpression
BinaryExpression := ConditionExpression BinaryOperator ConditionExpression
AndExpression := ConditionExpression "and" ConditionExpression
OrExpression := ConditionExpression "or" ConditionExpression

ConditionExpression := "(" ConditionExpression ")" | Constant | UnaryExpression | BinaryExpression | AndExpression | OrExpression

"""


class BinaryOperator(str, Enum):
    EQUALS = "EQUALS"
    NOT_EQUALS = "NOT_EQUALS"
    GREATER_THAN = "GREATER_THAN"
    LESS_THAN = "LESS_THAN"
    GREATER_THAN_OR_EQUAL = "GREATER_THAN_OR_EQUAL"
    LESS_THAN_OR_EQUAL = "LESS_THAN_OR_EQUAL"
    IN = "IN"


class UnaryOperator(str, Enum):
    NOT = "NOT"
    IS_NONE = "IS_NONE"
    IS_NOT_NONE = "IS_NOT_NONE"


class ConditionExpression(ABC, BaseModel):
    type: str
    """ discriminator field """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    @abstractmethod
    def accept(self, visitor: IVisitor) -> Any:
        return None


class ConstantConditionExpression(ConditionExpression):
    type: Literal["constant"] = "constant"
    value: JsonValue

    def accept(self, visitor: IVisitor) -> Any:
        return visitor.visit(self)


class UnaryConditionExpression(ConditionExpression):
    type: Literal["unary"] = "unary"
    op: UnaryOperator
    expr: "Condition"

    def accept(self, visitor: IVisitor) -> Any:
        return visitor.visit(self)


class BinaryConditionExpression(ConditionExpression):
    type: Literal["binary"] = "binary"
    lhs: "Condition"
    op: BinaryOperator
    rhs: "Condition"

    def accept(self, visitor: IVisitor) -> Any:
        return visitor.visit(self)


class AndConditionExpression(ConditionExpression):
    type: Literal["and"] = "and"
    and_expr: list["Condition"]

    def accept(self, visitor: IVisitor) -> Any:
        return visitor.visit(self)


class OrConditionExpression(ConditionExpression):
    type: Literal["or"] = "or"
    or_expr: list["Condition"]

    def accept(self, visitor: IVisitor) -> Any:
        return visitor.visit(self)


type Condition = Annotated[
    ConstantConditionExpression
    | UnaryConditionExpression
    | BinaryConditionExpression
    | AndConditionExpression
    | OrConditionExpression,
    Field(..., discriminator="type"),
]


def condition_validate(expr: dict[str, JsonValue]) -> Condition:
    if expr["type"] == "constant":
        return ConstantConditionExpression.model_validate(expr)
    elif expr["type"] == "unary":
        return UnaryConditionExpression.model_validate(expr)
    elif expr["type"] == "binary":
        return BinaryConditionExpression.model_validate(expr)
    elif expr["type"] == "and":
        return AndConditionExpression.model_validate(expr)
    elif expr["type"] == "or":
        return OrConditionExpression.model_validate(expr)
    else:
        raise ValueError(f"Invalid condition type: {expr['type']}")
