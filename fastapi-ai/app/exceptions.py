"""Custom exception types with structured error handling."""

from typing import Optional


class UIGeneratorException(Exception):
    """Base exception for all UI Generator errors."""

    def __init__(
        self,
        message: str,
        error_code: str = "INTERNAL_ERROR",
        status_code: int = 500,
        details: Optional[dict] = None,
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(UIGeneratorException):
    """Invalid request parameters or payload."""

    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=400,
            details=details,
        )


class NotFoundError(UIGeneratorException):
    """Resource not found."""

    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(
            message=message,
            error_code="NOT_FOUND",
            status_code=404,
            details=details,
        )


class TimeoutError(UIGeneratorException):
    """Operation timed out."""

    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(
            message=message,
            error_code="TIMEOUT",
            status_code=504,
            details=details,
        )


class LLMProviderError(UIGeneratorException):
    """Error from LLM provider (Gemini, Groq, etc)."""

    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(
            message=message,
            error_code="LLM_PROVIDER_ERROR",
            status_code=502,
            details=details,
        )


class BuildError(UIGeneratorException):
    """Project build (Vite) failed."""

    def __init__(self, message: str, build_output: str = "", details: Optional[dict] = None):
        if details is None:
            details = {}
        details["build_output"] = build_output[-500:]  # Last 500 chars
        super().__init__(
            message=message,
            error_code="BUILD_ERROR",
            status_code=500,
            details=details,
        )


class FileSystemError(UIGeneratorException):
    """Error reading/writing project files."""

    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(
            message=message,
            error_code="FILESYSTEM_ERROR",
            status_code=500,
            details=details,
        )
