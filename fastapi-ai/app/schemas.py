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


class CodeFile(BaseModel):
    path: str
    content: str


class CodeBundle(BaseModel):
    files: list[CodeFile]


class AiReport(BaseModel):
    score: int = 80
    issues: list[dict[str, Any]] = Field(default_factory=list)
    sources_used: list[str] = Field(default_factory=list)
    llm_provider: str = "mock"
    pipeline: list[str] = Field(default_factory=list)
    durations: dict[str, Any] = Field(default_factory=dict)
    retries_count: int = 0


class GenerateResponse(BaseModel):
    uiSpec: dict[str, Any]
    codeBundle: CodeBundle
    aiReport: AiReport
