from typing import Optional, Tuple
from openai import AsyncOpenAI
from pydantic import BaseModel
from collections import defaultdict
import json
import logging

from app.core.utils import UnionFind
from app.schema import ActionType, EdgeType
from app.config import settings

logger = logging.getLogger(__name__)


MODEL = "gpt-4-turbo-2024-04-09"


tools = [
    {
        "type": "function",
        "function":{
            "name": "build_workflow_layout",
            "function": {
                "parameters": {
                    "type": "object",
                    "properties": {
                        "actions": {
                            "type": "array",
                            "description": "The actions of the workflow",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "action_id": {
                                        "type": "string",
                                        "description": "The ID of the action",
                                    },
                                    "action_type": {
                                        "type": "string",
                                        "description": "The type of the action",
                                        "enum": ["HTTP_REQUEST", "WEBHOOK", "MANUAL_START", "AI_ACTION", "IF_CONDITION", "SEND_EMAIL"],
                                    },
                                    "action_name": {
                                        "type": "string",
                                        "description": "A descriptive, high-level name of the action",
                                    }
                                },
                                "required": ["action_id", "action_type", "action_name"],
                            }
                        },
                        "connections": {
                            "type": "array",
                            "description": "The connections between the actions of the workflow graph",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "source": {
                                        "type": "string",
                                        "description": "The ID of the source action",
                                    },
                                    "target": {
                                        "type": "string",
                                        "description": "The ID of the target action",
                                    },
                                    "connection_type": {
                                        "type": "string",
                                        "description": "The type of the connection. Note that the connection type of a connection where the source is an IF_CONDITION must either be TRUE or FALSE. In all other cases, the connectin type must be DEFAULT.",
                                        "enum": ["DEFAULT", "TRUE", "FALSE"],
                                    },
                                    "required": ["source", "target", "connection_type"],
                                },
                            }
                        }
                    },
                    "required": ["actions", "connections"],
                },
            }
        }
    }
]


