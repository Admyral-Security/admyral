import asyncio
from temporalio.client import Client
from typing import Coroutine

from admyral.logger import get_logger

logger = get_logger(__name__)


async def wait_for_temporal(
    target_host: str, max_retries: int = 10, sleep_time_in_sec: float = 0.5
) -> None:
    """
    Wait for Temporal to start up and be ready to accept connections.

    Args:
        target_host: The host and port of the Temporal server.
        max_retries: The maximum number of retries before giving up.
        sleep_time_in_sec: The time to sleep between retries.
    """
    for _ in range(max_retries):
        await asyncio.sleep(sleep_time_in_sec)
        try:
            client = await Client.connect(target_host)
            break
        except Exception:
            client = None

    if client is None or not await client.service_client.check_health():
        raise Exception("Failed to start Temporal!")

    logger.info("Temporal started successfully.")


async def start_after_temporal(
    tasks: list[Coroutine],
    target_host: str,
    max_retries: int = 10,
    sleep_time_in_sec: float = 0.5,
) -> None:
    """
    Start the backend server and the worker after Temporal has started.

    Args:
        target_host: The host and port of the Temporal server.
    """
    await wait_for_temporal(
        target_host, max_retries=max_retries, sleep_time_in_sec=sleep_time_in_sec
    )
    logger.info("Temporal started. Starting dependent tasks...")
    await asyncio.gather(*tasks)


async def run_temporal():
    """
    Start a local Temporal instance.
    """
    proc = await asyncio.create_subprocess_exec(
        "temporal",
        "server",
        "start-dev",
        "--headless",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    logger.info("Temporal started.")
    await proc.communicate()
