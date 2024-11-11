from typing import Annotated
from sqlalchemy import create_engine, text
from pydantic import BaseModel
from datetime import datetime

from admyral.action import action, ArgumentMetadata
from admyral.typings import JsonValue
from admyral.context import ctx
from admyral.secret.secret import register_secret


@register_secret(secret_type="Database")
class DatabaseSecret(BaseModel):
    uri: str


def _handle_datetime_in_row(row: tuple) -> tuple:
    return tuple(
        item.isoformat().replace("+00:00", "Z") if isinstance(item, datetime) else item
        for item in row
    )


@action(
    display_name="Run SQL Query",
    display_namespace="Database",
    description="Run a SQL query on a database. Supported databases: PostgreSQL, MySQL, and MariaDB.",
    secrets_placeholders=["DB_URI"],
)
def run_sql_query(
    sql_query: Annotated[
        str,
        ArgumentMetadata(
            display_name="SQL Query", description="The query to run on the database"
        ),
    ],
) -> JsonValue:
    secret = ctx.get().secrets.get("DB_URI")
    secret = DatabaseSecret.model_validate(secret)

    db_uri = secret.uri
    if db_uri.startswith("mysql://"):
        db_uri = db_uri.replace("mysql://", "mysql+pymysql://")
    if db_uri.startswith("postgres://"):
        db_uri = db_uri.replace("postgres://", "postgresql://")

    with create_engine(db_uri).connect() as connection:
        result = connection.execute(text(sql_query))
        if not result.returns_rows:
            return
        columns = result.keys()
        return [
            dict(zip(columns, _handle_datetime_in_row(row)))
            for row in result.fetchall()
        ]