examples = [
    {
        "name": "File Hash Analysis with VirusTotal",
        "input": "Generate me a workflow which receives as input file hashes, analyzes them with VirusTotal, generates a summary of the results, and finally sends me a report via email.",
        "few_shot_example": """
            build_workflow_layout({{
                "actions": [
                    {{
                        "action_id": "1",
                        "action_type": "WEBHOOK",
                        "action_name": "Start the workflow"
                    }},
                    {{
                        "action_id": "2",
                        "action_type": "HTTP_REQUEST",
                        "action_name": "Search hash in VirusTotal"
                    }},
                    {{
                        "action_id": "3",
                        "action_type": "IF_CONDITION",
                        "action_name": "Check if hash was found"
                    }},
                    {{
                        "action_id": "4",
                        "action_type": "AI_ACTION",
                        "action_name": "Summarize VirusTotal findings"
                    }},
                    {{
                        "action_id": "5",
                        "action_type": "SEND_EMAIL",
                        "action_name": "Send file hash analysis via email"
                    }}
                ],
                "connections": [
                    {{
                        "source": "1",
                        "target": "2",
                        "connection_type": "DEFAULT"
                    }},
                    {{
                        "source": "2",
                        "target": "3",
                        "connection_type": "DEFAULT"
                    }},
                    {{
                        "source": "3",
                        "target": "4",
                        "connection_type": "TRUE"
                    }},
                    {{
                        "source": "4",
                        "target": "5",
                        "connection_type": "DEFAULT"
                    }}
                ]
            }})"""
    },
    {
        "name": "Initiate a takedown request in Phish Report",
        "input": "I need a workflow that initiates a takedown request using Phish Report using an URL as input. If the takedown request is successful, send me an email with details about the takedown case. If the takedown request fails, send me an email with the error message.",
        "few_shot_example": """
            build_workflow_layout({{
                "actions": [
                    {{
                        "action_id": "1",
                        "action_type": "WEBHOOK",
                        "action_name": "Submit URL"
                    }},
                    {{
                        "action_id": "2",
                        "action_type": "HTTP_REQUEST",
                        "action_name": "Submit a takedown case in Phish Report"
                    }},
                    {{
                        "action_id": "3",
                        "action_type": "IF_CONDITION",
                        "action_name": "Takedown submission successful?"
                    }},
                    {{
                        "action_id": "4",
                        "action_type": "HTTP_REQUEST",
                        "action_name": "Retrieve case from Phish Report"
                    }},
                    {{
                        "action_id": "5",
                        "action_type": "SEND_EMAIL",
                        "action_name": "Send takedown request report"
                    }},
                    {{
                        "action_id": "6",
                        "action_type": "SEND_EMAIL",
                        "action_name": "Send takedown request failure reason"
                    }}
                ],
                "connections": [
                    {{
                        "source": "1",
                        "target": "2",
                        "connection_type": "DEFAULT"
                    }},
                    {{
                        "source": "2",
                        "target": "3",
                        "connection_type": "DEFAULT"
                    }},
                    {{
                        "source": "3",
                        "target": "4",
                        "connection_type": "TRUE"
                    }},
                    {{
                        "source": "4",
                        "target": "5",
                        "connection_type": "DEFAULT"
                    }},
                    {{
                        "source": "3",
                        "target": "6",
                        "connection_type": "FALSE"
                    }}
                ]
            }})"""
    },
    {
        "name": "Threatpost News Summary",
        "input": "I want a workflow that fetches the latest news from Threatpost, summarizes the news articles, and sends me the summary via email.",
        "few_shot_example": """
            build_workflow_layout({{
                "actions": [
                    {{
                        "action_id": "1",
                        "action_type": "MANUAL_START",
                        "action_name": "Start the workflow"
                    }},
                    {{
                        "action_id": "2",
                        "action_type": "HTTP_REQUEST",
                        "action_name": "Retrieve Threatpost feed"
                    }},
                    {{
                        "action_id": "3",
                        "action_type": "AI_ACTION",
                        "action_name": "Summarize the news"
                    }},
                    {{
                        "action_id": "4",
                        "action_type": "SEND_EMAIL",
                        "action_name": "Send news summary"
                    }}
                ],
                "connections": [
                    {{
                        "source": "1",
                        "target": "2",
                        "connection_type": "DEFAULT"
                    }},
                    {{
                        "source": "2",
                        "target": "3",
                        "connection_type": "DEFAULT"
                    }},
                    {{
                        "source": "3",
                        "target": "4",
                        "connection_type": "DEFAULT"
                    }}
                ]
            }})"""
    },
    {
        "name": "Run an IP check through multiple services",
        "input": "Create a workflow that takes an IP address as input, runs it through the following services: AbuseIPDB, VirusTotal, GreyNoise, and Pulsedive. Then, generate a report and send me the report via email.",
        "few_shot_example": """
            build_workflow_layout({{
                "actions": [
                    {{
                        "action_id": "1",
                        "action_type": "WEBHOOK",
                        "action_name": "Webhook"
                    }},
                    {{
                        "action_id": "2",
                        "action_type": "HTTP_REQUEST",
                        "action_name": "Look up IP address in AbuseIPDB
                    }},
                    {{
                        "action_id": "3",
                        "action_type": "HTTP_REQUEST",
                        "action_name": "Look up IP address in VirusTotal"
                    }},
                    {{
                        "action_id": "4",
                        "action_type": "HTTP_REQUEST",
                        "action_name": "Look up IP address in GreyNoise"
                    }},
                    {{
                        "action_id": "5",
                        "action_type": "HTTP_REQUEST",
                        "action_name": "Look up IP address in Pulsedive"
                    }},
                    {{
                        "action_id": "6",
                        "action_type": "AI_ACTION",
                        "action_name": "Generate report about findings"
                    }},
                    {{
                        "action_id": "7",
                        "action_type": "SEND_EMAIL",
                        "action_name": "Send IP analysis report"
                    }}
                ],
                "connections": [
                    {{
                        "source": "1",
                        "target": "2",
                        "connection_type": "DEFAULT"
                    }},
                    {{
                        "source": "2",
                        "target": "3",
                        "connection_type": "DEFAULT"
                    }},
                    {{
                        "source": "3",
                        "target": "4",
                        "connection_type": "DEFAULT"
                    }},
                    {{
                        "source": "4",
                        "target": "5",
                        "connection_type": "DEFAULT"
                    }},
                    {{
                        "source": "5",
                        "target": "6",
                        "connection_type": "DEFAULT"
                    }},
                    {{
                        "source": "6",
                        "target": "7",
                        "connection_type": "DEFAULT"
                    }}
                ]
            }})"""
    }
]


def build_few_shot_examples(example_indexes: list[int]) -> str:
    prompt = ""
    for idx in example_indexes:
        prompt += f"Input: {examples[idx]['input']}\nOutput: {examples[idx]['few_shot_example']}\n\n" 
    return prompt


class Action(BaseModel):
    action_id: str
    action_type: ActionType
    action_name: str


class Connection(BaseModel):
    source: str
    target: str
    connection_type: EdgeType


