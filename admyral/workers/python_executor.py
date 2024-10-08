import time
import aiofiles
import aiofiles.os
from typing import Any
import tempfile
import json
import os
import sys
import itertools

from admyral.utils.aio import makedirs, dirname
from admyral.config.config import (
    ADMYRAL_CACHE_DIRECOTRY,
    ADMYRAL_PIP_CACHE_DIRECTORY,
    ADMYRAL_PIP_LOCK_CACHE_DIRECTORY,
    ADMYRAL_DISABLE_NSJAIL,
    ADMYRAL_PIP_LOCKFILE_CACHE_TTL_IN_SECONDS,
    ADMYRAL_USE_LOCAL_ADMYRAL_PIP_PACKAGE,
)
from admyral.workers.shared_worker_state import SharedWorkerState
from admyral.logger import get_logger
from admyral.models import PythonAction, PipLockfile
from admyral.db.store_interface import StoreInterface
from admyral.utils.hash import calculate_sha256
from admyral.utils.time import utc_now_timestamp_seconds
from admyral.utils.aio import path_exists, getcwd, touch
from admyral.utils.subprocess import run_subprocess_with_log_flushing
from admyral.context import ctx

logger = get_logger(__name__)


MOUNT_TEMPLATE = """mount {{
    src: \"{REQUIREMENT_PATH}\"
    dst: \"{REQUIREMENT_PATH}\"
    is_bind: true
}}"""


ADMYRAL_PYTHON_PATH = "/usr/local/bin/python"


async def get_nsjail_dir() -> str:
    file_dir = await dirname(__file__)
    return os.path.join(file_dir, "nsjail")


async def python_action_worker_setup() -> None:
    if not ADMYRAL_DISABLE_NSJAIL:
        await makedirs(ADMYRAL_CACHE_DIRECOTRY)
        await makedirs(ADMYRAL_PIP_CACHE_DIRECTORY)
        await makedirs(ADMYRAL_PIP_LOCK_CACHE_DIRECTORY)


async def execute_python_action(action_type: str, action_args: dict[str, Any]) -> Any:
    logger.info(f"Executing Python action with type '{action_type}'")

    job_start = time.monotonic_ns()

    store = SharedWorkerState.get_store()

    # Load the action from the store
    python_action = await store.get_action(ctx.get().user_id, action_type)
    if not python_action:
        raise RuntimeError(
            f"Action with type '{action_type}' not found. Did you push your action?"
        )

    # filter action_args based on action arguments
    # Why filter action_args? Because an action might have been updated,
    # i.e., an argument might have been removed. This would cause the
    # function call to fail. Hence, we filter the arguments to only include
    # the ones that are actually defined by the action.
    defined_args = set(map(lambda arg: arg.arg_name, python_action.arguments))
    action_args = {k: v for k, v in action_args.items() if k in defined_args}

    with tempfile.TemporaryDirectory() as job_dir:
        logger.info(f"Job directory: {job_dir}")

        # write Python action and requirements file
        await _prepare_python_action(job_dir, python_action, action_args)

        await _run_python_action(job_dir, python_action, store)

        # Read output from file
        async with aiofiles.open(os.path.join(job_dir, "output.json"), "r") as f:
            output = await f.read()
            if output == "":
                result = None
            else:
                result = json.loads(output)

    job_end = time.monotonic_ns()
    logger.info(
        f"Python action with type '{action_type}' executed in {(job_end - job_start) / 1_000_000} ms"
    )

    return result


async def _load_secrets(python_action: PythonAction) -> dict[str, str]:
    loaded_secrets = {}
    for secret_placeholder in python_action.secrets_placeholders:
        secret = await ctx.get().secrets.aget(secret_placeholder)
        loaded_secrets[secret_placeholder] = json.dumps(secret)
    return loaded_secrets


def _build_python_action_module(python_action: PythonAction) -> str:
    return f"{python_action.import_statements}\n\n{python_action.code}"


