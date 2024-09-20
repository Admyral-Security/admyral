import asyncio
import shutil
import aiofiles.os
import os


async def copyfile(src: str, dst: str):
    """
    Unfortunately, there is not true async implementation so far.
    Falling back to execute on the thread pool.
    """
    await asyncio.to_thread(shutil.copyfile, src, dst)


async def makedirs(directory: str):
    await aiofiles.os.makedirs(directory, exist_ok=True)


async def path_exists(path: str) -> bool:
    return await aiofiles.os.path.exists(path)


async def getcwd() -> str:
    return await aiofiles.os.getcwd()


async def dirname(file: str) -> str:
    return await asyncio.to_thread(os.path.dirname, file)


async def touch(file: str):
    async with aiofiles.open(file, "a"):
        pass
