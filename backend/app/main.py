from fastapi import FastAPI
from contextlib import asynccontextmanager

from app.config import settings
from app.api.api_v1.api import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown
    # ...


app = FastAPI(lifespan=lifespan)
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health")
async def health():
    return {"status": "ok"}
