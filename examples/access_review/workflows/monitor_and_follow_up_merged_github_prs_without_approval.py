"""

How to push this workflow to Admyral:

1. Replace the placeholders marked with TODO in the workflow code below.

2. Save the changes.

3. Use the following CLI commands for pushing the workflow (WARNING: Make sure that the file paths are correct):

admyral action push count_number_of_changes_in_git_diff -a workflows/monitor_and_follow_up_merged_github_prs_without_approval.py
admyral action push contains_pull_request_approval_as_comment_after_merge -a workflows/monitor_and_follow_up_merged_github_prs_without_approval.py
admyral action push clean_git_diff -a workflows/monitor_and_follow_up_merged_github_prs_without_approval.py
admyral workflow push monitor_merged_github_prs_without_approval -f workflows/monitor_and_follow_up_merged_github_prs_without_approval.py --activate
admyral workflow push handle_merged_github_pr_without_approval -f workflows/monitor_and_follow_up_merged_github_prs_without_approval.py --activate

4. Connect to the following tools (see docs.admyral.dev for more information):

    - Slack
    - GitHub
    - Jira
    - OpenAI

"""

from typing import Annotated
from dateutil import parser

from admyral.workflow import workflow, Schedule
from admyral.typings import JsonValue
from admyral.action import action, ArgumentMetadata
from admyral.actions import (
    list_github_merged_pull_requests_without_approval,
    get_time_interval_of_last_n_days,
    send_slack_message,
    send_list_elements_to_workflow,
    compare_two_github_commits,
    transform,
    send_slack_message_to_user_by_email,
    wait,
    create_jira_issue,
    openai_chat_completion,
    list_github_issue_comments,
)


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
) -> bool:
    merged_at = parser.parse(merged_at)
    return any(
        map(
            lambda review: review.get("body", "").lower() == "approved"
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


@workflow(
    description="Monitor Merged GitHub PRs Without Approval",
    triggers=[Schedule(interval_days=1)],
)
def monitor_merged_github_prs_without_approval(payload: dict[str, JsonValue]):
    last_day_time_interval = get_time_interval_of_last_n_days(n_days=1)

    unreviewed_prs = list_github_merged_pull_requests_without_approval(
        repo_owner="Admyral-Security",  # TODO: set your repo owner here
        repo_name="Admyral_Github_Integration_Test",  # TODO: set your repo name here
        start_time=last_day_time_interval[0],
        end_time=last_day_time_interval[1],
        secrets={"GITHUB_SECRET": "github_secret"},
    )

    send_list_elements_to_workflow(
        workflow_name="handle_merged_github_pr_without_approval",
        elements=unreviewed_prs,
        shared_data={
            "repo_owner": "Admyral-Security",  # TODO: set your repo owner here
            "repo_name": "Admyral_Github_Integration_Test",  # TODO: set your repo name here
        },
    )


@workflow(
    description="Handle Merged GitHub PRs Without Approval",
)
def handle_merged_github_pr_without_approval(payload: dict[str, JsonValue]):
    commit_diff_info = compare_two_github_commits(
        repo_owner=payload["shared"]["repo_owner"],
        repo_name=payload["shared"]["repo_name"],
        base=payload["element"]["last_approved_commit_id"],
        head=payload["element"]["last_commit_id"],
        diff_type="json",
        secrets={"GITHUB_SECRET": "github_secret"},
    )

    line_changes_count = count_number_of_changes_in_git_diff(git_diff=commit_diff_info)

    if line_changes_count < 50:
        # Perform classification of the git diff changes
        commit_diff = compare_two_github_commits(
            repo_owner=payload["shared"]["repo_owner"],
            repo_name=payload["shared"]["repo_name"],
            base=payload["element"]["last_approved_commit_id"],
            head=payload["element"]["last_commit_id"],
            diff_type="diff",
            secrets={"GITHUB_SECRET": "github_secret"},
        )

        commit_diff_cleaned = clean_git_diff(git_diff=commit_diff)

        git_diff_summary = openai_chat_completion(
            model="gpt-4o",
            prompt=f'You are an expert level software engineer and should summarize git diffs. \
                For the git differences, it\'s important to check for code additions (+) or code deletions (-). Lines which are not prefixed with + or - did not change. Please  \n\
                pay close attention to the +/- and only consider true code changes in your summary! Here are some examples:\n\
                \n\
                Example 1: \n\
                diff --git a/src/union_find.rs b/src/union_find.rs \n\
                index ee49a24..8e3eb35 100644 \n\
                --- a/src/union_find.rs \n\
                +++ b/src/union_find.rs \n\
                @@ -19,16 +19,6 @@ pub struct UnionFind<T: Debug + Eq + Hash> {{ \n\
                }} \n\
                \n\
                impl<T: Debug + Eq + Hash> UnionFind<T> {{ \n\
                -    /// Creates an empty Union-Find structure with a specified capacity. \n\
                -    pub fn with_capacity(capacity: usize) -> Self {{ \n\
                -        Self {{ \n\
                -            parent_links: Vec::with_capacity(capacity), \n\
                -            sizes: Vec::with_capacity(capacity), \n\
                -            payloads: HashMap::with_capacity(capacity), \n\
                -            count: 0, \n\
                -        }} \n\
                -    }} \n\
                -  \n\
                    /// Inserts a new item (disjoint set) into the data structure. \n\
                    pub fn insert(&mut self, item: T) {{ }} \n\
                        let key = self.payloads.len(); \n\
                \n\
                Summary: \n\
                This diff removes the with_capacity method from the UnionFind struct implementation in the file union_find.rs. The method was used to create an empty Union-Find structure with a \n\
                specified initial capacity. Its removal simplifies the API by eliminating this initialization option. \n\
                \n\
                Example 2: \n\
                diff --git a/web/src/components/workflow-editor/edit-panel/action-edit-panel.tsx b/web/src/components/workflow-editor/edit-panel/action-edit-panel.tsx \n\
                index ea112c9..e457dd0 100644 \n\
                --- a/web/src/components/workflow-editor/edit-panel/action-edit-panel.tsx \n\
                +++ b/web/src/components/workflow-editor/edit-panel/action-edit-panel.tsx \n\
                @@ -167,18 +167,20 @@ export default function ActionEditPanel() {{ \n\
                        <Text color="gray" weight="light" size="1"> \n\
                                Type: {{argument.argType}} \n\
                        </Text> \n\
                -       <TextArea \n\
                -               variant="surface" \n\
                -               value={{args[argIdx]}} \n\
                -               resize="vertical" \n\
                -               onChange={{(event) => \n\
                -                       onChangeActionArgument( \n\
                -                               argument.argName, \n\
                -                               argIdx, \n\
                -                               event, \n\
                -                       ) \n\
                -               }} \n\
                -       /> \n\
                +       <Flex> \n\
                +               <CodeEditorWithDialog \n\
                +                       title="Edit Default Value" \n\
                +                       value={{defaultArg[1]}} \n\
                +                       onChange={{(value) => handleScheduleDefaultArgValue( \n\
                +                               scheduleIdx, \n\
                +                               defaultArgIdx, \n\
                +                               value || "", \n\
                +                       )}} \n\
                +                       language="json" \n\
                +               /> \n\
                +       </Flex> \n\
                        <Flex justify="end"> \n\
                                <Text color="gray" weight="light" size="1"> \n\
                                {{argument.isOptional ? "Optional" : "Required"}} \n\
                \n\
                Summary:\n\
                This diff replaces a simple TextArea for editing action arguments with a more advanced CodeEditorWithDialog component. The new \
                component is specifically for editing default values in JSON format, suggesting an improved user interface for this task. \n\
                \n\
                Example 3: \n\
                diff --git a/admyral/workers/shared_worker_state.py b/admyral/workers/shared_worker_state.py\n\
                index 1d1a58a..8af5d91 100644\n\
                --- a/admyral/workers/shared_worker_state.py\n\
                +++ b/admyral/workers/shared_worker_state.py\n\
                @@ -18,12 +18,28 @@ class SharedWorkerState(metaclass=Singleton):\n\
                \n\
                    @classmethod\n\
                    def get_store(cls) -> StoreInterface:\n\
                +        """ \n\
                +        Retrieve the shared store instance.\n\
                + \n\
                +        Returns:\n\
                +            StoreInterface: The shared store instance.\n\
                +        Raises:\n\
                +            RuntimeError: If the shared store has not been initialized.\n\
                +        """ \n\
                        if not cls._store:\n\
                            raise RuntimeError("SharedWorkerState not initialized.")\n\
                        return cls._store\n\
                \n\
                    @classmethod\n\
                    def get_secrets_manager(cls) -> SecretsManager:\n\
                +        """\n\
                +        Retrieve the SecretsManager instance.\n\
                + \n\
                +        Returns: \n\
                +            SecretsManager: The instance of SecretsManager.\n\
                +        Raises:\n\
                +            RuntimeError: If the SharedWorkerState is not initialized.\n\
                +        """\n\
                        if not cls._secrets_manager:\n\
                            raise RuntimeError("SharedWorkerState not initialized.")\n\
                        return cls._secrets_manager\n\
                \n\
                Summary:\n\
                This git diff shows changes to the file shared_worker_state.py in the admyral/workers/ directory. The changes include:\n\
                - Adding docstrings to two methods: get_store() and get_secrets_manager().\n\
                - The docstrings provide information about what each method returns and what exceptions they might raise.\n\
                - No functional changes were made to the code itself; the modifications are purely for documentation purposes.\n\
                \n\
                Please now carefully summarize the following git diff: \n\
                {commit_diff_cleaned}',
            secrets={"OPENAI_SECRET": "openai_secret"},
        )

        is_major_change = openai_chat_completion(
            model="gpt-4o",
            prompt=f"You are an expert software engineer and should interpret summaries of git diffs, if there were major or only minor changes. \
                Major changes would be adding a new feature or changing the functionality of an existing feature, hence potentially breaking changes. \
                Minor changes on the other hand would be adding / fixing a comment or documentation, hence changes that don't influence the functionality of the code. \
                The severity of the changes determine if they should be reviewed by an engineer. Hence, there are two options: \n\
                1. The changes should get reviewed as they include potentially breaking changes or alter the functionality of the code.\n\
                2. The changes don't have to be reviewed as they only include minor changes which do not alter or add functionality of the software in any way.\n\
                Here is the summary of the changes:\n{git_diff_summary}\n\
                If the summarized changes are major, i.e., they include changes to functionality or potentially breaking changes, please answer with 1. \
                If the summarized changes are minor, i.e., they only include changes to comments or documentation, please answer with 2. \
                Please only answer with either 1 or 2 followed by \n and nothing else. If you are unsure, be careful and answer with 1.",
            stop_tokens=["\n"],
            secrets={"OPENAI_SECRET": "openai_secret"},
        )
    else:
        # The diff is too large, hence, we have a major change
        is_major_change = transform(value="1")

    if is_major_change == "1":
        jira_issue = create_jira_issue(
            summary=f"Unreviewed commits were merged. Pull Request: {payload["element"]["title"]}",
            project_id="10001",  # TODO: set your Jira project id here
            issue_type="Bug",
            description={
                "content": [
                    {
                        "content": [
                            {
                                "text": f"Title: {payload['element']['title']}\n"
                                f"Repository: {payload["shared"]['repo_owner']}/{payload["shared"]['repo_name']}\n"
                                f"User: {payload['element']['user']}\nLink: {payload['element']['html_url']}\n"
                                f"Merged At: {payload['element']['merged_at']}",
                                "type": "text",
                            }
                        ],
                        "type": "paragraph",
                    },
                ],
                "type": "doc",
                "version": 1,
            },
            priority="High",
            secrets={"JIRA_SECRET": "jira_secret"},
        )

        # Send to an alert channel
        first_message = send_slack_message(
            channel_id="C06QP0KV1L2",  # TODO: set your slack channel here
            # TODO: set your Jira URL in the test message
            text=f"Unreviewed commits were merged.\nPull Request: {payload["element"]["title"]}\n"
            f"{payload["element"]["html_url"]}\nUser: {payload['element']['user']}\n"
            f"Jira issue: https://admyral.atlassian.net/browse/{jira_issue["key"]}\n\n"
            "Please let the changes be approved by letting a peer comment the merged PR with \"approved\" "
            "within the next 24 hours and close the ticket after the review.",
            secrets={"SLACK_SECRET": "slack_secret"},
        )

        wait_res = wait(
            seconds=120, run_after=[first_message]
        )  # TODO: configure your wait time here

        # check again whether there was an approval
        comments = list_github_issue_comments(
            repo_owner=payload["shared"]["repo_owner"],
            repo_name=payload["shared"]["repo_name"],
            number=payload["element"]["number"],
            secrets={"GITHUB_SECRET": "github_secret"},
            run_after=[wait_res],
        )
        has_approval_as_comment = contains_pull_request_approval_as_comment_after_merge(
            comments=comments,
            merged_at=payload["element"]["merged_at"],
        )

        if not has_approval_as_comment:
            # Send message to responsible user for handling such cases
            send_slack_message_to_user_by_email(
                email="daniel@admyral.ai",  # TODO: set your email here
                text=f"ATTENTION: There was no follow up on the merged unreviewed commits of pull request {payload['element']['title']}.\n"
                f"Jira Ticket: https://admyral.atlassian.net/browse/{jira_issue['key']}.",  # TODO: set your Jira URL here
                secrets={"SLACK_SECRET": "slack_secret"},
            )
