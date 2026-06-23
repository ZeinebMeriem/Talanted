"""Pipeline configuration — single source of truth for all pipeline settings."""
import os
from dotenv import load_dotenv

load_dotenv()


class PipelineConfig:
    """Central configuration for the AI processing pipeline."""

    # ── Ollama / Qwen ──────────────────────────────────────────────────
    OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    QWEN_MODEL = os.getenv("QWEN_MODEL", "qwen2.5:3b")
    QWEN_TEMPERATURE = float(os.getenv("QWEN_TEMPERATURE", "0.3"))
    QWEN_MAX_TOKENS = int(os.getenv("QWEN_MAX_TOKENS", "4096"))
    QWEN_TIMEOUT = int(os.getenv("QWEN_TIMEOUT", "120"))

    # ── ChromaDB ───────────────────────────────────────────────────────
    CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "chroma_db")
    CHROMA_COLLECTION = os.getenv("CHROMA_COLLECTION", "transcripts")
    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

    # ── Chunking ────────────────────────────────────────────────────────
    CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "512"))
    CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "64"))

    # ── Paths ──────────────────────────────────────────────────────────
    OUTPUTS_DIR = os.getenv("PIPELINE_OUTPUTS", "pipeline_outputs")
    REPORTS_DIR = os.path.join(OUTPUTS_DIR, "reports")
    DIAGRAMS_DIR = os.path.join(OUTPUTS_DIR, "diagrams")
    TRANSCRIPTS_DIR = os.getenv("TRANSCRIPTS_DIR", "outputs")

    # ── FastAPI ─────────────────────────────────────────────────────────
    API_HOST = os.getenv("PIPELINE_HOST", "0.0.0.0")
    API_PORT = int(os.getenv("PIPELINE_PORT", "8080"))

    # ── RAG ─────────────────────────────────────────────────────────────
    RAG_TOP_K = int(os.getenv("RAG_TOP_K", "5"))

    @classmethod
    def ensure_dirs(cls):
        """Create output directories."""
        for d in (cls.OUTPUTS_DIR, cls.REPORTS_DIR, cls.DIAGRAMS_DIR):
            os.makedirs(d, exist_ok=True)
