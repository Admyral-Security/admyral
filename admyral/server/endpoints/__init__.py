from admyral.server.endpoints.action_endpoints import router as action_router
from admyral.server.endpoints.secret_endpoints import router as secret_router
from admyral.server.endpoints.webhook_endpoints import router as webhook_router
from admyral.server.endpoints.workflow_endpoints import router as workflow_router
from admyral.server.endpoints.editor_endpoints import router as editor_router
from admyral.server.endpoints.workflow_run_endpoints import (
    router as workflow_run_router,
)
from admyral.server.endpoints.api_key_endpoints import router as api_key_router

__all__ = [
    "action_router",
    "secret_router",
    "webhook_router",
    "workflow_router",
    "editor_router",
    "workflow_run_router",
    "api_key_router",
]
