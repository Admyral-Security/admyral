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


@action(
    display_name="Control: S3 Bucket Access Logging",
    display_namespace="AWS",
    description="S3 server access logging provides a method to monitor the network for potential cybersecurity events.",
    secrets_placeholders=["AWS_SECRET"],
)
def aws_s3_bucket_logging_enabled(
    query: Annotated[
        str,
        ArgumentMetadata(
            display_name="Query",
            description="The query representing the control",
        ),
    ] = """select
    arn as resource,
    case
    when logging->'TargetBucket' is null then 'alarm'
    else 'ok'
    end as status,
    case
    when logging->'TargetBucket' is null then title || ' logging disabled.'
    else title || ' logging enabled.'
    end as reason
from
    aws_s3_bucket;
    """,
) -> JsonValue:
    secret = ctx.get().secrets.get("AWS_SECRET")
    aws_access_key_id = secret["aws_access_key_id"]
    aws_secret_access_key = secret["aws_secret_access_key"]

    return run_steampipe_query(query, aws_access_key_id, aws_secret_access_key)


@action(
    display_name="Control: S3 Bucket Enforce SSL",
    display_namespace="AWS",
    description="To help protect data in transit, ensure that your S3 buckets require requests to use SSL.",
    secrets_placeholders=["AWS_SECRET"],
)
def aws_s3_bucket_enforce_ssl(
    query: Annotated[
        str,
        ArgumentMetadata(
            display_name="Query",
            description="The query representing the control",
        ),
    ] = """with ssl_ok as (
    select
        distinct name,
        arn,
        'ok' as status
    from
        aws_s3_bucket,
        jsonb_array_elements(policy_std -> 'Statement') as s,
        jsonb_array_elements_text(s -> 'Principal' -> 'AWS') as p,
        jsonb_array_elements_text(s -> 'Action') as a,
        jsonb_array_elements_text(s -> 'Resource') as r,
        jsonb_array_elements_text(
            s -> 'Condition' -> 'Bool' -> 'aws:securetransport'
        ) as ssl
    where
        p = '*'
        and s ->> 'Effect' = 'Deny'
        and ssl :: bool = false
)
select
    b.arn as resource,
    case
        when ok.status = 'ok' then 'ok'
        else 'alarm'
    end status,
    case
        when ok.status = 'ok' then b.name || ' bucket policy enforces HTTPS.'
        else b.name || ' bucket policy does not enforce HTTPS.'
    end reason
from
    aws_s3_bucket as b
left join ssl_ok as ok on ok.name = b.name;
    """,
) -> JsonValue:
    secret = ctx.get().secrets.get("AWS_SECRET")
    aws_access_key_id = secret["aws_access_key_id"]
    aws_secret_access_key = secret["aws_secret_access_key"]

    return run_steampipe_query(query, aws_access_key_id, aws_secret_access_key)


@action(
    display_name="Control: S3 Bucket Restrict Public Read Access",
    display_namespace="AWS",
    description="S3 public read access should be blocked.",
    secrets_placeholders=["AWS_SECRET"],
)
def aws_s3_restrict_public_read_access(
    query: Annotated[
        str,
        ArgumentMetadata(
            display_name="Query",
            description="The query representing the control",
        ),
    ] = """with public_acl as (
    select
        distinct name
    from
        aws_s3_bucket,
        jsonb_array_elements(acl->'Grants') as grants
    where
        (grants->'Grantee'->>'URI' = 'http://acs.amazonaws.com/groups/global/AllUsers'
        or grants->'Grantee'->>'URI' = 'http://acs.amazonaws.com/groups/global/AuthenticatedUsers')
        and (
          grants->>'Permission' = 'FULL_CONTROL'
          or grants->>'Permission' = 'READ_ACP'
          or grants->>'Permission' = 'READ'
        )
),read_access_policy as (
    select
        distinct name
    from
        aws_s3_bucket,
        jsonb_array_elements(policy_std->'Statement') as s,
        jsonb_array_elements_text(s->'Action') as action
    where
        s->>'Effect' = 'Allow'
        and (
            s->'Principal'->'AWS' = '["*"]'
            or s->>'Principal' = '*'
        )
        and (
            action = '*'
            or action = '*:*'
            or action = 's3:*'
            or action ilike 's3:get%'
            or action ilike 's3:list%'
        )
)
select
    b.arn as resource,
    case
        when (block_public_acls or a.name is null) and not bucket_policy_is_public then 'ok'
        when (block_public_acls or a.name is null) and (bucket_policy_is_public and block_public_policy) then 'ok'
        when (block_public_acls or a.name is null) and (bucket_policy_is_public and p.name is null) then 'ok'
        else 'alarm'
    end as status,
    case
        when (block_public_acls or a.name is null) and not bucket_policy_is_public then b.title || ' not publicly readable.'
        when (block_public_acls or a.name is null) and (bucket_policy_is_public and block_public_policy) then b.title || ' not publicly readable.'
        when (block_public_acls or a.name is null) and (bucket_policy_is_public and p.name is null) then  b.title || ' not publicly readable.'
        else b.title || ' publicly readable.'
    end as reason
from
    aws_s3_bucket as b
    left join public_acl as a on b.name = a.name
    left join read_access_policy as p on b.name = p.name;
    """,
) -> JsonValue:
    secret = ctx.get().secrets.get("AWS_SECRET")
    aws_access_key_id = secret["aws_access_key_id"]
    aws_secret_access_key = secret["aws_secret_access_key"]

    return run_steampipe_query(query, aws_access_key_id, aws_secret_access_key)