def parse_workflow_layout(
    model_response: dict
) -> Tuple[Optional[Tuple[list[Action], list[Connection]]], Optional[str]]:
    params = set(model_response.keys())
    if "actions" not in params:
        return None, "Invalid input: Missing parameter 'actions'"
    if "connections" not in params:
        return None, "Invalid input: Missing parameter 'connections'"

    input_actions = model_response["actions"]
    input_connections = model_response["connections"]

    # Check 1: Verify correct graph syntax
    actions = []
    for action in input_actions:
        if set(action.keys()) != {"action_id", "action_type", "action_name"}:
            return None, f"Invalid action: {action}. Action must have keys: 'action_id', 'action_type', 'action_name'"

        try:
            actions.append(Action.model_validate(action))
        except Exception as e:
            return None, f"Invalid action ({str(action)}): {e}"

    connections = []
    for connection in input_connections:
        if set(connection.keys()) != {"source", "target", "connection_type"}:
            return None, f"Invalid connection: {connection}. Connection must have keys: 'source', 'target', 'connection_type'"

        try:
            connections.append(Connection.model_validate(connection))
        except Exception as e:
            return None, f"Invalid connection ({str(connection)}): {e}"

    # Check 2: IDs in actions are unique
    # Check 3: WEBHOOK or MANUAL_START action must exist
    found_start_action = False
    actions_index = {}
    for action in actions:
        found_start_action = found_start_action or action.action_type in (ActionType.WEBHOOK, ActionType.MANUAL_START)
        if action.action_id in actions_index:
            return None, f"Duplicate action_id: \"{action.action_id}\""
        actions_index[action.action_id] = action

    if not found_start_action:
        return None, "No starting action found. Workflow must start with a WEBHOOK or MANUAL_START action"

    # Check 4: IDs in connections are valid and refer to existing actions. Also, verify that connection types are set valid.
    # Check 5: WEBHOOK and MANUAL_START actions must have no incoming connections.
    # Check 6: Check for disconnected components
    adj_list = defaultdict(list)
    uf = UnionFind(elements=list(actions_index.keys()))
    for connection in connections:
        if connection.source not in actions_index:
            return None, f"Invalid connection (source=\"{connection.source}\",target=\"{connection.target}\"): Source action_id \"{connection.source}\" does not exist"

        if connection.target not in actions_index:
            return None, f"Invalid connection (source=\"{connection.source}\",target=\"{connection.target}\"): Target action_id \"{connection.target}\" does not exist"

        if actions_index[connection.target].action_type in (ActionType.WEBHOOK, ActionType.MANUAL_START):
            return None, f"Invalid connection (source=\"{connection.source}\",target=\"{connection.target}\"): Target action_id \"{connection.target}\" is a WEBHOOK or MANUAL_START action and cannot be a target of a connection"

        if actions_index[connection.source].action_type == ActionType.IF_CONDITION and connection.connection_type not in (EdgeType.TRUE, EdgeType.FALSE):
            return None, f"Invalid connection (source=\"{connection.source}\",target=\"{connection.target}\"): Source action_id \"{connection.source}\" is an IF_CONDITION action therefore the connection type must be either TRUE or FALSE"
        
        if actions_index[connection.source].action_type != ActionType.IF_CONDITION and connection.connection_type != EdgeType.DEFAULT:
            return None, f"Invalid connection (source=\"{connection.source}\",target=\"{connection.target}\"): Source action_id \"{connection.source}\" is not an IF_CONDITION action therefore the connection type must be DEFAULT"

        adj_list[connection.source].append(connection.target)
        uf.union(connection.source, connection.target)

    reps = set()
    for action_id in actions_index.keys():
        reps.add(uf.find(action_id))
    
    if len(reps) != 1:
        return None, "Workflow has disconnected components"

    return (actions, connections), None


GENERATION_PROMPT = """You are a helpful security automation engineer in a SOC and have a lot of experience in building cybersecurity automation workflows.
Based on the user input, your job is to call the function build_workflow_layout which builds the layout of an automation workflow represented as a DAG. You have the following workflow actions available:
- HTTP_REQUEST: Make an HTTP request to a specified URL.
- WEBHOOK: Adds a webhook to the workflow to allow users to trigger the workflow from other services. This can only be used as a starting action in the workflow.
- MANUAL_START: Adds a starting action to the workflow which requires to always start the workflow manually.
- AI_ACTION: Performs an AI action via an LLM model. The input is always a prompt and the output is the response from the model.
- IF_CONDITION: Adds an if-condition with two branches to the workflow. If the condition is met then the workflow continues to follow the TRUE branch and if the condition is not met then the execution follows the FALSE branch.
- SEND_EMAIL: Sends an email to a specified email address.

There are some additional requirements which you need to consider when building workflows:
- Each workflow must start with a WEBHOOK action or a MANUAL_START.
- The connection type of connections where the source is an IF_CONDITION action must either be TRUE or FALSE. In all other cases, the connection type must be DEFAULT.

Here are some examples for calling build_workflow_layout:

{few_shot_examples}

Input: {user_input}
Output:"""


