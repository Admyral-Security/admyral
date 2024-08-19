from logging.config import fileConfig

import asyncio
import os
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from sqlalchemy import pool
from sqlmodel import SQLModel
from dotenv import load_dotenv
import aiofiles.os

from alembic import context

from admyral.db.schemas import *  # noqa F403

load_dotenv()

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
# target_metadata = None
target_metadata = SQLModel.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url", os.environ["MIGRATION_DATABASE_URL"])

    # if we have a SQLite database, we need to make sure that its parent directory exists.
    if url.startswith("sqlite"):
        db_parent_path = os.path.dirname(url.split("///")[1])
        path_exists = os.path.exists(db_parent_path)
        if not path_exists:
            os.makedirs(db_parent_path, exist_ok=True)

    context.configure(
        url=url,
        target_metadata=target_metadata,
        version_table_schema=target_metadata.schema,
        literal_binds=True,
        include_schemas=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    cfg = config.get_section(config.config_ini_section)
    cfg["sqlalchemy.url"] = cfg.get(
        "sqlalchemy.url", os.environ.get("MIGRATION_DATABASE_URL")
    )

    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        version_table_schema=target_metadata.schema,
        include_schemas=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """In this scenario we need to create an Engine
    and associate a connection with the context.

    """

    cfg = config.get_section(config.config_ini_section, {})
    cfg["sqlalchemy.url"] = cfg.get(
        "sqlalchemy.url", os.environ.get("MIGRATION_DATABASE_URL")
    )

    # if we have a SQLite database, we need to make sure that its parent directory exists.
    db_url = cfg["sqlalchemy.url"]
    if db_url.startswith("sqlite"):
        db_parent_path = os.path.dirname(db_url.split("///")[1])
        path_exists = await aiofiles.os.path.exists(db_parent_path)
        if not path_exists:
            await aiofiles.os.makedirs(db_parent_path, exist_ok=True)

    connectable = async_engine_from_config(
        cfg,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""

    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
