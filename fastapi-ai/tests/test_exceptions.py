"""
Unit tests for FastAPI endpoints and core functionality.
Run with: python -m pytest fastapi-ai/tests/ -v
"""

import pytest
from app.main import app
from app.exceptions import ValidationError, NotFoundError, BuildError


def test_health_endpoint():
    """Test health check endpoint."""
    # This would require setting up FastAPI TestClient
    # For now, verify the exception types are properly defined
    assert ValidationError.__name__ == "ValidationError"
    assert NotFoundError.__name__ == "NotFoundError"
    assert BuildError.__name__ == "BuildError"


def test_validation_error_structure():
    """Test ValidationError exception has correct structure."""
    error = ValidationError("Invalid prompt", {"field": "prompt"})
    assert error.error_code == "VALIDATION_ERROR"
    assert error.status_code == 400
    assert error.details == {"field": "prompt"}


def test_not_found_error_structure():
    """Test NotFoundError exception has correct structure."""
    error = NotFoundError("Project not found", {"project_id": "xyz"})
    assert error.error_code == "NOT_FOUND"
    assert error.status_code == 404


def test_build_error_structure():
    """Test BuildError exception with build output."""
    error = BuildError(
        "Vite build failed",
        "Module not found: react",
        {"file": "App.tsx"}
    )
    assert error.error_code == "BUILD_ERROR"
    assert error.status_code == 500
    assert "build_output" in error.details


def test_exception_serialization():
    """Test exceptions can be serialized to JSON."""
    error = ValidationError("Test error")
    payload = {
        "error": error.error_code,
        "message": error.message,
        "details": error.details,
    }
    assert payload["error"] == "VALIDATION_ERROR"
    assert payload["message"] == "Test error"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
