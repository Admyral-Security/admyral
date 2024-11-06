import tiktoken
from autogen_core.components.models import (
    SystemMessage,
    UserMessage,
    AssistantMessage,
    FunctionExecutionResultMessage,
    FunctionExecutionResult,
)
from autogen_core.components import FunctionCall


def count_tokens(text: str, encoding_name: str) -> int:
    encoding = tiktoken.encoding_for_model(encoding_name)
    num_tokens = len(encoding.encode(text))
    return num_tokens


def count_tokens_from_messages(llm_messages: list, encoding_name: str) -> int:
    def get_content(message) -> str:
        if isinstance(message, (SystemMessage, UserMessage)):
            return message.content
        elif isinstance(message, FunctionCall):
            return message.id + message.arguments + message.name
        elif isinstance(message, AssistantMessage):
            if isinstance(message.content, str):
                return message.content
            return "".join(get_content(submsg) for submsg in message.content)
        elif isinstance(message, FunctionExecutionResult):
            return message.content + message.call_id
        elif isinstance(message, FunctionExecutionResultMessage):
            return "".join(get_content(submsg) for submsg in message.content)
        else:
            return ""

    return sum(
        count_tokens(get_content(message), encoding_name) for message in llm_messages
    )
