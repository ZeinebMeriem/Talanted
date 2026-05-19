"""Embedding generator + ChromaDB vector store.

Handles:
  1. Sentence-Transformer embeddings (all-MiniLM-L6-v2 — fast, 384-dim)
  2. ChromaDB collection CRUD
  3. Ingestion of chunked transcripts
  4. Similarity search for RAG retrieval
"""
from __future__ import annotations

import hashlib
import time
from typing import List, Dict, Optional

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

from pipeline.pipeline_config import PipelineConfig
from pipeline.preprocessing import chunk_text, load_all_transcripts


# ── Singleton embedding model ─────────────────────────────────────────────────

_model: Optional[SentenceTransformer] = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        print(f"📦 Loading embedding model: {PipelineConfig.EMBEDDING_MODEL}")
        t0 = time.time()
        _model = SentenceTransformer(PipelineConfig.EMBEDDING_MODEL)
        print(f"✅ Embedding model loaded in {time.time() - t0:.1f}s")
    return _model


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Generate embeddings for a list of texts. Returns list of float vectors."""
    model = _get_model()
    embeddings = model.encode(texts, show_progress_bar=False, normalize_embeddings=True)
    return embeddings.tolist()


# ── ChromaDB wrapper ──────────────────────────────────────────────────────────


class VectorStore:
    """Thin wrapper around ChromaDB for transcript chunk storage & retrieval."""

    def __init__(self):
        PipelineConfig.ensure_dirs()
        self._client = chromadb.PersistentClient(
            path=PipelineConfig.CHROMA_PERSIST_DIR,
            settings=Settings(anonymized_telemetry=False),
        )
        self._collection = self._client.get_or_create_collection(
            name=PipelineConfig.CHROMA_COLLECTION,
            metadata={"hnsw:space": "cosine"},
        )
        print(
            f"🗄️  ChromaDB collection '{PipelineConfig.CHROMA_COLLECTION}' "
            f"({self._collection.count()} docs)"
        )

    # ── Ingestion ─────────────────────────────────────────────────────

    def ingest_transcript(self, transcript: Dict) -> int:
        """Chunk a single transcript dict and upsert into ChromaDB.

        Returns the number of chunks stored.
        """
        text = transcript.get("text", "")
        if not text:
            return 0

        chunks = chunk_text(text)
        if not chunks:
            return 0

        source = transcript.get("source", "unknown")
        ids, docs, metas = [], [], []

        for i, chunk in enumerate(chunks):
            # Deterministic ID so re-ingestion is idempotent
            doc_id = hashlib.md5(f"{source}::{i}::{chunk[:64]}".encode()).hexdigest()
            ids.append(doc_id)
            docs.append(chunk)
            metas.append({
                "source": source,
                "chunk_index": i,
                "languages": ",".join(transcript.get("languages", [])),
                "word_count": len(chunk.split()),
            })

        embeddings = embed_texts(docs)
        self._collection.upsert(
            ids=ids,
            documents=docs,
            metadatas=metas,
            embeddings=embeddings,
        )
        return len(ids)

    def ingest_all(self, directory: Optional[str] = None) -> Dict:
        """Load and ingest every transcript file from disk.

        Returns summary stats.
        """
        transcripts = load_all_transcripts(directory)
        total_chunks = 0
        for t in transcripts:
            n = self.ingest_transcript(t)
            total_chunks += n
            print(f"   📄 {t['source']}: {n} chunks")

        return {
            "files_processed": len(transcripts),
            "total_chunks": total_chunks,
            "collection_size": self._collection.count(),
        }

    # ── Retrieval ─────────────────────────────────────────────────────

    def query(
        self,
        query_text: str,
        top_k: int = PipelineConfig.RAG_TOP_K,
    ) -> List[Dict]:
        """Semantic search — returns top-k relevant chunks with metadata."""
        embedding = embed_texts([query_text])
        results = self._collection.query(
            query_embeddings=embedding,
            n_results=min(top_k, self._collection.count() or 1),
            include=["documents", "metadatas", "distances"],
        )

        hits: List[Dict] = []
        if results and results["documents"]:
            for doc, meta, dist in zip(
                results["documents"][0],
                results["metadatas"][0],
                results["distances"][0],
            ):
                hits.append({
                    "text": doc,
                    "source": meta.get("source", ""),
                    "languages": meta.get("languages", ""),
                    "similarity": round(1 - dist, 4),  # cosine → similarity
                })
        return hits

    def count(self) -> int:
        return self._collection.count()

    def reset(self):
        """Delete the collection and re-create it (for re-indexing)."""
        self._client.delete_collection(PipelineConfig.CHROMA_COLLECTION)
        self._collection = self._client.get_or_create_collection(
            name=PipelineConfig.CHROMA_COLLECTION,
            metadata={"hnsw:space": "cosine"},
        )
        print("🗑️  Vector store reset.")
