from fastapi import Depends, FastAPI
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from contextlib import asynccontextmanager

from app.db import get_session, init_db
from app.deps import get_authenticated_user
from app.models import AuthenticatedUser


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown
    # ...


app = FastAPI(lifespan=lifespan)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/test")
async def test(user: AuthenticatedUser = Depends(get_authenticated_user)):
    return user


# @app.get("/songs", response_model=list[Song])
# async def get_songs(session: AsyncSession = Depends(get_session)):
#     result = await session.execute(select(Song))
#     songs = result.scalars().all()
#     return [Song(name=song.name, artist=song.artist, year=song.year, id=song.id) for song in songs]


# @app.post("/songs")
# async def add_song(song: SongCreate, session: AsyncSession = Depends(get_session)):
#     song = Song(name=song.name, artist=song.artist, year=song.year)
#     session.add(song)
#     await session.commit()
#     await session.refresh(song)
#     return song
