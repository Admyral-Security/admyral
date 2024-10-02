from logging.config import fileConfig

import asyncio
import os
from sqlalchemy.engine import Connection, create_engine
from sqlalchemy.ext.asyncio import async_engine_from_config, create_async_engine
from sqlalchemy import pool
from sqlmodel import SQLModel, text
from dotenv import load_dotenv

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
    db_url = config.get_main_option(
        "sqlalchemy.url", os.environ["ADMYRAL_DATABASE_URL"]
    )
    # if url.startswith("postgresql://"):
    #     url = url.replace("postgresql://", "postgresql+asyncpg://")

    # create database
    orig_db_name = db_url.split("/")[-1]
    postgres_db_url = db_url[: -len(orig_db_name)] + "postgres"
    engine = create_engine(postgres_db_url, echo=True, future=True, pool_pre_ping=True)
    with engine.connect() as conn:
        result = conn.execute(
            text(
                f"select exists (select 1 from pg_database where datname = '{orig_db_name}')"
            )
        )
        if not result.scalar():
            conn.execute(text("commit"))
            conn.execute(text(f"create database {orig_db_name}"))

    context.configure(
        url=db_url,
        target_metadata=target_metadata,
        version_table_schema=target_metadata.schema,
        literal_binds=True,
        include_schemas=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
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
        "sqlalchemy.url", os.environ.get("ADMYRAL_DATABASE_URL")
    )
    if cfg["sqlalchemy.url"].startswith("postgresql://"):
        cfg["sqlalchemy.url"] = cfg["sqlalchemy.url"].replace(
            "postgresql://", "postgresql+asyncpg://"
        )

    # create database
    db_url = cfg["sqlalchemy.url"]
    orig_db_name = db_url.split("/")[-1]
    postgres_db_url = db_url[: -len(orig_db_name)] + "postgres"
    engine = create_async_engine(
        postgres_db_url, echo=True, future=True, pool_pre_ping=True
    )
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                f"select exists (select 1 from pg_database where datname = '{orig_db_name}')"
            )
        )
        if not result.scalar():
            await conn.execute(text("commit"))
            await conn.execute(text(f"create database {orig_db_name}"))

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
