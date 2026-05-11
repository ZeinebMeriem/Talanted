from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class FileRef(BaseModel):
    minioPath: str | None = None
    mimeType: str | None = None
    originalName: str | None = None
    sha256: str | None = None
    sizeBytes: int | None = None


class GenerateRequest(BaseModel):
    generationId: str
    prompt: str
    mode: Literal["full", "codegen_only"] = "full"
    fileRefs: list[FileRef] = Field(default_factory=list)
    uiSpec: dict[str, Any] | None = None
    # Domain context for prompt fine-tuning (ecommerce|medical|dashboard|education|saas|portfolio|restaurant|real_estate)
    # If None, the system auto-detects the domain from the prompt keywords
    domain: str | None = None
    # Model override (gemini|claude|gpt|groq) - if None, uses .env defaults
    model: str | None = None
    # Theme preset for the DesignSystemAgent (minimal|corporate|vibrant|dark|natural|auto)
    themePreset: str | None = None


class CodeFile(BaseModel):
    path: str
    content: str


class CodeBundle(BaseModel):
    files: list[CodeFile]


class UIEvaluation(BaseModel):
    """Automatic quality scores produced by UIEvaluatorAgent."""
    global_score:       int = 0
    semantic_fidelity:  int = 0
    code_quality:       int = 0
    completeness:       int = 0
    accessibility:      int = 0
    visual_richness:    int = 0
    reasoning:          dict[str, str] = Field(default_factory=dict)


class AiReport(BaseModel):
    score: int = 80
    issues: list[dict[str, Any]] = Field(default_factory=list)
    sources_used: list[str] = Field(default_factory=list)
    llm_provider: str = "mock"
    pipeline: list[str] = Field(default_factory=list)
    durations: dict[str, Any] = Field(default_factory=dict)
    retries_count: int = 0
    build_retries: int = 0          # number of self-healing repair attempts
    ui_evaluation: UIEvaluation | None = None  # populated by UIEvaluatorAgent


class GenerateResponse(BaseModel):
    generationId: str = ""
    uiSpec: dict[str, Any]
    codeBundle: CodeBundle
    aiReport: AiReport


class EditFileRequest(BaseModel):
    generationId: str
    filePath: str        # e.g. "App.tsx" or "components/Sidebar.tsx"
    instruction: str     # e.g. "Change the header to dark blue and add a logout button"
    model: str | None = None  # Model override (gemini|claude|gpt|groq)


class EditFileResponse(BaseModel):
    filePath: str
    content: str
    buildSuccess: bool
    buildOutput: str


class ProjectFilesResponse(BaseModel):
    """All source files of a project read directly from disk."""
    files: list[CodeFile]


class RestoreRequest(BaseModel):
    """Restore a set of files to disk and rebuild (used by rollback)."""
    generationId: str
    files: list[CodeFile]


class RestoreResponse(BaseModel):
    buildSuccess: bool
    buildOutput: str


class DuplicateResponse(BaseModel):
    """Response for duplicating a project."""
    newGenerationId: str
    buildSuccess: bool
    buildOutput: str



