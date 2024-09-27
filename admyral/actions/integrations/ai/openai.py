from typing import Annotated
from openai import OpenAI

from admyral.action import action, ArgumentMetadata
from admyral.context import ctx


@action(
    display_name="Chat Completion",
    display_namespace="OpenAI",
    description="Use advanced AI models from OpenAI to perform complex tasks, such as categorization, "
    "analysis, summarization, or decision support.",
    secrets_placeholders=["OPENAI_SECRET"],
)
def openai_chat_completion(
    model: Annotated[
        str,
        ArgumentMetadata(
            display_name="Model",
            description="The model to use.",
        ),
    ],
    prompt: Annotated[
        str,
        ArgumentMetadata(
            display_name="Prompt",
            description="The prompt to use for the chat completion.",
        ),
    ],
    top_p: Annotated[
        float | None,
        ArgumentMetadata(
            display_name="Top P",
            description="Value between 0 and 1. An alternative to sampling with temperature, "
            "called nucleus sampling, where the model considers the results of the tokens "
            "with Top P probability mass. So 0.1 means only the tokens comprising the top 10% "
            "probability mass are considered. We generally recommend altering this or temperature "
            "but not both.",
        ),
    ] = None,
    temperature: Annotated[
        float | None,
        ArgumentMetadata(
            display_name="Temperature",
            description="What sampling temperature to use, between 0 and 2. Higher values like 0.8 "
            "will make the output more random, while lower values like 0.2 will make it more focused "
            "and deterministic. We generally recommend altering this or Top P but not both.",
        ),
    ] = None,
    stop_tokens: Annotated[
        list[str] | None,
        ArgumentMetadata(
            display_name="Stop Tokens",
            description="A list of tokens at which to stop the completion.",
        ),
    ] = None,
) -> str:
    # https://platform.openai.com/docs/api-reference/chat/create
    # TODO: error handling
    secret = ctx.get().secrets.get("OPENAI_SECRET")
    api_key = secret["api_key"]

    client = OpenAI(api_key=api_key)
    chat_completion = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model=model,
        top_p=top_p,
        temperature=temperature,
        stop=stop_tokens,
    )

    return chat_completion.choices[0].message.content
