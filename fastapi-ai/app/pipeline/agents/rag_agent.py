"""RAG Agent — Retrieval-Augmented Generation with LangChain + ChromaDB.

Instead of sending the entire uploaded document to the LLM (expensive, slow,
token-limited), this agent:
  1. Splits documents into small chunks (500 chars each)
  2. Converts each chunk into a vector (embedding) via Google Gemini
  3. Stores all vectors in an in-memory ChromaDB
  4. Retrieves only the TOP-K most relevant chunks for the user's prompt
  5. Replaces raw file_text items with a compact, relevant context item

Result: instead of sending 20 000 characters blindly,
        we send ~2 000 highly relevant characters → better generation quality.
"""
from __future__ import annotations

import logging
import os

from ..models import SourceItem, SourcePack

logger = logging.getLogger(__name__)

# ── Optional LangChain imports (graceful fallback if not installed) ────────────
try:
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    from langchain_community.vectorstores import Chroma
    from langchain_google_genai import GoogleGenerativeAIEmbeddings
    _LANGCHAIN_OK = True
except ImportError:
    _LANGCHAIN_OK = False
    logger.warning(
        "RagAgent: LangChain/ChromaDB not installed — RAG disabled. "
        "Run: pip install langchain langchain-community langchain-google-genai chromadb"
    )


class RagAgent:
    """Retrieval-Augmented Generation agent using LangChain + ChromaDB.

    Replaces naive full-document injection with semantic chunk retrieval.
    Falls back gracefully to the original SourcePack if LangChain is missing
    or if no documents are uploaded.
    """

    def run(self, pack: SourcePack, query: str) -> SourcePack:
        """Run RAG on uploaded documents and return an enriched SourcePack.

        Args:
            pack:  The current SourcePack (contains file_text items from DocExtractAgent)
            query: The user's generation prompt (used as the similarity search query)

        Returns:
            SourcePack with file_text items replaced by a single compact context item.
            If RAG fails or is unavailable, returns the original pack unchanged.
        """
        # Only process if there are extracted documents
        file_texts = [i for i in pack.items if i.kind == "file_text" and i.content.strip()]
        if not file_texts:
            logger.info("RagAgent: no file_text items found, skipping RAG")
            return pack

        if not _LANGCHAIN_OK:
            logger.info("RagAgent: LangChain unavailable, skipping RAG")
            return pack

        gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not gemini_key:
            logger.warning("RagAgent: GEMINI_API_KEY not set, cannot create embeddings — skipping RAG")
            return pack

        try:
            return self._run_rag(pack, file_texts, query, gemini_key)
        except Exception as e:  # noqa: BLE001
            logger.warning("RagAgent: failed (%s), falling back to full-text extraction", e)
            return pack

    def _run_rag(
        self,
        pack: SourcePack,
        file_texts: list[SourceItem],
        query: str,
        gemini_key: str,
    ) -> SourcePack:
        """Core RAG logic: split → embed → store → retrieve → build context."""

        # ── Step 1: Split all documents into small chunks ──────────────────────
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,       # ~500 characters per chunk
            chunk_overlap=50,     # 50-char overlap to preserve context across boundaries
            length_function=len,
        )

        all_chunks: list[str] = []
        all_metadatas: list[dict] = []

        for item in file_texts:
            source_name = str(item.meta.get("originalName", "document"))
            chunks = splitter.split_text(item.content)
            all_chunks.extend(chunks)
            all_metadatas.extend([{"source": source_name}] * len(chunks))

        if not all_chunks:
            return pack

        logger.info(
            "RagAgent: %d document(s) → %d chunks total",
            len(file_texts), len(all_chunks),
        )

        # ── Step 2: Embed chunks using Google Gemini embedding model ───────────
        embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",   # Free Google embedding model
            google_api_key=gemini_key,
        )

        # ── Step 3: Store chunks in ChromaDB (in-memory, no persistence needed) ─
        vectordb = Chroma.from_texts(
            texts=all_chunks,
            embedding=embeddings,
            metadatas=all_metadatas,
        )

        # ── Step 4: Retrieve the most relevant chunks for the user's query ─────
        k = min(5, len(all_chunks))  # Retrieve top-5 relevant chunks (or less)
        relevant_docs = vectordb.similarity_search(query, k=k)

        if not relevant_docs:
            logger.warning("RagAgent: similarity search returned 0 results")
            return pack

        # ── Step 5: Build a compact context item ──────────────────────────────
        sources = list({doc.metadata.get("source", "document") for doc in relevant_docs})
        rag_content = "\n\n---\n\n".join(doc.page_content for doc in relevant_docs)

        logger.info(
            "RagAgent: retrieved %d relevant chunks (%d chars) from [%s]",
            len(relevant_docs), len(rag_content), ", ".join(sources),
        )

        # Replace file_text items with the compact RAG context
        non_file_items = [i for i in pack.items if i.kind != "file_text"]
        rag_item = SourceItem(
            kind="context",
            content=(
                f"[RAG CONTEXT — {len(relevant_docs)} relevant excerpts "
                f"from {len(file_texts)} uploaded document(s): {', '.join(sources)}]\n\n"
                + rag_content
            ),
            meta={
                "rag_chunks_retrieved": len(relevant_docs),
                "rag_total_chunks": len(all_chunks),
                "rag_sources": sources,
                "rag_chars": len(rag_content),
            },
        )

        return SourcePack(items=[*non_file_items, rag_item])
