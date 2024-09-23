from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from fastapi_nextauth_jwt.exceptions import NextAuthJWTException

from admyral.logger import get_logger
from admyral.server.deps import setup_dependencies
from admyral.server.background_tasks import start_background_tasks
from admyral.config.config import API_V1_STR
from admyral.server.endpoints import (
    action_router,
    workflow_router,
    webhook_router,
    secret_router,
    editor_router,
    workflow_run_router,
    api_key_router,
)


logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # On Startup
    await setup_dependencies()
    start_background_tasks()
    yield
    # On Shutdown
    # ...


app = FastAPI(title="Admyral", lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(action_router, prefix=f"{API_V1_STR}/actions")
app.include_router(workflow_router, prefix=f"{API_V1_STR}/workflows")
app.include_router(secret_router, prefix=f"{API_V1_STR}/secrets")
app.include_router(workflow_run_router, prefix=f"{API_V1_STR}/runs")
app.include_router(editor_router, prefix=f"{API_V1_STR}/editor")
app.include_router(webhook_router, prefix="/webhooks")
app.include_router(api_key_router, prefix=f"{API_V1_STR}/api-keys")


@app.exception_handler(NextAuthJWTException)
async def handle_nextauthjwt_exception(_request: Request, exc: NextAuthJWTException):
    logger.error(
        f'Invalid Authentication: HTTP Status={exc.status_code}, Message="{exc.message}"'
    )
    raise HTTPException(status_code=exc.status_code, detail=exc.message)


@app.get("/health")
async def health():
    return {"status": "ok"}
