import sys
import os
import atexit
import signal
import psutil
from typing import Callable, Optional

from admyral.logger import get_logger

logger = get_logger(__name__)


def _verify_platform() -> None:
    if sys.platform == "win32":
        raise ValueError(
            "Daemons are only supported for UNIX-based operating systems and not for Windows."
        )


def _daemon_cleanup(pid_file: str, child_term_timeout: float = 5) -> None:
    """
    Cleanup function to be called when the daemon process exits.

    Args:
        pid_file: The path to the PID file.
    """
    # we first try to terminate all child processes
    proc_children = psutil.Process(os.getpid()).children(recursive=True)

    # we first try to terminate all child processes by sending them a SIGTERM signal
    for child in proc_children:
        child.terminate()
    _, alive_children = psutil.wait_procs(proc_children, timeout=child_term_timeout)

    # the still children that survived SIGTERM will be killed with SIGINT
    for child in alive_children:
        child.kill()
    psutil.wait_procs(alive_children, timeout=child_term_timeout)

    # finally, we cleanup the PID file
    if os.path.exists(pid_file):
        os.remove(pid_file)


def _get_pid_if_daemon_is_running(pid_file: str) -> Optional[int]:
    try:
        with open(pid_file, "r") as pf:
            pid = int(pf.read().strip())
    except IOError | FileNotFoundError | ValueError:
        return None

    if not pid or not psutil.pid_exists(pid):
        return None

    return pid


def launch_as_daemon(
    func: Callable[[], None],
    pid_file: str,
    log_file: Optional[str] = None,
    working_dir: Optional[str] = "/",
) -> None:
    """
    Launch a function as a daemon process using UNIX double-fork method.

    Why double fork?
    - the first fork creates a background process
    - the second fork makes sure that the daemon does not have a controlling terminal, runs independently of any terminal,
        and cannot be inadvertently attached to a terminal in the future

    Args:
        func: The function to run as a daemon.
        log_file: The path to the log file.
        pid_file: The path to the PID file.
    """
    _verify_platform()

    # get absolute paths since we change the working directory
    # we also need to make sure that the parent directories of the PID file and log file exist
    pid_file = os.path.abspath(pid_file)
    os.makedirs(os.path.dirname(pid_file), exist_ok=True)

    if log_file:
        log_file = os.path.abspath(log_file)
        os.makedirs(os.path.dirname(log_file), exist_ok=True)

    # check whether a daemon process is already running
    if os.path.exists(pid_file):
        if pid := _get_pid_if_daemon_is_running(pid_file):
            raise RuntimeError(
                f"Daemon is already running with PID {pid}. Please kill the daemon process first before trying to launch a new daemon."
            )
        # no process is running, so we can clean up the PID file
        os.remove(pid_file)

    # first, we create a child process
    try:
        pid = os.fork()
        if pid > 0:
            # exit the process which called os.fork()
            # Note: we return and do not exit here because the parent should be able to continue.
            return
    except OSError as err:
        logger.error(f"fork #1 failed: {err}")
        sys.exit(1)

    # decouple from parent environment
    os.chdir(working_dir)
    # Next, create a new session which disassociates the process from the controlling terminal.
    # Make the process the leader of a new session and a new process group.
    os.setsid()
    os.umask(0)

    # do second fork so that the new process is no longer a session leader.
    # only session leaders can acquire a controlling terminal. this makes sure that
    # the new child process can never accidentally reacquire a controlling terminal.
    try:
        pid = os.fork()
        if pid > 0:
            # exit from second parent
            sys.exit(0)
    except OSError as err:
        sys.stderr.write("fork #2 failed: {0}\n".format(err))
        sys.exit(1)

    # redirect standard file descriptors

    # flush pending output
    sys.stdout.flush()
    sys.stderr.flush()

    # open the /dev/null file (any data written to it is discarded, also it does not provide any data for reading)
    # and redirect the standard file descriptors (stdin, stdout, stderr) to it

    devnull_fd = os.open(os.devnull, os.O_RDWR)

    # if a log file is provided, we redirect stdout and stderr to the log file
    log_file_fd = (
        os.open(log_file, os.O_CREAT | os.O_RDWR | os.O_APPEND)
        if log_file
        else devnull_fd
    )

    os.dup2(devnull_fd, sys.stdin.fileno())
    os.dup2(log_file_fd, sys.stdout.fileno())
    os.dup2(log_file_fd, sys.stderr.fileno())

    # write the PID of the daemon process to the pidfile
    pid = str(os.getpid())
    with open(pid_file, "w+") as f:
        f.write(pid + "\n")

    # register the pidfile cleanup function to be called when the process exits
    atexit.register(lambda: _daemon_cleanup(pid_file))
    signal.signal(signal.SIGTERM, lambda _signum, _frame: _daemon_cleanup(pid_file))
    signal.signal(signal.SIGINT, lambda _signum, _frame: _daemon_cleanup(pid_file))

    # finally, we can now run the function as a daemon
    func()

    sys.exit(0)


def stop_daemon(pid_file: str) -> None:
    """
    Stop a running daemon process.

    Args:
        pid_file: The path to the PID file.
    """
    _verify_platform()

    if not os.path.exists(pid_file):
        logger.warning("PID file does not exist. Daemon is not running.")
        return

    pid = _get_pid_if_daemon_is_running(pid_file)
    if pid is None:
        logger.warning("Daemon is not running.")
        return

    if psutil.pid_exists(pid):
        proc = psutil.Process(pid)
        proc.terminate()
        logger.info(f"Daemon process with PID {pid} terminated.")
    else:
        logger.warning(f"Daemon process with PID {pid} does not exist.")
