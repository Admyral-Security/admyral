from admyral.cli.action import (
    action,
    push as action_push,
)
from admyral.cli.telemetry import (
    enable as enable_telemetry,
    disable as disable_telemetry,
    status as telemetry_status,
)
from admyral.cli.server import up, down
from admyral.cli.setup import init
from admyral.cli.workflow import workflow, push as workflow_push, trigger
from admyral.cli.secret import secret, set, delete, list

__all__ = [
    "action",
    "action_push",
    "up",
    "down",
    "init",
    "workflow",
    "workflow_push",
    "trigger",
    "secret",
    "set",
    "delete",
    "list",
    "enable_telemetry",
    "disable_telemetry",
    "telemetry_status",
]
