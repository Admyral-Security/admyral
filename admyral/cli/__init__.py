from admyral.cli.action import (
    action,
    push as action_push,
    list as action_list,
    delete as action_delete,
)
from admyral.cli.server import up, down
from admyral.cli.setup import init
from admyral.cli.workflow import workflow, push as workflow_push, trigger
from admyral.cli.secret import secret, set, delete, list
from admyral.cli.connect import connect, disconnect

__all__ = [
    "action",
    "action_push",
    "action_list",
    "action_delete",
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
    "connect",
    "disconnect",
]
