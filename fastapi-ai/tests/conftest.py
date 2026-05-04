"""Pytest configuration and shared fixtures."""
import os
import sys
from pathlib import Path

import pytest

# Add parent directory to path to allow importing app modules
app_dir = Path(__file__).parent.parent / "app"
sys.path.insert(0, str(app_dir.parent))


@pytest.fixture
def mock_env(monkeypatch):
    """Set up minimal environment variables for tests."""
    monkeypatch.setenv("GEMINI_API_KEY", "test-key-123")
    monkeypatch.setenv("OLLAMA_BASE_URL", "http://localhost:11434")
    monkeypatch.setenv("PROJECTS_DIR", "/tmp/test-projects")
    return monkeypatch


@pytest.fixture
def mock_llm_provider(mocker):
    """Mock LLM provider to avoid actual API calls."""
    mock = mocker.MagicMock()
    mock.chat.return_value = """
    {
        "project_name": "Test UI Project",
        "pages": ["Home", "About"],
        "components": ["Header", "Footer"],
        "color_scheme": "blue"
    }
    """
    mock.chat_json.return_value = {
        "project_name": "Test UI Project",
        "pages": ["Home", "About"],
        "components": ["Header", "Footer"],
    }
    return mock


@pytest.fixture
def sample_generate_request():
    """Sample GenerateRequest fixture."""
    from app.schemas import GenerateRequest

    return GenerateRequest(
        generationId="test-gen-123",
        prompt="Create a simple landing page with a hero section and CTA button",
        mode="full",
        fileRefs=[],
        domain="landing",
        model=None,
    )


@pytest.fixture
def sample_ui_spec():
    """Sample UI specification output."""
    return {
        "project_name": "Test Landing Page",
        "pages": [
            {
                "name": "index",
                "sections": [
                    {
                        "name": "hero",
                        "type": "hero",
                        "elements": ["heading", "subheading", "cta-button"],
                    }
                ],
            }
        ],
        "color_palette": {
            "primary": "#3b82f6",
            "secondary": "#8b5cf6",
            "accent": "#ec4899",
        },
        "typography": {
            "font_family": "Inter",
            "heading_size": "48px",
            "body_size": "16px",
        },
    }


@pytest.fixture
def sample_code_bundle():
    """Sample code bundle output."""
    return {
        "files": [
            {
                "path": "index.html",
                "content": """<!DOCTYPE html>
<html>
  <head><title>Landing Page</title></head>
  <body>
    <header><h1>Welcome</h1></header>
    <button>Get Started</button>
  </body>
</html>""",
            },
            {
                "path": "style.css",
                "content": """
body { font-family: Inter; color: #333; }
h1 { font-size: 48px; color: #3b82f6; }
button { background: #3b82f6; color: white; padding: 12px 24px; }
""",
            },
        ]
    }
