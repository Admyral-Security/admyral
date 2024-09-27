import asyncio

from admyral.logger import get_logger
from admyral.server.deps import get_admyral_store
from admyral.config.config import CONFIG


logger = get_logger(__name__)


async def cleanup_pip_lockfile_cache(cleanup_interval: int):
    while True:
        await asyncio.sleep(cleanup_interval)
        logger.info("Cleaning up pip lockfile cache...")
        await get_admyral_store().delete_expired_cached_pip_lockfile()
        logger.info("Finished cleaning up pip lockfile cache.")


def start_background_tasks():
    logger.info("Starting background tasks...")

    asyncio.create_task(
        cleanup_pip_lockfile_cache(CONFIG.pip_lockfile_cache_cleanup_interval)
    )
    logger.info("Started pip lockfile cache cleanup background task.")