async def _prepare_python_action(
    job_dir: str, python_action: PythonAction, action_args: dict[str, Any]
) -> None:
    # prepare input and output files
    async with aiofiles.open(os.path.join(job_dir, "input.json"), "w") as f:
        await f.write(json.dumps(action_args))

    async with aiofiles.open(os.path.join(job_dir, "output.json"), "w") as f:
        await f.write("")

    # Write requirements file
    requirements_list = python_action.requirements
    if "admyral" not in requirements_list:
        requirements_list.append("admyral")

    if ADMYRAL_USE_LOCAL_ADMYRAL_PIP_PACKAGE:
        # remove admyral from requirements if we are using the local package
        requirements_list = [req for req in requirements_list if req != "admyral"]

    # filter out packages from the standard library
    requirements_list = [
        req
        for req in requirements_list
        if req.split("==")[0] not in sys.stdlib_module_names
    ]

    async with aiofiles.open(os.path.join(job_dir, "requirements.in"), "w") as f:
        await f.write("\n".join(requirements_list))

    # Write Python files
    async with aiofiles.open(os.path.join(job_dir, "action.py"), "w") as f:
        action_module = _build_python_action_module(python_action)
        await f.write(action_module)

    nsjail_dir = await get_nsjail_dir()
    async with aiofiles.open(
        os.path.join(nsjail_dir, "template.python_action_executor.py.txt")
    ) as f:
        python_action_executor_template = await f.read()

    python_action_executor = python_action_executor_template.format(
        ACTION_PATH="action", ACTION_TYPE=python_action.action_type, JOB_DIR=job_dir
    )

    async with aiofiles.open(
        os.path.join(job_dir, "python_action_executor.py"), "w"
    ) as f:
        await f.write(python_action_executor)


async def _run_python_action(
    job_dir: str,
    python_action: PythonAction,
    store: StoreInterface,
) -> None:
    if ADMYRAL_DISABLE_NSJAIL:
        await _run_python_action_without_nsjail(job_dir, python_action)
    else:
        await _run_python_action_with_nsjail(job_dir, python_action, store)


async def _run_python_action_without_nsjail(
    job_dir: str,
    python_action: PythonAction,
) -> None:
    python_path = sys.executable

    logger.info(f"Python Path: {python_path}")

    # load secrets as environment for subprocess
    env = await _load_secrets(python_action)

    cmd = [
        python_path,
        "-u",  # unbuffered binary stdout and stderr
        os.path.join(job_dir, "python_action_executor.py"),
    ]

    async def _append_logs(logs: list[str]) -> None:
        logger.info(
            f"workflow_id={ctx.get().workflow_id}  run_id={ctx.get().run_id}  step_id={ctx.get().step_id} [_run_python_action_without_nsjail]: {''.join(logs)}"
        )
        await ctx.get().append_logs_async(logs)

    exit_code = await run_subprocess_with_log_flushing(cmd, _append_logs, env=env)

    _handle_exit_code(exit_code, cmd, python_action.action_type)


async def _run_python_action_with_nsjail(
    job_dir: str,
    python_action: PythonAction,
    store: StoreInterface,
) -> None:
    lockfile = await _pip_compile(job_dir, python_action, store)
    requirements_paths = await _pip_install_requirements(
        python_action.action_type, lockfile, job_dir
    )
    await _jailed_python_execution(requirements_paths, job_dir, python_action)


