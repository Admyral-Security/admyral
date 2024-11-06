from uuid import uuid4
import json
from qdrant_client.http import models
from dataclasses import dataclass
from autogen_core.base import MessageContext, AgentId
from autogen_core.components import RoutedAgent, message_handler, FunctionCall
from autogen_core.components.models import (
    ChatCompletionClient,
    LLMMessage,
    SystemMessage,
    UserMessage,
    FunctionExecutionResult,
    FunctionExecutionResultMessage,
    AssistantMessage,
)
from autogen_core.application import SingleThreadedAgentRuntime
from autogen_core.components.models import OpenAIChatCompletionClient
from autogen_core.components.tools import FunctionTool
import xml.etree.ElementTree as ET
from langsmith import traceable
from langsmith.run_helpers import tracing_context
from langchain_core.vectorstores import VectorStore

from admyral.agents.audit.models import PolicyChunk, Policy
from admyral.agents.audit.utils import count_tokens_from_messages
from admyral.agents.audit.autogen_utils import (
    ChatCompletionClientWithTracing,
)


def generate_id() -> str:
    return uuid4().hex


"""
Message Protocol
"""


@dataclass
class CommonCriterionPointOfFocus:
    name: str
    description: str


@dataclass
class CommonCriterion:
    category: str
    name: str
    id: str
    description: str
    points_of_focus: list[CommonCriterionPointOfFocus]


@dataclass
class CommonCriterionPointOfFocusMessage:
    category: str
    id: str
    name: str
    description: str
    point_of_focus_name: str
    point_of_focus_description: str


@dataclass
class PointOfFocusAuditResult:
    point_of_focus_name: str
    observation: str
    passed: bool
    gap_analysis: str
    recommendation: str
    used_policies: list[str]


@dataclass
class AuditResult:
    observation: str
    passed: bool
    gap_analysis: str
    recommendation: str


@dataclass
class AuditAgentResult:
    audit_result: AuditResult
    point_of_focus_audit_results: list[PointOfFocusAuditResult]


@dataclass
class PolicyRetrieverResult:
    messages: list[LLMMessage]
    used_policies: list[str]


@dataclass
class PolicySearchMessage:
    query: str


def _parse_audit_result(xml_string: str) -> dict:
    # Clean up the XML string - replace spaces in tags with underscores
    cleaned_xml = (
        xml_string.replace("<Gap Analysis>", "<Gap_Analysis>")
        .replace("</Gap Analysis>", "</Gap_Analysis>")
        .replace("<Audit Result>", "<Audit_Result>")
        .replace("</Audit Result>", "</Audit_Result>")
    )

    try:
        # Parse the XML string
        root = ET.fromstring(cleaned_xml)

        # Expected tags
        expected_tags = {"Observation", "Gap Analysis", "Recommendation", "Passed"}

        # Create a dictionary from all child elements
        result = {}
        for child in root:
            tag = child.tag.replace("_", " ")
            value = child.text.strip() if child.text else ""

            # Validate that all tags are expected
            if tag not in expected_tags:
                raise ValueError(f"Unexpected tag: {tag}")

            # Special handling for Passed field
            key = tag.lower().replace(" ", "_")
            if tag == "Passed":
                if value.lower() not in ("true", "false"):
                    raise ValueError("Passed field must be 'True' or 'False'")
                result[key] = value.lower() == "true"
            else:
                result[key] = value

        return result

    except ET.ParseError as e:
        raise ValueError(f"Invalid XML format: {e}")


def parse_audit_result(xml_string: str) -> AuditResult:
    result_dict = _parse_audit_result(xml_string)
    return AuditResult(**result_dict)


def parse_point_of_focus_audit_result(
    point_of_focus_name: str,
    xml_string: str,
    used_policies: list[str],
) -> PointOfFocusAuditResult:
    result_dict = _parse_audit_result(xml_string)
    return PointOfFocusAuditResult(
        point_of_focus_name=point_of_focus_name,
        used_policies=used_policies,
        **result_dict,
    )


TOOL_EXECUTOR_AGENT_TYPE = "tool_executor_agent"


