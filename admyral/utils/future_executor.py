import asyncio
from typing import Any


# Global variable to store the main event loop reference
MAIN_EVENT_LOOP = None


def capture_main_event_loop():
    global MAIN_EVENT_LOOP
    MAIN_EVENT_LOOP = asyncio.get_event_loop()


def execute_future(func: asyncio.coroutines) -> Any:
    assert MAIN_EVENT_LOOP is not None, "Main event loop not captured."
    future = asyncio.run_coroutine_threadsafe(func, MAIN_EVENT_LOOP)
    return future.result()
