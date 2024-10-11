from typing import Annotated
from sqlalchemy import create_engine, text

from admyral.action import action, ArgumentMetadata
from admyral.typings import JsonValue
from admyral.context import ctx


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
    db_uri = secret["uri"]

    if db_uri.startswith("mysql://"):
        db_uri = db_uri.replace("mysql://", "mysql+pymysql://")

    with create_engine(db_uri).connect() as connection:
        result = connection.execute(text(sql_query))
        if not result.returns_rows:
            return
        columns = result.keys()
        return [dict(zip(columns, row)) for row in result.fetchall()]