AUDITOR_SYS_PROMPT = """
You are an expert-level auditor. You have been tasked with auditing the security policies of a company.
You have been provided with a common criteria document that outlines the requirements that the policies must meet.
Your team already has evaluated each requirement of the current common criteria separately and has provided you with the results.
Your task is to evaluate the entire set of requirements and provide a final audit result.

You must answer in the following format and WITH NOTHING ELSE:

<Audit Result>
<Observation>Your observations</Observation>
<Gap Analysis>The summarized gaps which were identified</Gap Analysis>
<Recommendation>The summarized recommendations which were given</Recommendation>
<Passed>Your passed or failed result. You must either answer with True or False and nothing else.</Passed>
</Audit Result>
"""

COMMON_CRITERION_RESULT_TEMPLATE = """
<Common Criterion>
<Category>{CC_CATEGORY}</Category>
<ID>{CC_ID}</ID>
<Name>{CC_NAME}</Name>
<Description>{CC_DESCRIPTION}</Description>
<Points of Focus>
{POINTS_OF_FOCUS}
</Points of Focus>
</Common Criterion>
"""

POINT_OF_FOCUS_RESULT_TEMPLATE = """
<Point of Focus>
<Name>{POF_NAME}</Name>
<Description>{POF_DESCRIPTION}</Description>
<Audit Result>
<Observation>{OBSERVATION}</Observation>
<Gap Analysis>{GAP_ANALYSIS}</Gap Analysis>
<Recommendation>{RECOMMENDATION}</Recommendation>
<Passed>{PASSED}</Passed>
</Audit Result>
</Point of Focus>
"""


class Auditor(RoutedAgent):
    AGENT_TYPE = "auditor"

    def __init__(self, model_client: ChatCompletionClientWithTracing) -> None:
        super().__init__("An agent for auditing common criteria in security policies.")
        self._model_client = model_client
        self._common_criterion_agent_id = AgentId(
            CommonCriterionPointOfFocusAuditor.AGENT_TYPE, self.id.key
        )
        self._system_message = [SystemMessage(AUDITOR_SYS_PROMPT)]

    @message_handler
    async def handle_common_criterion(
        self, message: CommonCriterion, ctx: MessageContext
    ) -> AuditAgentResult:
        return await self._handle_common_criterion(message, ctx)

    @traceable
    async def _handle_common_criterion(
        self, message: CommonCriterion, ctx: MessageContext
    ) -> AuditAgentResult:
        # generate for each point of focus an audit result and combine them in
        # the final audit result
        points_of_focus_audit_results = []
        points_of_focus_strs = []

        for requirement in message.points_of_focus:
            result: PointOfFocusAuditResult = await self.send_message(
                CommonCriterionPointOfFocusMessage(
                    category=message.category,
                    id=message.id,
                    name=message.name,
                    description=message.description,
                    point_of_focus_name=requirement.name,
                    point_of_focus_description=requirement.description,
                ),
                self._common_criterion_agent_id,
                cancellation_token=ctx.cancellation_token,
            )
            print("SUBRESULT: ", result)  # FIXME:

            points_of_focus_audit_results.append(result)
            points_of_focus_strs.append(
                POINT_OF_FOCUS_RESULT_TEMPLATE.format(
                    POF_NAME=requirement.name,
                    POF_DESCRIPTION=requirement.description,
                    OBSERVATION=result.observation,
                    PASSED=result.passed,
                    GAP_ANALYSIS=result.gap_analysis,
                    RECOMMENDATION=result.recommendation,
                )
            )

            print("POINTS OF FOCUS: ", points_of_focus_strs)

        # Generate an overall audit result
        audit_result_str = COMMON_CRITERION_RESULT_TEMPLATE.format(
            CC_CATEGORY=message.category,
            CC_ID=message.id,
            CC_NAME=message.name,
            CC_DESCRIPTION=message.description,
            POINTS_OF_FOCUS="".join(points_of_focus_strs),
        )
        messages = self._system_message + [
            UserMessage(content=audit_result_str, source="user")
        ]
        print("\n========================")
        print("CC EVAL TOKEN COUNT: ")
        print(count_tokens_from_messages(messages, "gpt-4o"))
        print("\n========================")
        evaluation_response = await self._model_client.create(
            messages, cancellation_token=ctx.cancellation_token
        )
        evaluation_result = evaluation_response.content
        audit_result = parse_audit_result(evaluation_result)

        return AuditAgentResult(
            audit_result=audit_result,
            point_of_focus_audit_results=points_of_focus_audit_results,
        )


