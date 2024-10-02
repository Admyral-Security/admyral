from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlmodel import SQLModel, text
from alembic.config import Config
from alembic.runtime.environment import EnvironmentContext
from alembic.runtime.migration import RevisionStep
from alembic.script import ScriptDirectory
from pathlib import Path
import os
from typing import Callable, Optional, Iterable, Any
from sqlalchemy.engine import Connection
from functools import partial

from admyral.config.config import GlobalConfig, DatabaseType


# TODO: why are we filtering out the alembic_version table?
def include_object(object, name, type_, reflected, compare_to):
    if type_ == "table":
        return object.schema == "admyral" and name != "alembic_version"
    return True  # Include all other types by default


def get_admyral_dir() -> str:
    return str(Path(__file__).parent.parent.parent.parent)


class DatabaseManager:
    def __init__(self, engine: AsyncEngine, config: GlobalConfig) -> None:
        self.engine = engine
        self.config = config

        self.target_metadata = SQLModel.metadata

        # setup alembic config and context
        admyral_dir = get_admyral_dir()
        self.alembic_config = Config(os.path.join(admyral_dir, "alembic.ini"))
        self.alembic_config.set_main_option(
            "script_location", os.path.join(admyral_dir, "admyral", "db", "alembic")
        )
        self.script_directory = ScriptDirectory.from_config(self.alembic_config)
        self.context = EnvironmentContext(self.alembic_config, self.script_directory)

    def _get_postgres_setup_engine(self) -> str:
        # https://stackoverflow.com/questions/6506578/how-to-create-a-new-database-using-sqlalchemy/8977109#8977109
        db_name = self.config.database_url.split("/")[-1]
        db_url = self.config.database_url[: -len(db_name)] + "postgres"
        return create_async_engine(db_url, echo=True, future=True, pool_pre_ping=True)

    async def database_exists(self) -> bool:
        if self.config.database_type == DatabaseType.POSTGRES:
            engine = self._get_postgres_setup_engine()
            try:
                async with engine.connect() as conn:
                    result = await conn.execute(
                        text(
                            "select exists (select 1 from pg_database where datname = 'admyral')"
                        )
                    )
                    return result.scalar()
            except Exception:
                return False

        raise NotImplementedError(
            f"Unimplemented database type in database_exists: {self.database_type}"
        )

    async def create_database(self) -> None:
        if self.config.database_type == DatabaseType.POSTGRES:
            engine = self._get_postgres_setup_engine()
            async with engine.connect() as conn:
                await conn.execute(text("commit"))
                await conn.execute(text("create database admyral"))
            return

        raise NotImplementedError(
            f"Unimplemented database type in create_database: {self.database_type}"
        )

    async def drop_database(self) -> None:
        # TODO:
        raise NotImplementedError("Drop database not implemented yet.")

    async def migrate_database(self) -> None:
        # TODO: if the DB is not empty
        # => a lot of things could go wrong here
        # => we should probably backup the DB before we do this
        await self._upgrade()

    async def _run_migrations(
        self,
        fn: Optional[Callable[..., Iterable[RevisionStep]]],
    ) -> None:
        def _do_run_migrations(
            fn: Optional[Callable[..., Iterable[RevisionStep]]], connection: Connection
        ) -> None:
            fn_context = {}
            if fn:
                fn_context["fn"] = fn

            self.context.configure(
                connection=connection,
                target_metadata=self.target_metadata,  # TODO: understand target_metadata
                version_table_schema=self.target_metadata.schema,  # TODO: understand version_table_schema?
                include_schemas=True,  # TODO: understand include_schemas?
                include_object=include_object,
                # compare_type=True, # TODO: is this helpful?
                # render_as_batch=True, # TODO: is this helpful?
                **fn_context,
            )

            with self.context.begin_transaction():
                self.context.run_migrations()

        fn_context = {}
        if fn:
            fn_context["fn"] = fn

        async with self.engine.connect() as conn:
            await conn.run_sync(partial(_do_run_migrations, fn))

    async def _upgrade(self, revision: str = "heads") -> None:
        def do_upgrade(rev: Any, context: Any) -> list[Any]:
            return self.script_directory._upgrade_revs(
                revision,
                rev,
            )

        await self._run_migrations(do_upgrade)

    async def _downgrade(self, revision: str) -> None:
        def do_downgrade(rev: Any, context: Any) -> list[Any]:
            return self.script_directory._downgrade_revs(
                revision,
                rev,
            )

        await self._run_migrations(do_downgrade)
