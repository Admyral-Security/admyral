"""

admyral workflow push no_public_write_access_aws_s3_bucket -f workflows/no_public_aws_s3_bucket.py --activate
admyral workflow push no_public_read_access_aws_s3_bucket -f workflows/no_public_aws_s3_bucket.py --activate

"""

from admyral.workflow import workflow, Schedule
from admyral.typings import JsonValue
from admyral.actions import (
    aws_s3_restrict_public_read_access,
    aws_s3_restrict_public_write_access,
    filter,
    pass_control,
    fail_control,
    send_slack_message_to_user_by_email,
    format_json_to_list_view_string,
)


@workflow(
    description="Check whether no AWS S3 Bucket is publicly accessible.",
    triggers=[Schedule(interval_days=1)],
)
def no_public_read_access_aws_s3_bucket(payload: dict[str, JsonValue]):
    public_buckets_with_read_access = aws_s3_restrict_public_read_access(
        secrets={"AWS_SECRET": "aws_secret"}
    )
    public_buckets_with_read_access = filter(
        input_list=public_buckets_with_read_access["rows"],
        filter="x['resource'] not in ['arn:aws:s3:::admyral-assets']",
    )

    if public_buckets_with_read_access:
        control = fail_control()
        public_buckets = format_json_to_list_view_string(
            json_value=public_buckets_with_read_access, run_after=[control]
        )
        send_slack_message_to_user_by_email(
            email="daniel@admyral.ai",
            text=f"🚨 AWS S3 Buckets with Public Read Detected 🚨\n{public_buckets}",
            secrets={"SLACK_SECRET": "slack_secret"},
        )
    else:
        pass_control()


@workflow(
    description="Check whether no AWS S3 Bucket is publicly accessible.",
    triggers=[Schedule(interval_days=1)],
)
def no_public_write_access_aws_s3_bucket(payload: dict[str, JsonValue]):
    public_buckets_with_write_access = aws_s3_restrict_public_write_access(
        secrets={"AWS_SECRET": "aws_secret"}
    )

    if public_buckets_with_write_access["rows"]:
        control = fail_control()
        public_buckets = format_json_to_list_view_string(
            json_value=public_buckets_with_write_access["rows"], run_after=[control]
        )
        send_slack_message_to_user_by_email(
            email="daniel@admyral.ai",
            text=f"🚨 AWS S3 Buckets with Public Write Detected 🚨\n{public_buckets}",
            secrets={"SLACK_SECRET": "slack_secret"},
        )
    else:
        pass_control()
