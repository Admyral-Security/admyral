"""
TODO:

- all logs should have the same format
    - adapt log format for uvicorn: https://github.com/encode/uvicorn/discussions/2027

"""

import logging

from admyral.config.config import LOGGING_LEVEL, LoggingLevel


def get_log_level() -> LoggingLevel:
    if LOGGING_LEVEL not in LoggingLevel.__members__:
        raise ValueError(f"Invalid logging level: {LOGGING_LEVEL}")
    return LoggingLevel[LOGGING_LEVEL]


def get_stream_handler() -> logging.StreamHandler:
    stream_handler = logging.StreamHandler()
    # log_formatter = logging.Formatter("%(asctime)s [%(processName)s: %(process)d] [%(threadName)s: %(thread)d] [%(levelname)s] %(name)s: %(message)s")
    log_formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    )
    stream_handler.setFormatter(log_formatter)
    return stream_handler


def setup_root_logger() -> None:
    logging.root.setLevel(get_log_level().value)
    logging.root.addHandler(get_stream_handler())


def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(get_log_level().value)
    logger.addHandler(get_stream_handler())
    logger.propagate = False
    return logger
