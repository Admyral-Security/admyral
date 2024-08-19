from importlib.metadata import version
from admyral.logger import setup_root_logger

__version__ = version(__name__)

setup_root_logger()
