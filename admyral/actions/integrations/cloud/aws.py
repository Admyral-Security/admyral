from typing import Annotated

from admyral.action import action, ArgumentMetadata
from admyral.context import ctx
from admyral.typings import JsonValue
from admyral.actions.integrations.shared.steampipe import run_steampipe_query


@action(
    display_name="AWS Steampipe Query",
    display_namespace="AWS",
    description="Query AWS using Steampipe",
    secrets_placeholders=["AWS_SECRET"],
)
def steampipe_query_aws(
    query: Annotated[
        str,
        ArgumentMetadata(
            display_name="Query",
            description="The Steampipe query to execute",
        ),
    ],
) -> JsonValue:
    secret = ctx.get().secrets.get("AWS_SECRET")
    aws_access_key_id = secret["aws_access_key_id"]
    aws_secret_access_key = secret["aws_secret_access_key"]

    return run_steampipe_query(query, aws_access_key_id, aws_secret_access_key)