POLICY_RETRIEVAL_SYS_PROMPT = """
You are an expert-level auditor. You have been tasked with auditing the security policies of a company.
Your task is to obtain all the relevant information needed to evaluate a point of focus of a common criterion.
Query the policies to obtain all the information needed to evaluate whether the policies meet the point of focus requirement.
You might want to use the information of the point of focus to formulate your search query.
"""


POLICY_EVALUATION_SYS_PROMPT = """
You are an expert-level auditor. You have been tasked with auditing the security policies of a company.
Based on the excerpt from the policies, evaluate whether the policies meet a point of focus of a common criterion.

You must answer in the following format and WITH NOTHING ELSE:

<Audit Result>
<Observation>Your observations</Observation>
<Gap Analysis>The gaps you identified with regards to the point of focus</Gap Analysis>
<Recommendation>The recommendations with regards to the point of focus</Recommendation>
<Passed>Your final evaluation result whether the policy fulfills the point of focus. You must either answer with True or False and nothing else.</Passed>
</Audit Result>
"""


POINT_OF_FOCUS_TEMPLATE_POF_AUDITOR = """
<Common Criterion>
<Category>{CC_CATEGORY}</Category>
<ID>{CC_ID}</ID>
<Name>{CC_NAME}</Name>
<Description>{CC_DESCRIPTION}</Description>
</Common Criterion>

<Point of Focus>
<Name>{POF_NAME}</Name>
<Description>{POF_DESCRIPTION}</Description>
</Point of Focus>
"""


class CommonCriterionPointOfFocusAuditor(RoutedAgent):
    AGENT_TYPE = "common_criterion_point_of_focus_auditor"

    def __init__(self, model_client: ChatCompletionClientWithTracing) -> None:
        super().__init__(
            "An agent for auditing points of focus of a common criteria in security policies."
        )
        self._model_client = model_client
        self._system_message_evaluation = [SystemMessage(POLICY_EVALUATION_SYS_PROMPT)]

    @message_handler
    async def handle_common_criterion_point_of_focus(
        self,
        message: CommonCriterionPointOfFocusMessage,
        ctx: MessageContext,
    ) -> PointOfFocusAuditResult:
        with tracing_context(execution_id=self.id.key):
            retrieval_result = await self.send_message(
                message=message,
                recipient=AgentId(PolicyRetrieverAgent.AGENT_TYPE, self.id.key),
                cancellation_token=ctx.cancellation_token,
            )
            return await self._handle_evaluation(message, retrieval_result, ctx)

    @traceable("chain")
    async def _handle_evaluation(
        self,
        message: CommonCriterionPointOfFocusMessage,
        retrieval_result: PolicyRetrieverResult,
        ctx: MessageContext,
    ) -> PointOfFocusAuditResult:
        point_of_focus_str = POINT_OF_FOCUS_TEMPLATE_POF_AUDITOR.format(
            CC_CATEGORY=message.category,
            CC_ID=message.id,
            CC_NAME=message.name,
            CC_DESCRIPTION=message.description,
            POF_NAME=message.point_of_focus_name,
            POF_DESCRIPTION=message.point_of_focus_description,
        )

        policy_context = [
            UserMessage(content=execution_result.content, source="user")
            for message in retrieval_result.messages
            if isinstance(message, FunctionExecutionResultMessage)
            for execution_result in message.content
        ]

        session_for_evaluation: list[LLMMessage] = (
            self._system_message_evaluation
            + policy_context
            + [UserMessage(content=point_of_focus_str, source="user")]
        )
        print("\n========================")
        print("CC PoF EVAL TOKEN COUNT: ")
        print(count_tokens_from_messages(session_for_evaluation, "gpt-4o"))
        print("\n========================")
        evaluation_response = await self._model_client.create(
            messages=session_for_evaluation, cancellation_token=ctx.cancellation_token
        )
        evaluation_result = evaluation_response.content

        print("\n\n\n")
        print("EVALUATION RESULT: ")  # FIXME:
        print(evaluation_result)

        return parse_point_of_focus_audit_result(
            message.point_of_focus_name,
            evaluation_result,
            retrieval_result.used_policies,
        )


