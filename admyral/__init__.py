import os
from admyral.logger import setup_root_logger, get_logger
import tomllib

setup_root_logger()

logger = get_logger(__name__)


# Set the version number
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

if os.path.exists(os.path.join(ROOT_DIR, "VERSION")):
    with open(os.path.join(ROOT_DIR, "VERSION")) as version_file:
        __version__ = version_file.read().strip()
elif os.path.exists(os.path.join(ROOT_DIR, "..", "pyproject.toml")):
    with open(os.path.join(ROOT_DIR, "..", "pyproject.toml"), "rb") as project_file:
        __version__ = tomllib.load(project_file)["tool"]["poetry"]["version"]
else:
    logger.warn("Could not determine admyral version number.")
    __version__ = None
