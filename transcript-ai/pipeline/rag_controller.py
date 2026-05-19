"""RAG Controller — orchestrates retrieval-augmented generation.

Flow:
  1. Receive transcript text
  2. Query ChromaDB for related context
  3. Combine context + transcript
  4. Send to Qwen for analysis
  5. Return structured output
"""
from __future__ import annotations

import time
from typing import Dict, List, Optional

from pipeline.pipeline_config import PipelineConfig
from pipeline.vector_store import VectorStore
from pipeline.qwen_llm import QwenLLM
from pipeline.preprocessing import chunk_text, clean_text


class RAGController:
    """Retrieval-Augmented Generation controller."""

    def __init__(self):
        print("🔧 Initialising RAG Controller...")
        t0 = time.time()
        self.store = VectorStore()
        self.llm = QwenLLM()
        print(f"✅ RAG Controller ready in {time.time() - t0:.1f}s")

    # ── Public API ────────────────────────────────────────────────────

    def ingest(self, directory: Optional[str] = None) -> Dict:
        """Index all transcripts from disk into ChromaDB."""
        print("📥 Ingesting transcripts into vector store...")
        return self.store.ingest_all(directory)

    def ingest_text(self, text: str, source: str = "live") -> int:
        """Ingest raw text (e.g. from a live transcription session)."""
        text = clean_text(text)
        if not text:
            return 0
        transcript = {
            "text": text,
            "source": source,
            "languages": [],
        }
        return self.store.ingest_transcript(transcript)

    def analyse(
        self,
        transcript_text: str,
        task: str = "requirements",
        top_k: int = PipelineConfig.RAG_TOP_K,
    ) -> Dict:
        """Run full RAG analysis pipeline.

        1. Retrieve relevant context from ChromaDB
        2. Send to Qwen with task-specific prompt
        3. Return structured JSON result + metadata
        """
        t0 = time.time()
        transcript_text = clean_text(transcript_text)

        # Step 1 — Retrieve context
        print(f"🔍 Retrieving top-{top_k} context chunks...")
        hits = self.store.query(transcript_text, top_k=top_k)
        context_chunks = [h["text"] for h in hits]
        context_sources = list({h["source"] for h in hits})

        # Step 2 — LLM analysis
        print(f"🤖 Sending to Qwen ({task} analysis)...")
        result = self.llm.analyse_transcript(transcript_text, context_chunks, task=task)

        elapsed = time.time() - t0

        return {
            "analysis": result,
            "task": task,
            "context_sources": context_sources,
            "context_chunks_used": len(context_chunks),
            "processing_time": round(elapsed, 2),
        }

    def generate_diagram(self, description: str) -> str:
        """Generate a Mermaid diagram via Qwen."""
        return self.llm.generate_mermaid(description)

    def query_context(self, query: str, top_k: int = 5) -> List[Dict]:
        """Search ChromaDB for relevant chunks (useful for debugging)."""
        return self.store.query(query, top_k=top_k)

    def stats(self) -> Dict:
        """Return current pipeline stats."""
        return {
            "vector_store_docs": self.store.count(),
            "model": self.llm.model,
            "ollama_url": self.llm.base_url,
        }
