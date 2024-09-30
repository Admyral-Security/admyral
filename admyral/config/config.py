import click
import os
from enum import Enum
import logging
from dotenv import load_dotenv
from pydantic import BaseModel
import uuid
import yaml

load_dotenv()


class LoggingLevel(Enum):
    INFO = logging.INFO
    DEBUG = logging.DEBUG
    WARNING = logging.WARNING
    ERROR = logging.ERROR
    CRITICAL = logging.CRITICAL


ENV_ADMYRAL_APP_DIR = "ADMYRAL_APP_DIR"
ENV_ADMYRAL_LOGGING_LEVEL = "ADMYRAL_LOGGING_LEVEL"
ENV_ADMYRAL_DISABLE_NSJAIL = "ADMYRAL_DISABLE_NSJAIL"
ENV_ADMYRAL_FLOCK_PATH = "ADMYRAL_FLOCK_PATH"
ENV_ADMYRAL_PIP_CACHE_DIRECTORY = "ADMYRAL_PIP_CACHE_DIRECTORY"
ENV_ADMYRAL_PIP_LOCK_CACHE_DIRECTORY = "ADMYRAL_PIP_LOCK_CACHE_DIRECTORY"
ENV_ADMYRAL_USE_LOCAL_ADMYRAL_PIP_PACKAGE = "ADMYRAL_USE_LOCAL_ADMYRAL_PIP_PACKAGE"
ENV_ADMYRAL_ENV = "ADMYRAL_ENV"
ENV_ADMYRAL_POSTHOG_API_KEY = "ADMYRAL_POSTHOG_API_KEY"
ENV_ADMYRAL_POSTHOG_HOST = "ADMYRAL_POSTHOG_HOST"
ENV_ADMYRAL_DISABLE_TELEMETRY = "ADMYRAL_DISABLE_TELEMETRY"

APP_NAME = "Admyral"

# Name of the configuration file
GLOBAL_CONFIG_FILE = "config.yaml"

PROJECT_DIRECTORY = ".admyral"

ADMYRAL_DEFAULT_STORAGE_DIRECTORY_NAME = "admyral_default_storage"

LOGGING_LEVEL = os.getenv(ENV_ADMYRAL_LOGGING_LEVEL, "INFO").upper()


def get_global_project_directory() -> str:
    """
    # TODO: adapt descr.
    Returns the global config folder for Admyral. The default behavior is to return whatever is most appropriate for the operating system.
    """
    return os.environ.get(ENV_ADMYRAL_APP_DIR, click.get_app_dir(APP_NAME))


def get_local_storage_path() -> str:
    """
    TODO: add descr.
    """
    return os.path.join(
        get_global_project_directory(), ADMYRAL_DEFAULT_STORAGE_DIRECTORY_NAME
    )


def get_local_postgres_volume() -> str:
    return os.path.join(get_local_storage_path(), "postgres")


def get_user_config_file() -> str:
    return os.path.join(get_global_project_directory(), GLOBAL_CONFIG_FILE)


# Constants for custom Python execution
ADMYRAL_DISABLE_NSJAIL = (
    os.getenv(ENV_ADMYRAL_DISABLE_NSJAIL, "false").lower() == "true"
)
ADMYRAL_CACHE_DIRECOTRY = os.path.join(get_local_storage_path(), "cache")
ADMYRAL_PIP_CACHE_DIRECTORY = os.getenv(
    ENV_ADMYRAL_PIP_CACHE_DIRECTORY,
    os.path.join(ADMYRAL_CACHE_DIRECOTRY, "pip"),
)
ADMYRAL_PIP_LOCK_CACHE_DIRECTORY = os.getenv(
    ENV_ADMYRAL_PIP_LOCK_CACHE_DIRECTORY,
    os.path.join(ADMYRAL_CACHE_DIRECOTRY, "pip-lock"),
)
ADMYRAL_PIP_LOCKFILE_CACHE_TTL_IN_SECONDS = 3 * 24 * 60 * 60  # 3 days
ADMYRAL_USE_LOCAL_ADMYRAL_PIP_PACKAGE = (
    os.getenv(ENV_ADMYRAL_USE_LOCAL_ADMYRAL_PIP_PACKAGE, "true").lower() == "true"
)
ADMYRAL_ENV = os.getenv(ENV_ADMYRAL_ENV, "prod")
ADMYRAL_POSTHOG_API_KEY = os.getenv(
    ENV_ADMYRAL_POSTHOG_API_KEY, "phc_RIpkRea4KLW6EONEDCSZVR1Td4YzeHf4ziUsGzmPnjD"
)
ADMYRAL_POSTHOG_HOST = os.getenv(ENV_ADMYRAL_POSTHOG_HOST, "https://eu.i.posthog.com")

ADMYRAL_DISABLE_TELEMETRY = (
    os.getenv(ENV_ADMYRAL_DISABLE_TELEMETRY, "false").lower() == "true"
)

# DATABASE AND SECRETS MANAGER


class DatabaseType(str, Enum):
    """
    Enum class for the supported database types.
    """

    SQLITE = "sqlite"
    POSTGRES = "postgres"


class SecretsManagerType(str, Enum):
    """
    Enum class for the supported secrets manager types.
    """

    SQL = "sql"
    # AWS_SECRETS_MANAGER = "aws_secrets_manager"


SQLITE_DATABASE_NAME = "admyral.db"

ENV_ADMYRAL_DATABASE_URL = "ADMYRAL_DATABASE_URL"
ENV_ADMYRAL_SECRETS_MANAGER_TYPE = "ADMYRAL_SECRETS_MANAGER"


