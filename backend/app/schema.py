from enum import Enum


class ActionType(Enum):
    HTTP_REQUEST = "HTTP_REQUEST"
    WEBHOOK = "WEBHOOK"
    IF_CONDITION = "IF_CONDITION"
    AI_ACTION = "AI_ACTION"


class EdgeType(Enum):
    TRUE = "TRUE"
    FALSE = "FALSE"
    DEFAULT = "DEFAULT"