POLICY_RETRIEVAL_SYS_PROMPT = """
You are an expert-level auditor. You have been tasked with auditing the security policies of a company.
Your task is to obtain all the relevant information needed to evaluate a point of focus of a common criterion.
Query the policies to obtain all the information needed to evaluate whether the policies meet the point of focus requirement.
You might want to use the information of the point of focus to formulate your search query.
"""


def search_policies(query: str) -> tuple:
    return PolicySearchAgent.AGENT_TYPE, query


# TODO: PolicyRetrieverAgent
# - CoT / ReAct for thinking about generating multiple queries
# - adapt prompt to tell the agent to keep querying until it has enough information to make a decision
class PolicyRetrieverAgent(RoutedAgent):
    AGENT_TYPE = "policy_retriever_agent"

    def __init__(self, model_client: ChatCompletionClient) -> None:
        super().__init__(
            "An agent for retrieving policies for auditing a point of focus of a common criterion."
        )
        self._model_client = model_client
        self.search_policies_tool = FunctionTool(
            search_policies,
            description="Search for policies based on a search query.",
        )
        self._system_message_retrieval = [SystemMessage(POLICY_RETRIEVAL_SYS_PROMPT)]

    @message_handler
    async def handle_policy_retrieval(
        self, message: CommonCriterionPointOfFocusMessage, ctx: MessageContext
    ) -> PolicyRetrieverResult:
        # Distributed tracing
        # https://docs.smith.langchain.com/observability/how_to_guides/tracing/distributed_tracing
        with tracing_context(execution_id=self.id.key):
            return await self._handle_policy_retrieval(message, ctx)

    @traceable("chain")
    async def _handle_policy_retrieval(
        self, message: CommonCriterionPointOfFocusMessage, ctx: MessageContext
    ) -> PolicyRetrieverResult:
        """

        PolicyRetrieverAgent:
        - Generate queries until the agent thinks it has enough information to answer the query
        - For each query, we must break it down:
            => PolicySearchAgent:
            - which policies are relevant?
            - reformulate the query?

        """

        # RETRIEVE POLICIES
        # let the agent retrieve information from the policies until the agent thinks
        # it has enough information to make a decision
        point_of_focus_str = POINT_OF_FOCUS_TEMPLATE_POF_AUDITOR.format(
            CC_CATEGORY=message.category,
            CC_ID=message.id,
            CC_NAME=message.name,
            CC_DESCRIPTION=message.description,
            POF_NAME=message.point_of_focus_name,
            POF_DESCRIPTION=message.point_of_focus_description,
        )

        session_for_retrieval: list[LLMMessage] = self._system_message_retrieval + [
            UserMessage(content=point_of_focus_str, source="user")
        ]
        print("SESSION FOR RETRIEVAL: ", session_for_retrieval)
        print("\n========================")
        print("CC PoF RETRIEVAL TOKEN COUNT: ")
        print(count_tokens_from_messages(session_for_retrieval, "gpt-4o"))
        print("\n========================")

        llm_response = await self._model_client.create(
            session_for_retrieval,
            tools=[self.search_policies_tool.schema],
            cancellation_token=ctx.cancellation_token,
        )

        generated_messages = [
            AssistantMessage(content=llm_response.content, source="assistant")
        ]

        used_policies = set()

        # TODO: ReAct / CoT?
        # TODO: do really ALL llm_response.content need to be a FunctionCall?
        while isinstance(llm_response.content, list) and all(
            isinstance(item, FunctionCall) for item in llm_response.content
        ):
            print("LLM Response: ", llm_response.content)  # FIXME:

            for call in llm_response.content:
                if call.name == self.search_policies_tool.name:
                    args = json.loads(call.arguments)
                    agent_type, query = await self.search_policies_tool.run_json(
                        args=args, cancellation_token=ctx.cancellation_token
                    )

                    print("SELF ID: ", self.id)  # FIXME:
                    search_result = await self.send_message(
                        message=PolicySearchMessage(query=query),
                        recipient=AgentId(agent_type, self.id.key),
                        cancellation_token=ctx.cancellation_token,
                    )
                    generated_messages.extend(
                        [
                            FunctionExecutionResultMessage(
                                content=[
                                    FunctionExecutionResult(
                                        content="\n".join(
                                            [
                                                f"<Title>{chunk.name}</Title>\n<Content>{chunk.chunk}</Content>"
                                                for chunk in search_result
                                            ]
                                        ),
                                        call_id=call.id,
                                    )
                                ],
                            ),
                        ]
                    )

                    used_policies |= set(chunk.policy_id for chunk in search_result)

                else:
                    raise ValueError(f"Unknown tool: {call.name}")

            messages = session_for_retrieval + generated_messages
            print("MESSAGES: ", messages)  # FIXME:
            llm_response = await self._model_client.create(
                messages=messages,
                tools=[self.search_policies_tool.schema],
                cancellation_token=ctx.cancellation_token,
            )
            generated_messages.append(
                AssistantMessage(content=llm_response.content, source="assistant")
            )

        messages = list(
            filter(
                lambda message: isinstance(message, FunctionExecutionResultMessage),
                generated_messages,
            )
        )

        return PolicyRetrieverResult(
            messages=messages,
            used_policies=list(used_policies),
        )


