from typing import Sequence, Optional, Any, Mapping
from autogen_core.components.models import (
    ChatCompletionClient,
    LLMMessage,
    CreateResult,
)
from autogen_core.base import CancellationToken
from autogen_core.components.tools import ToolSchema, Tool
from langsmith import traceable


class ChatCompletionClientWithTracing:
    def __init__(self, model_client: ChatCompletionClient) -> None:
        self.model_client = model_client

    @traceable("llm")
    async def create(
        self,
        messages: Sequence[LLMMessage],
        tools: Sequence[Tool | ToolSchema] = [],
        # None means do not override the default
        # A value means to override the client default - often specified in the constructor
        json_output: Optional[bool] = None,
        extra_create_args: Mapping[str, Any] = {},
        cancellation_token: Optional[CancellationToken] = None,
    ) -> CreateResult:
        return await self.model_client.create(
            messages, tools, json_output, extra_create_args, cancellation_token
        )