async def _pip_compile(
    job_dir: str, python_action: PythonAction, store: StoreInterface
) -> list[str]:
    """Generate lockfile using pip-compile"""
    hash_id = calculate_sha256(";".join(python_action.requirements))
    pip_lockfile = await store.get_cached_pip_lockfile(hash_id)
    if pip_lockfile and pip_lockfile.expiration_time > utc_now_timestamp_seconds():
        # we still have a valid lockfile in our cache
        logger.info("Skipping pip-compile. Found cached lockfile.")
        return pip_lockfile.lockfile.split("\n")

    pip_compile_start = time.monotonic_ns()

    # we need to generate a new lockfile
    logger.info("Generating lockfile using pip-compile...")

    cmd = [
        "pip-compile",
        "-q",
        "--no-header",
        os.path.join(job_dir, "requirements.in"),
        "--resolver=backtracking",
        "--strip-extras",
    ]

    async def _append_logs(logs: list[str]) -> None:
        logger.info(
            f"workflow_id={ctx.get().workflow_id}  run_id={ctx.get().run_id}  step_id={ctx.get().step_id} [_pip_compile]: {''.join(logs)}"
        )
        await ctx.get().append_logs_async(logs)

    exit_code = await run_subprocess_with_log_flushing(cmd, _append_logs)

    _handle_exit_code(exit_code, cmd, python_action.action_type)

    lockfile_path = os.path.join(job_dir, "requirements.txt")
    async with aiofiles.open(lockfile_path) as f:
        lockfile = await f.readlines()

    lockfile = list(
        filter(
            lambda req: not req.startswith("#"),
            map(lambda req: req.strip().replace("\n", ""), lockfile),
        )
    )

    pip_compiled_end = time.monotonic_ns()
    logger.info(
        f"Pip Compile Time: {(pip_compiled_end - pip_compile_start) / 1_000_000} ms"
    )

    # store lock file in cache
    await store.cache_pip_lockfile(
        PipLockfile(
            hash=hash_id,
            lockfile="\n".join(lockfile),
            expiration_time=utc_now_timestamp_seconds()
            + ADMYRAL_PIP_LOCKFILE_CACHE_TTL_IN_SECONDS,
        )
    )

    return lockfile


async def _pip_install_requirements(
    action_type: str, lockfile: list[str], job_dir: str
) -> list[str]:
    pip_install_start = time.monotonic_ns()

    cwd = await getcwd()

    installed_requirements_paths = []

    # TODO: I think we can default to always using the local package
    if ADMYRAL_USE_LOCAL_ADMYRAL_PIP_PACKAGE:
        # add the app directory to the installed requirements, such that
        # the action can access the local package
        logger.info("Using local Admyral package")
        installed_requirements_paths.append(cwd)
    else:
        logger.info("Using PyPi Admyral package")

    install_requirement_script = os.path.join(
        cwd, "admyral", "workers", "nsjail", "install_requirement.sh"
    )

    for requirement in lockfile:
        requirement_cache_path = os.path.join(ADMYRAL_PIP_CACHE_DIRECTORY, requirement)
        installed_requirements_paths.append(requirement_cache_path)

        if not await path_exists(requirement_cache_path):
            # requirement is not yet installed - pip install it
            await _pip_install_requirement(
                action_type,
                requirement,
                requirement_cache_path,
                job_dir,
                install_requirement_script,
            )

    pip_install_end = time.monotonic_ns()
    logger.info(
        f"Pip Install Time: {(pip_install_end - pip_install_start) / 1_000_000} ms"
    )

    return installed_requirements_paths


