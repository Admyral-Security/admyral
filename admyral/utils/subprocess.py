import asyncio
from asyncio.streams import StreamReader
from typing import Callable, Awaitable

from admyral.logger import get_logger

logger = get_logger(__name__)


async def _read_stream(stream: StreamReader, callback: Callable[[str], None]) -> None:
    try:
        while True:
            line = await stream.readline()
            if not line:
                break
            callback(line.decode("utf-8"))
    except ValueError:
        # ValueError: Separator is not found, and chunk exceed the limit
        # https://stackoverflow.com/questions/55457370/how-to-avoid-valueerror-separator-is-not-found-and-chunk-exceed-the-limit
        callback("Truncated log stream because chunks are too large to be read.")


async def run_subprocess_with_streamed_stdout_and_stderr(
    cmd: list[str],
    stdout_callback: Callable[[str], None],
    stderr_callback: Callable[[str], None],
    env: dict[str, str] | None = None,
) -> int:
    """
    Run a subprocess and stream stdout and stderr to the given callbacks.

    Args:
        cmd: The command to run.
        stdout_callback: The callback to call with each line of stdout.
        stderr_callback: The callback to call with each line of stderr.

    Returns:
        The exit code of the subprocess.
    """
    process = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE, env=env
    )

    async with asyncio.TaskGroup() as tg:
        tg.create_task(_read_stream(process.stdout, stdout_callback))
        tg.create_task(_read_stream(process.stderr, stderr_callback))

    await process.wait()

    return process.returncode


async def run_subprocess_with_log_flushing(
    cmd: list[str],
    append_logs_fn: Callable[[list[str]], Awaitable[None]],
    env: dict[str, str] | None = None,
) -> int:
    """
    Run a suboprocess and periodically call the append_logs_fn to flush the newest logs.

    Args:
        cmd: The command to run.
        append_logs_fn: The function to call with the newest logs to flush.

    Returns:
        The exit code of the subprocess.
    """

    # we first start a task which periodically flushes the lines from the buffer.
    # another task will be started which consumes the stdout and stderr stream from
    # the subprocess and appends the lines to the buffer.

    lines_buffer = []
    stop_flush_buffer_task = False

    async def flush_buffer():
        nonlocal lines_buffer
        nonlocal stop_flush_buffer_task

        while True:
            # consume the buffer before we append the logs. otherwise new logs
            # might have been appended while we were appending the logs.
            to_be_flushed = lines_buffer
            lines_buffer = []
            if len(to_be_flushed) > 0:
                await append_logs_fn(to_be_flushed)

            if stop_flush_buffer_task:
                # before we stop we need to check whether there are still logs to be flushed
                if len(lines_buffer) > 0:
                    await append_logs_fn(lines_buffer)
                break

            # sleep for 500ms
            await asyncio.sleep(0.5)

    flush_buffer_task = asyncio.create_task(flush_buffer())

    def append_new_line_to_buffer(new_line: str) -> None:
        nonlocal lines_buffer
        lines_buffer.append(new_line)

    process_return_code = await run_subprocess_with_streamed_stdout_and_stderr(
        cmd, append_new_line_to_buffer, append_new_line_to_buffer, env
    )

    logger.info(f"Subprocess exited with code {process_return_code}")

    # stop the flush_buffer task and wait until it completed
    stop_flush_buffer_task = True
    await flush_buffer_task

    if len(lines_buffer) > 0:
        await append_logs_fn(lines_buffer)

    return process_return_code