ADMYRAL_DATABASE_URL = os.getenv(
    ENV_ADMYRAL_DATABASE_URL,
    f"sqlite+aiosqlite:///{get_local_storage_path()}/{SQLITE_DATABASE_NAME}",
)
if ADMYRAL_DATABASE_URL.startswith("postgresql"):
    ADMYRAL_DATABASE_URL = ADMYRAL_DATABASE_URL.replace(
        "postgresql://", "postgresql+asyncpg://"
    )
    ADMYRAL_DATABASE_TYPE = DatabaseType.POSTGRES
elif ADMYRAL_DATABASE_URL.startswith("sqlite"):
    ADMYRAL_DATABASE_URL = ADMYRAL_DATABASE_URL.replace(
        "sqlite://", "sqlite+aiosqlite://"
    )
    ADMYRAL_DATABASE_TYPE = DatabaseType.SQLITE
else:
    raise NotImplementedError(f"Unsupported database type: {ADMYRAL_DATABASE_URL}")

ADMYRAL_SECRETS_MANAGER_TYPE = SecretsManagerType(
    os.getenv(ENV_ADMYRAL_SECRETS_MANAGER_TYPE, SecretsManagerType.SQL)
)


ENV_TEMPORAL_HOST = "ADMYRAL_TEMPORAL_HOST"

ADMYRAL_TEMPORAL_HOST = os.getenv(ENV_TEMPORAL_HOST, "localhost:7233")


class GlobalConfig(BaseModel):
    """
    The global configuration for Admyral.
    """

    user_id: str
    telemetry_disabled: bool = ADMYRAL_DISABLE_TELEMETRY
    storage_directory: str = get_local_storage_path()
    database_type: DatabaseType = ADMYRAL_DATABASE_TYPE
    database_url: str = ADMYRAL_DATABASE_URL
    temporal_host: str = ADMYRAL_TEMPORAL_HOST
    secrets_manager_type: SecretsManagerType = ADMYRAL_SECRETS_MANAGER_TYPE
    posthog_api_key: str = ADMYRAL_POSTHOG_API_KEY
    posthog_host: str = ADMYRAL_POSTHOG_HOST
    environment: str = ADMYRAL_ENV

    pip_lockfile_cache_cleanup_interval: int = 60 * 60 * 24  # 1 day


def load_local_config() -> GlobalConfig:
    """
    Load the global configuration for Admyral.
    """
    config_file = get_user_config_file()

    if os.path.exists(config_file):
        with open(config_file, "r") as f:
            file_content = yaml.safe_load(f)
    else:
        os.makedirs(get_local_storage_path(), exist_ok=True)
        user_id = str(uuid.uuid4())
        file_content = {"user_id": user_id}
        with open(config_file, "w") as f:
            yaml.dump(file_content, f)

    return GlobalConfig(user_id=file_content["user_id"])


CONFIG = load_local_config()

ADMYRAL_DAEMON_PID_FILE = "admyral.pid"
ADMYRAL_DAEMON_LOG_FILE = "admyral.log"

TEMPORAL_DAEMON_PID_FILE = "temporal.pid"
TEMPORAL_DAEMON_LOG_FILE = "temporal.log"


def get_admyral_daemon_directory() -> str:
    return os.path.join(get_global_project_directory(), "Admyral", "daemon")


def get_admyral_daemon_pid_file() -> str:
    return os.path.join(get_admyral_daemon_directory(), ADMYRAL_DAEMON_PID_FILE)


def get_temporal_daemon_pid_file() -> str:
    return os.path.join(get_admyral_daemon_directory(), TEMPORAL_DAEMON_PID_FILE)


def get_admyral_daemon_log_file() -> str:
    return os.path.join(get_admyral_daemon_directory(), ADMYRAL_DAEMON_LOG_FILE)


def get_temporal_daemon_log_file() -> str:
    return os.path.join(get_admyral_daemon_directory(), TEMPORAL_DAEMON_LOG_FILE)


ENV_ADMYRAL_WEBHOOK_SIGNING_SECRET = "ADMYRAL_WEBHOOK_SIGNING_SECRET"
WEBHOOK_SIGNING_SECRET = bytes.fromhex(
    os.getenv(
        ENV_ADMYRAL_WEBHOOK_SIGNING_SECRET,
        "ebedd9f0c10b01acb9fd097cdf34a2b38bb554f2c7f68f0d9f534eff5c6ef5d9",
    )
)

ENV_ADMYRAL_SECRETS_ENCRYPTION_KEY = "ADMYRAL_SECRETS_ENCRYPTION_KEY"
SECRETS_ENCRYPTION_KEY = bytes.fromhex(
    os.getenv(
        ENV_ADMYRAL_SECRETS_ENCRYPTION_KEY,
        "834f01cf391c972f1e6def3d7f315f8194bb10048e5cf282aa4cba63b239d8fb",
    )
)


API_V1_STR = "/api/v1"


ENV_ADMYRAL_DISABLE_AUTH = "ADMYRAL_DISABLE_AUTH"
DISABLE_AUTH = os.getenv(ENV_ADMYRAL_DISABLE_AUTH, "false").lower() == "true"


ENV_ADMYRAL_AUTH_SECRET = "NEXTAUTH_SECRET"
AUTH_SECRET = os.getenv(
    ENV_ADMYRAL_AUTH_SECRET, "QzkuVCn7OGfkpoX98aOxf2tc3kFX8pZs71N1wHPo8NM="
)