@action(
    display_name="Control: S3 Bucket Restrict Public Write Access",
    display_namespace="AWS",
    description="S3 public write access should be blocked.",
    secrets_placeholders=["AWS_SECRET"],
)
def aws_s3_restrict_public_write_access(
    query: Annotated[
        str,
        ArgumentMetadata(
            display_name="Query",
            description="The query representing the control",
        ),
    ] = """with public_acl as (
    select
        distinct name
    from
        aws_s3_bucket,
        jsonb_array_elements(acl -> 'Grants') as grants
    where
        (grants -> 'Grantee' ->> 'URI' = 'http://acs.amazonaws.com/groups/global/AllUsers'
        or grants -> 'Grantee' ->> 'URI' = 'http://acs.amazonaws.com/groups/global/AuthenticatedUsers')
        and (
          grants ->> 'Permission' = 'FULL_CONTROL'
          or grants ->> 'Permission' = 'WRITE_ACP'
          or grants ->> 'Permission' = 'WRITE'
        )
), write_access_policy as (
    select
        distinct name
    from
        aws_s3_bucket,
        jsonb_array_elements(policy_std -> 'Statement') as s,
        jsonb_array_elements_text(s -> 'Action') as action
    where
        s ->> 'Effect' = 'Allow'
        and (
        s -> 'Principal' -> 'AWS' = '["*"]'
        or s ->> 'Principal' = '*'
        )
        and (
            action = '*'
            or action = '*:*'
            or action = 's3:*'
            or action ilike 's3:put%'
            or action ilike 's3:delete%'
            or action ilike 's3:create%'
            or action ilike 's3:update%'
            or action ilike 's3:replicate%'
            or action ilike 's3:restore%'
        )
)
select
    b.arn as resource,
    case
        when (block_public_acls or a.name is null) and not bucket_policy_is_public then 'ok'
        when (block_public_acls or a.name is null) and (bucket_policy_is_public and block_public_policy) then 'ok'
        when bucket_policy_is_public and p.name is null then 'ok'
        else 'alarm'
    end status,
    case
        when (block_public_acls or a.name is null ) and not bucket_policy_is_public then b.title || ' not publicly writable.'
        when (block_public_acls or a.name is null) and (bucket_policy_is_public and block_public_policy) then b.title || ' not publicly writable.'
        when (block_public_acls or a.name is null) and (bucket_policy_is_public and p.name is null) then b.title || ' not publicly writable.'
        else b.title || ' publicly writable.'
    end reason
from
    aws_s3_bucket as b
    left join public_acl as a on b.name = a.name
    left join write_access_policy as p on b.name = p.name;
    """,
) -> JsonValue:
    secret = ctx.get().secrets.get("AWS_SECRET")
    aws_access_key_id = secret["aws_access_key_id"]
    aws_secret_access_key = secret["aws_secret_access_key"]

    return run_steampipe_query(query, aws_access_key_id, aws_secret_access_key)


@action(
    display_name="Control: S3 Bucket Default Encryption Enabled",
    display_namespace="AWS",
    description="S3 bucket default encryption should be enabled.",
    secrets_placeholders=["AWS_SECRET"],
)
def aws_s3_default_encryption_enabled(
    query: Annotated[
        str,
        ArgumentMetadata(
            display_name="Query",
            description="The query representing the control",
        ),
    ] = """select
    arn as resource,
    case
        when server_side_encryption_configuration is not null then 'ok'
        else 'alarm'
    end status,
    case
        when server_side_encryption_configuration is not null then name || ' default encryption enabled.'
        else name || ' default encryption disabled.'
    end reason
from
    aws_s3_bucket;
    """,
) -> JsonValue:
    secret = ctx.get().secrets.get("AWS_SECRET")
    aws_access_key_id = secret["aws_access_key_id"]
    aws_secret_access_key = secret["aws_secret_access_key"]

    return run_steampipe_query(query, aws_access_key_id, aws_secret_access_key)
