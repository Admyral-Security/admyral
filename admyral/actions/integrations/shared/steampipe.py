import subprocess
import json
import os
import threading

from admyral.logger import get_logger
from admyral.exceptions import NonRetryableActionError


logger = get_logger(__name__)


# Note: steampipe currently does not support concurrent queries
# because it launches a server process with an embedded postgres
# instance for each steampipe query execution and each concurrent
# steampipe query execution would connect to the same server instance.
STEAMPIPE_LOCK = threading.Lock()


def _get_steampipe_executable() -> str:
    if os.path.exists("/usr/local/bin/steampipe"):
        return "/usr/local/bin/steampipe"
    if os.path.exists("/opt/homebrew/bin/steampipe"):
        return "/opt/homebrew/bin/steampipe"
    raise ValueError("Steampipe installation not found.")


def run_steampipe_query(
    query: str,
    aws_access_key_id: str,
    aws_secret_access_key: str,
) -> dict:
    env = os.environ.copy()  # Start with the current environment
    env["AWS_ACCESS_KEY_ID"] = aws_access_key_id
    env["AWS_SECRET_ACCESS_KEY"] = aws_secret_access_key

    if "AWS_ACCOUNT_ID" in env:
        del env["AWS_ACCOUNT_ID"]
    if "AWS_DEFAULT_REGION" in env:
        del env["AWS_DEFAULT_REGION"]

    # Disable caching
    env["STEAMPIPE_CACHE_PATH"] = "false"

    try:
        steampipe_executable = _get_steampipe_executable()
        with STEAMPIPE_LOCK:
            result = subprocess.run(
                [steampipe_executable, "query", query, "--output", "json"],
                capture_output=True,
                text=True,
                check=True,
                env=env,
            )
        return json.loads(result.stdout)
    except subprocess.CalledProcessError as e:
        logger.error(
            f"An error occurred while executing the steampipe query. Error: {str(e)}. Stderr: {e.stderr}"
        )
        raise NonRetryableActionError(
            f"An error occurred while executing the query. Error: {str(e)}. Stderr: {e.stderr}"
        )
