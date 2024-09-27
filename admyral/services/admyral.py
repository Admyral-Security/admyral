import asyncio
import os
from typing import Optional, Generator
import time

from admyral.services.worker_service import launch_worker
from admyral.services.api_service import run_api
from admyral.services.temporal_service import run_temporal, start_after_temporal
from admyral.utils.daemon import launch_as_daemon, stop_daemon
from admyral.config.config import (
    get_admyral_daemon_log_file,
    get_admyral_daemon_pid_file,
    get_temporal_daemon_log_file,
    get_temporal_daemon_pid_file,
    CONFIG,
)
from admyral.utils.io import file_tail


async def launch_admyral_blocking():
    """
    Starts the following Admyral services:
    - Temporal
    - Admyral Worker
    - Admyral Backend Server

    The method first starts Temporal, then starts the worker and backend server
    after Temporal was successfully launched.
    """
    await asyncio.gather(
        run_temporal(),
        start_after_temporal(
            [launch_worker({"docker": False}), run_api()], CONFIG.temporal_host
        ),
    )


def launch_admyral_daemon():
    print("Starting Temporal...")
    launch_as_daemon(
        lambda: asyncio.run(run_temporal()),
        get_temporal_daemon_pid_file(),
        get_temporal_daemon_log_file(),
    )
    print("Started Temporal.")

    def run_worker_and_api_after_temporal():
        asyncio.run(
            start_after_temporal(
                [launch_worker({"docker": False}), run_api()],
                CONFIG.temporal_host,
            )
        )

    print("Starting Admyral...")
    launch_as_daemon(
        run_worker_and_api_after_temporal,
        get_admyral_daemon_pid_file(),
        get_admyral_daemon_log_file(),
        os.getcwd(),
    )
    print("Started Admyral.")


def destroy_admyral_daemon():
    # we first stop the worker and the backend server
    print("Stopping Admyral...")
    stop_daemon(get_admyral_daemon_pid_file())
    print("Stopped Admyral.")

    # then we stop Temporal
    print("Stopping Temporal...")
    stop_daemon(get_temporal_daemon_pid_file())
    print("Stopped Temporal.")


def show_logs(
    follow: bool = False, tail: Optional[int] = None
) -> Generator[str, None, None]:
    log_file = get_admyral_daemon_log_file()
    if not os.path.exists(log_file):
        return

    with open(log_file, "r") as f:
        if tail is not None:
            if tail < 0:
                raise ValueError("tail must be a positive integer.")
            # TODO: make file_tail a generator
            available_bytes, tail_lines = file_tail(log_file, tail)
            for line in tail_lines:
                yield line

            if not follow:
                return

            # we need to set the file cursor until where we read the last lines
            f.seek(available_bytes)

        line = ""
        while True:
            if partial_line := f.readline():
                line += partial_line
                if line.endswith("\n"):
                    # we have a full line, so we can now emit it
                    yield line
                    line = ""
            elif follow:
                # wait for new lines to be written to the log file
                time.sleep(1)
            else:
                # no more lines to read
                break


# TODO: show dashboard, API URL
def show_status():
    admyral_pid_file = get_admyral_daemon_pid_file()
    temporal_pid_file = get_temporal_daemon_pid_file()

    if os.path.exists(admyral_pid_file):
        print("Admyral is running.")
    else:
        print("Admyral is not running.")
    if os.path.exists(temporal_pid_file):
        print("Temporal is running.")
    else:
        print("Temporal is not running.")
