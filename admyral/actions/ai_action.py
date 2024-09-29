import os
from typing import Annotated, Literal
from openai import OpenAI

from admyral.action import action, ArgumentMetadata


@action(
    display_name="AI Action",
    display_namespace="Admyral",
    description="Use advanced AI models to perform complex tasks, such as categorization, "
    "analysis, summarization, or decision support.",
)
def ai_action(
    model: Annotated[
        Literal["gpt-4", "gpt-4o", "gpt-4-turbo"],
        ArgumentMetadata(
            display_name="Model",
            description="The model to use for the AI action",
        ),
    ],
    prompt: Annotated[
        str,
        ArgumentMetadata(
            display_name="Prompt",
            description="The prompt to use for the AI action",
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
) -> str:
    # https://platform.openai.com/docs/api-reference/chat/create
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError(
            "OPENAI_API_KEY environment variable is not set. Please set it to use the send_email action."
        )
    client = OpenAI(api_key=api_key)
    chat_completion = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model=model,
        top_p=top_p,
        temperature=temperature,
    )
    return chat_completion.choices[0].message.content