POLICY_SEARCH_SYS_PROMPT = """You are a retriever system. You will be given a user query and a list of compliance policies in a company. Your task is to determine the policies that are most relevant to the user query.
DO NOT RESPOND TO THE USER QUERY DIRECTLY. Instead, respond with the names of the relevant policies that could contain the answer to the query. Say absolutely nothing else other than the titles of the policies.

Here are the titles of the policies:

{policies}
"""


POLICY_SEARCH_AUGMENTED_QUERY_PROMPT = """
User query: {query}

DO NOT RESPOND TO THE USER QUERY DIRECTLY. Instead, respond with the names of the relevant policies that could contain the answer to the query. Say absolutely nothing else other than the titles of the policies.
"""


@dataclass
class PolicySearchMessage:
    query: str


# TODO: we could experiment with query reformulation
# TODO: we should also experiment with contextual chunking
class PolicySearchAgent(RoutedAgent):
    AGENT_TYPE = "query_search_agent"

    def __init__(
        self,
        model_client: ChatCompletionClient,
        policies: list[Policy],
        vector_store: VectorStore,
        top_k_per_query: int = 3,
    ) -> None:
        super().__init__("An agent for searching in policies based on a query.")
        self.model_client = model_client
        self.policies = policies
        self.vector_store = vector_store
        self.top_k = top_k_per_query

        self.policies_titles = set(policy.name for policy in self.policies)
        policies = "\n".join(f"- {title}" for title in self.policies_titles)
        self.sys_prompt = SystemMessage(
            POLICY_SEARCH_SYS_PROMPT.format(policies=policies)
        )

    @message_handler
    async def handle_policy_search(
        self, message: PolicySearchMessage, ctx: MessageContext
    ) -> list:
        # Distributed tracing
        # https://docs.smith.langchain.com/observability/how_to_guides/tracing/distributed_tracing
        print("POLICY SEARCH AGENT ID: ", self.id)  # FIXME:
        with tracing_context(execution_id=self.id.key):
            return await self._handle_policy_search(message, ctx)

    @traceable("chain")
    async def _handle_policy_search(
        self,
        message: PolicySearchMessage,
        ctx: MessageContext,
    ) -> list[PolicyChunk]:
        """

        => PolicySearchAgent:
            - which policies are relevant?
            - reformulate the query?

        """

        # Ask the LLM to select the relevant policies
        augmented_query = POLICY_SEARCH_AUGMENTED_QUERY_PROMPT.format(
            query=message.query
        )
        response = await self.model_client.create(
            messages=[
                self.sys_prompt,
                UserMessage(content=augmented_query, source="user"),
            ],
            cancellation_token=ctx.cancellation_token,
        )
        print("RESPONSE POLICY SEARCH: ", response)  # FIXME:
        selected_policies = response.content.strip().split("\n")

        # verify that the selected policies are in the list of policies
        selected_policies = list(
            filter(
                lambda selected_policy: selected_policy in self.policies_titles,
                map(
                    lambda selected_policy: selected_policy.strip(" \n-"),
                    selected_policies,
                ),
            )
        )
        print("SELECTED POLICIES: ", selected_policies)  # FIXME:

        # Query the vector store
        return await self._query_vector_store(message.query, selected_policies)

    @traceable("retriever")
    async def _query_vector_store(
        self, query: str, selected_policies: list[str]
    ) -> list[PolicyChunk]:
        results = await self.vector_store.asimilarity_search(
            query=query,
            k=self.top_k,
            filter=models.Filter(
                should=[
                    models.FieldCondition(
                        # langchain wraps the metadata in an object of the following structure
                        # {"page_content": ..., "metadata": ...}
                        key="metadata.name",
                        match=models.MatchValue(value=selected_policy_title),
                    )
                    for selected_policy_title in selected_policies
                ]
            ),
        )

        return list(
            map(
                lambda doc: PolicyChunk(
                    policy_id=doc.metadata["policy_id"],
                    name=doc.metadata["name"],
                    chunk=doc.page_content,
                ),
                results,
            )
        )


