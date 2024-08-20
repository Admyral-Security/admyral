from admyral.cli.action import (
    action,
    push as action_push,
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
]
