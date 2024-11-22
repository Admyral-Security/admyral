"""

How to push this workflow to Admyral:

1. Replace the placeholders marked with TODO in the workflow code below.

2. Save the changes.

3. Use the following CLI commands for pushing the workflow (WARNING: Make sure that the file paths are correct):

admyral action push count_number_of_changes_in_git_diff -a workflows/monitor_and_follow_up_merged_github_prs_without_approval/monitor_and_follow_up_merged_github_prs_without_approval.py
admyral action push contains_pull_request_approval_as_comment_after_merge -a workflows/monitor_and_follow_up_merged_github_prs_without_approval/monitor_and_follow_up_merged_github_prs_without_approval.py
admyral action push clean_git_diff -a workflows/monitor_and_follow_up_merged_github_prs_without_approval/monitor_and_follow_up_merged_github_prs_without_approval.py

admyral workflow push workflows/monitor_and_follow_up_merged_github_prs_without_approval/monitor_and_follow_up_merged_github_prs_without_approval.yaml --activate
admyral workflow push workflows/monitor_and_follow_up_merged_github_prs_without_approval/handle_merged_github_pr_without_approval.yaml --activate

4. Connect to the following tools (see docs.admyral.dev for more information):

    - Slack
    - GitHub
    - Jira
    - OpenAI

"""

from typing import Annotated
from dateutil import parser

from admyral.typings import JsonValue
from admyral.action import action, ArgumentMetadata


@action(
    display_name="Count Number of Changes in Git Diff",
    display_namespace="GitHub",
    description="Count the number of changes in a git diff",
)
def count_number_of_changes_in_git_diff(
    git_diff: Annotated[
        dict[str, JsonValue],
        ArgumentMetadata(
            display_name="Git Diff",
            description="The git diff to be checked",
        ),
    ],
) -> int:
    return sum(map(lambda file: file["changes"], git_diff["files"]))


@action(
    display_name="Contains Pull Request Approval as Comment After Merge?",
    display_namespace="GitHub",
    description='Check whether there is a comment "approved" in the review history after the merge.',
    requirements=["dateutil"],
)
def contains_pull_request_approval_as_comment_after_merge(
    comments: Annotated[
        list[dict[str, JsonValue]],
        ArgumentMetadata(
            display_name="Comments",
            description="The comments of the pull request.",
        ),
    ],
    merged_at: Annotated[
        str,
        ArgumentMetadata(
            display_name="Merged At",
            description="The timestamp when the pull request was merged.",
        ),
    ],
    approval_keywords: Annotated[
        str | list[str],
        ArgumentMetadata(
            display_name="Approval Keywords",
            description="The keywords to check for approval.",
        ),
    ] = ["approved"],
) -> bool:
    merged_at = parser.parse(merged_at)
    allowed_approval_keywords = set(
        approval_keywords
        if isinstance(approval_keywords, list)
        else [approval_keywords]
    )
    return any(
        map(
            lambda review: review.get("body", "") in allowed_approval_keywords
            and parser.parse(review.get("created_at")) > merged_at,
            comments,
        )
    )


@action(
    display_name="Clean Git Diff",
    display_namespace="GitHub",
    description="Clean the git diff to remove unnecessary information.",
)
def clean_git_diff(
    git_diff: Annotated[
        str,
        ArgumentMetadata(
            display_name="Git Diff",
            description="The git diff to be cleaned",
        ),
    ],
) -> dict[str, JsonValue]:
    return "\n".join(
        filter(
            lambda line: line.startswith("+") or line.startswith("-"),
            git_diff.split("\n"),
        )
    )