class AuditExecutor:
    def __init__(self, vector_store: VectorStore, policies: list[Policy]) -> None:
        self.runtime = SingleThreadedAgentRuntime()
        self.vector_store = vector_store
        self.policies = policies

    def start(self) -> None:
        self.runtime.start()

    async def stop(self) -> None:
        await self.runtime.stop()

    async def execute(self, common_criterion: CommonCriterion):
        tracing_id = generate_id()
        agent_id = AgentId(Auditor.AGENT_TYPE, tracing_id)
        return await self.runtime.send_message(
            message=common_criterion, recipient=agent_id
        )

    @classmethod
    async def build(
        cls, vector_store: VectorStore, policies: list[Policy]
    ) -> "AuditExecutor":
        audit_executor = cls(vector_store=vector_store, policies=policies)

        await Auditor.register(
            audit_executor.runtime,
            Auditor.AGENT_TYPE,
            # factory function
            lambda: Auditor(
                model_client=ChatCompletionClientWithTracing(
                    OpenAIChatCompletionClient(model="gpt-4o-2024-08-06")
                )
            ),
        )

        await CommonCriterionPointOfFocusAuditor.register(
            audit_executor.runtime,
            CommonCriterionPointOfFocusAuditor.AGENT_TYPE,
            lambda: CommonCriterionPointOfFocusAuditor(
                model_client=ChatCompletionClientWithTracing(
                    OpenAIChatCompletionClient(model="gpt-4o-2024-08-06")
                )
            ),
        )

        await PolicyRetrieverAgent.register(
            audit_executor.runtime,
            PolicyRetrieverAgent.AGENT_TYPE,
            lambda: PolicyRetrieverAgent(
                model_client=ChatCompletionClientWithTracing(
                    OpenAIChatCompletionClient(model="gpt-4o-2024-08-06")
                )
            ),
        )

        await PolicySearchAgent.register(
            audit_executor.runtime,
            PolicySearchAgent.AGENT_TYPE,
            lambda: PolicySearchAgent(
                model_client=ChatCompletionClientWithTracing(
                    OpenAIChatCompletionClient(model="gpt-4o-2024-08-06")
                ),
                policies=policies,
                vector_store=vector_store,
            ),
        )

        return audit_executor