async def _pip_install_requirement(
    action_type: str,
    requirement: str,
    requirement_cache_path: str,
    job_dir: str,
    install_requirement_script: str,
) -> None:
    lock_name = requirement.replace("==", "_").replace(".", "_").replace("-", "_")
    req_lock_file = os.path.join(
        ADMYRAL_PIP_LOCK_CACHE_DIRECTORY, f"pip-{lock_name}.lock"
    )

    # generate flock file if not exists
    await touch(req_lock_file)

    # generate nsjail config file
    async with aiofiles.open(
        os.path.join("admyral", "workers", "nsjail", "template.pip_install.cfg")
    ) as f:
        nsjail_config_template = await f.read()

    nsjail_config = nsjail_config_template.format(
        FLOCK=req_lock_file,
        REQUIREMENT=requirement,
        TARGET=requirement_cache_path,
        INSTALL_REQUIREMENT_SCRIPT_PATH=install_requirement_script,
        CACHE_PATH=ADMYRAL_CACHE_DIRECOTRY,
    )
    nsjail_pip_install_config_path = os.path.join(
        job_dir, f"nsjail_pip_install_{requirement}.cfg"
    )
    async with aiofiles.open(nsjail_pip_install_config_path, "w") as f:
        await f.write(nsjail_config)

    cmd = [
        "nsjail",
        "--config",
        nsjail_pip_install_config_path,
    ]

    async def _append_logs(logs: list[str]) -> None:
        logger.info(
            f"workflow_id={ctx.get().workflow_id}  run_id={ctx.get().run_id}  step_id={ctx.get().step_id} [_pip_install_requirement]: {''.join(logs)}"
        )
        await ctx.get().append_logs_async(logs)

    exit_code = await run_subprocess_with_log_flushing(cmd, _append_logs)

    _handle_exit_code(exit_code, cmd, action_type)


async def _jailed_python_execution(
    requirements_paths: list[str],
    job_dir: str,
    python_action: PythonAction,
) -> None:
    execution_start = time.monotonic_ns()

    logger.info("Executing Python action with nsjail")
    x = ":".join(requirements_paths)
    logger.info(f"Requirements paths: {x}")

    requirements_mounts = "\n".join(
        [
            MOUNT_TEMPLATE.format(REQUIREMENT_PATH=requirement_path)
            for requirement_path in requirements_paths
        ]
    )

    async with aiofiles.open(
        os.path.join("admyral", "workers", "nsjail", "template.python_action.cfg")
    ) as f:
        nsjail_config_template = await f.read()

    nsjail_config = nsjail_config_template.format(
        EXECUTOR_PATH=os.path.join(job_dir, "python_action_executor.py"),
        ACTION_PATH=os.path.join(job_dir, "action.py"),
        PYTHON_DEPENDENCIES=":".join([ADMYRAL_PYTHON_PATH] + requirements_paths),
        PYTHON_DEPENDENCIES_MOUNT=requirements_mounts,
        JOB_DIR=job_dir,
        PATH=os.environ.get("PATH", ""),
    )

    nsjail_config_path = os.path.join(job_dir, "action.cfg")
    async with aiofiles.open(nsjail_config_path, "w") as f:
        await f.write(nsjail_config)

    # load secrets and inject as environment variables
    env = await _load_secrets(python_action)

    cmd = [
        "nsjail",
        "--config",
        nsjail_config_path,
        "--",
        ADMYRAL_PYTHON_PATH,
        "-u",  # unbuffered binary stdout and stderr
        "python_action_executor.py",
    ]
    # inject secrets by appending them as command line arguments
    cmd_with_secrets = cmd + list(
        itertools.chain.from_iterable(
            [["-s", f"'{len(key)}|{key}{value}'"] for key, value in env.items()]
        )
    )

    async def _append_logs(logs: list[str]) -> None:
        logger.info(
            f"workflow_id={ctx.get().workflow_id}  run_id={ctx.get().run_id}  step_id={ctx.get().step_id} [_jailed_python_execution]: {''.join(logs)}"
        )
        await ctx.get().append_logs_async(logs)

    exit_code = await run_subprocess_with_log_flushing(cmd_with_secrets, _append_logs)

    _handle_exit_code(exit_code, cmd, python_action.action_type)

    execution_end = time.monotonic_ns()
    logger.info(
        f"Python action executed in {(execution_end - execution_start) / 1_000_000} ms"
    )


def _handle_exit_code(exit_code: int, cmd: list[str], action_type: str):
    if exit_code != 0:
        cmd_str = " ".join(cmd)
        logger.error(
            f'Failed execute command "{cmd_str}". Exited with code {exit_code}.'
        )
        raise RuntimeError(
            f"Failed to execute action: {action_type}. See logs for more details."
        )
