from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import MarkdownHeaderTextSplitter
from enum import Enum
from dataclasses import dataclass
import itertools
from langchain_qdrant import QdrantVectorStore

from admyral.agents.audit.models import Policy, PolicyChunk


"""
THOUGHTS, IDEAS, TRICKS

CHUNKING:
- checkout semchunk or semantic-chunker
- prepend file name to each chunk
- prepend parent section summary as context
- https://github.com/NirDiamant/RAG_Techniques/blob/main/all_rag_techniques/contextual_chunk_headers.ipynb
- https://github.com/NirDiamant/RAG_Techniques/blob/main/all_rag_techniques/relevant_segment_extraction.ipynb


RETRIEVAL:
- add reranker
        reranker = build_reranker(args.reranker_provider, args.reranker_model, args.reranker_top_k)
        if reranker:
            retriever = ContextualCompressionRetriever(base_compressor=reranker, base_retriever=retriever)
- generate summary for each policy (very short parapgraph) and add to policies metadata
- query reformulation
    - make the query look like an answer
    - might even make sense to finetune a model for search query reformulation
    - https://cosine.sh/blog/3llm-tricks

"""


class ChunkingStrategy(Enum):
    HEADER = "header"
    SEMANTIC = "semantic"


def chunk_policy(
    policy: Policy, chunking_strategy: ChunkingStrategy = ChunkingStrategy.HEADER
) -> list[PolicyChunk]:
    """
    Chunk a policy into a list of text chunks.

    Args:
        policy: Policy text

    Returns:
        DocumentCollection
    """
    match chunking_strategy:
        case ChunkingStrategy.HEADER:
            headers_to_split_on = [
                ("#", "Header 1"),
                ("##", "Header 2"),
                ("###", "Header 3"),
                ("####", "Header 4"),
            ]
            # https://python.langchain.com/v0.2/docs/how_to/markdown_header_metadata_splitter/
            markdown_splitter = MarkdownHeaderTextSplitter(
                headers_to_split_on, strip_headers=False
            )
            return list(
                PolicyChunk(
                    policy_id=policy.id,
                    name=policy.name,
                    chunk=f"# {policy.name}\n\n{chunk.page_content}",
                )
                for chunk in markdown_splitter.split_text(policy.content)
            )

        case ChunkingStrategy.SEMANTIC:
            raise NotImplementedError("Semantic chunking is not implemented yet")


def chunk_policies(
    policies: list[Policy],
    chunking_strategy: ChunkingStrategy = ChunkingStrategy.HEADER,
) -> list[PolicyChunk]:
    return list(
        itertools.chain.from_iterable(
            chunk_policy(policy, chunking_strategy=chunking_strategy)
            for policy in policies
        )
    )


async def embed_policies(
    collection_name: str,
    policies: list[Policy],
    location: str | None = None,
    path: str | None = None,
    model: str = "text-embedding-3-small",
    chunking_strategy: ChunkingStrategy = ChunkingStrategy.HEADER,
) -> QdrantVectorStore:
    """
    Embed a list of policies into a Qdrant vector store.

    Args:
        policies: List of policies
        model: OpenAI model name

    Returns:
        QdrantVectorStore
    """
    chunks = chunk_policies(policies, chunking_strategy=chunking_strategy)
    vector_store = await QdrantVectorStore.afrom_texts(
        texts=[chunk.chunk for chunk in chunks],
        metadatas=[
            {"policy_id": chunk.policy_id, "name": chunk.name} for chunk in chunks
        ],
        embedding=OpenAIEmbeddings(model=model),
        location=location,
        collection_name=collection_name,
        path=path,
    )
    return vector_store
