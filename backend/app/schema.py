from enum import Enum


class ActionType(Enum):
    HTTP_REQUEST = "HttpRequest"
    WEBHOOK = "Webhook"
    IF_CONDITION = "IfCondition"


class IfConditionOperator(Enum):
    EQUALS = "Equals"
    NOT_EQUALS = "NotEquals"
    GREATER_THAN = "GreaterThan"
    GREATER_THAN_OR_EQUAL = "GreaterThanOrEqual"
    LESS_THAN = "LessThan"
    LESS_THAN_OR_EQUAL = "LessThanOrEqual"
    MATCH_REGEX = "MatchRegex"
    NOT_MATCH_REGEX = "NotMatchRegex"


class EdgeType(Enum):
    TRUE = "True"
    FALSE = "False"
    DEFAULT = "Default"
