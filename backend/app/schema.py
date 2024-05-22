from enum import Enum


class ActionType(str, Enum):
    HTTP_REQUEST = "HTTP_REQUEST"
    WEBHOOK = "WEBHOOK"
    IF_CONDITION = "IF_CONDITION"
    AI_ACTION = "AI_ACTION"
    SEND_EMAIL = "SEND_EMAIL"
    NOTE = "NOTE"
    MANUAL_START = "MANUAL_START"
    INTEGRATION = "INTEGRATION"


class EdgeType(str, Enum):
    TRUE = "TRUE"
    FALSE = "FALSE"
    DEFAULT = "DEFAULT"


class IntegrationType(str, Enum):
    VIRUS_TOTAL = "VIRUS_TOTAL"
    ALIENVAULT_OTX = "ALIENVAULT_OTX"