FIXING_PROMPT = """You are a helpful security automation engineer in a SOC and have a lot of experience in building cybersecurity automation workflows.
Based on the user input, your job is to call the function build_workflow_layout which builds the layout of an automation workflow represented as a DAG. You have the following workflow actions available:
- HTTP_REQUEST: Make an HTTP request to a specified URL.
- WEBHOOK: Adds a webhook to the workflow to allow users to trigger the workflow from other services. This can only be used as a starting action in the workflow.
- MANUAL_START: Adds a starting action to the workflow which requires to always start the workflow manually.
- AI_ACTION: Performs an AI action via an LLM model. The input is always a prompt and the output is the response from the model.
- IF_CONDITION: Adds an if-condition with two branches to the workflow. If the condition is met then the workflow continues to follow the TRUE branch and if the condition is not met then the execution follows the FALSE branch.
- SEND_EMAIL: Sends an email to a specified email address.

There are some additional requirements which you need to consider when building workflows:
- Each workflow must start with a WEBHOOK action or a MANUAL_START.
- The connection type of connections where the source is an IF_CONDITION action must either be TRUE or FALSE. In all other cases, the connection type must be DEFAULT.

Here are some examples for calling build_workflow_layout:

{few_shot_examples}

Input: {user_input}
Output: build_workflow_layout({{
    "actions": {generated_actions},
    "connections": {generated_connections}
}})

The workflow layout you provided is invalid. The following error was returned:
{error}

Please fix the workflow layout."""


class WorkflowGenerationResult(BaseModel):
    actions: list[Action]
    connections: list[Connection]
    total_tokens: int
    prompt_tokens: int
    completion_tokens: int
    is_error: bool = False


MAX_FIXING_STEPS = 3


async def generate_workflow(user_input: str) -> WorkflowGenerationResult:
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    logger.info(f"Generating workflow layout for user input: \"{user_input}\"")
    chat_completion = await client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": GENERATION_PROMPT.format(
                    few_shot_examples=build_few_shot_examples([0, 1, 2, 3]),
                    user_input=user_input
                ),
            },
        ],
        model=MODEL,
        tools=tools,
        tool_choice={"type": "function", "function": {"name": "build_workflow_layout"}}
    )

    total_tokens = chat_completion.usage.total_tokens
    prompt_tokens = chat_completion.usage.prompt_tokens
    completion_tokens = chat_completion.usage.completion_tokens

    workflow_graph = chat_completion.choices[0].message.tool_calls[0].function.arguments
    workflow_graph = json.loads(workflow_graph)
    parsed_workflow_graph, error = parse_workflow_layout(workflow_graph)

    for _ in range(MAX_FIXING_STEPS):
        if parsed_workflow_graph is not None:
            break

        logger.error(f"Failed to generate a valid workflow layout for the following user input: \"{user_input}\". Error: {error}")

        actions_string = ", ".join(map(str, workflow_graph["actions"]))
        connections_string = ", ".join(map(str, workflow_graph["connections"]))

        chat_completion = await client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": FIXING_PROMPT.format(
                        few_shot_examples=build_few_shot_examples([0, 1, 2, 3]),
                        user_input=user_input,
                        error=error,
                        generated_actions=actions_string,
                        generated_connections=connections_string
                    ),
                }
            ],
            model=MODEL,
            tools=tools,
            tool_choice={"type": "function", "function": {"name": "build_workflow_layout"}}
        )

        workflow_graph = chat_completion.choices[0].message.tool_calls[0].function.arguments
        workflow_graph = json.loads(workflow_graph)
        parsed_workflow_graph, error = parse_workflow_layout(workflow_graph)

    if parsed_workflow_graph is None:
        logger.error(f"Failed to generate a valid workflow layout after multiple attempts for the following user input: \"{user_input}\"")
        return WorkflowGenerationResult(
            actions=[],
            connections=[],
            total_tokens=total_tokens,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            is_error=True
        )

    logger.info(f"Successfully generated a valid workflow layout for the following user input: \"{user_input}\"")
    actions, connections = parsed_workflow_graph
    return WorkflowGenerationResult(
        actions=actions,
        connections=connections,
        total_tokens=total_tokens,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        is_error=False
    )
