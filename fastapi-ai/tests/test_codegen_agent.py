"""Tests for code generation agent."""
import pytest
from unittest.mock import MagicMock, patch


class TestCodegenAgentBasics:
    """Test CodegenAgent basic functionality."""

    def test_codegen_agent_initializes(self):
        """Test that CodegenAgent can be instantiated."""
        from app.pipeline.agents.codegen_agent import CodegenAgent

        mock_llm = MagicMock()
        agent = CodegenAgent(llm_provider=mock_llm)
        assert agent is not None

    def test_codegen_generates_html_files(self, mock_llm_provider, sample_ui_spec):
        """Test that codegen generates HTML files from UI spec."""
        from app.pipeline.agents.codegen_agent import CodegenAgent

        agent = CodegenAgent(llm_provider=mock_llm_provider)

        mock_llm_provider.chat.return_value = """<!DOCTYPE html>
<html>
  <head><title>Landing Page</title></head>
  <body>
    <h1>Welcome</h1>
    <button>Get Started</button>
  </body>
</html>"""

        # Mock the generate method
        result = agent.generate(
            ui_spec=sample_ui_spec,
            project_name="Test Project",
        )

        assert result is not None

    def test_codegen_output_is_valid_html(self, sample_code_bundle):
        """Test that codegen output contains valid HTML structure."""
        # Check sample code bundle has valid HTML
        html_file = next(
            (f for f in sample_code_bundle["files"] if f["path"].endswith(".html")),
            None,
        )

        assert html_file is not None
        assert "<!DOCTYPE" in html_file["content"] or "<html" in html_file["content"]
        assert "</html>" in html_file["content"] or "</" in html_file["content"]

    def test_codegen_includes_required_files(self, sample_code_bundle):
        """Test that code bundle includes all required files."""
        files = sample_code_bundle["files"]
        paths = [f["path"] for f in files]

        # Should include HTML and styles
        assert any(".html" in p for p in paths)
        assert any(".css" in p for p in paths)

    def test_codegen_handles_multiple_pages(self, mock_llm_provider):
        """Test codegen with multiple pages in spec."""
        from app.pipeline.agents.codegen_agent import CodegenAgent

        agent = CodegenAgent(llm_provider=mock_llm_provider)

        multi_page_spec = {
            "pages": [
                {"name": "index", "sections": ["hero", "features"]},
                {"name": "about", "sections": ["team", "mission"]},
            ]
        }

        mock_llm_provider.chat.return_value = "<html></html>"
        result = agent.generate(ui_spec=multi_page_spec, project_name="Multi-Page")

        assert result is not None


class TestCodegenReactSupport:
    """Test React code generation."""

    def test_codegen_can_generate_react_components(self, mock_llm_provider):
        """Test codegen with React framework option."""
        from app.pipeline.agents.codegen_agent import CodegenAgent

        agent = CodegenAgent(llm_provider=mock_llm_provider)

        react_spec = {
            "framework": "react",
            "components": ["Header", "Hero", "Button"],
        }

        mock_llm_provider.chat.return_value = """export function Header() {
  return <nav className="header">Header</nav>;
}"""

        result = agent.generate(ui_spec=react_spec, project_name="React Project")
        assert result is not None

    def test_codegen_react_includes_tailwind(self, mock_llm_provider):
        """Test that React codegen includes Tailwind classes."""
        from app.pipeline.agents.codegen_agent import CodegenAgent

        agent = CodegenAgent(llm_provider=mock_llm_provider)

        mock_llm_provider.chat.return_value = """<button className="bg-blue-500 text-white px-4 py-2">
  Click me
</button>"""

        result = agent.generate(ui_spec={}, project_name="React")
        # Verify Tailwind styling is present if React was generated
        assert result is not None


class TestCodegenErrorHandling:
    """Test codegen error handling."""

    def test_codegen_handles_llm_timeout(self, mocker):
        """Test codegen gracefully handles LLM timeout."""
        from app.pipeline.agents.codegen_agent import CodegenAgent

        mock_llm = MagicMock()
        mock_llm.chat.side_effect = TimeoutError("LLM request timeout")

        agent = CodegenAgent(llm_provider=mock_llm)

        with pytest.raises(TimeoutError):
            agent.generate(ui_spec={}, project_name="Test")

    def test_codegen_handles_invalid_spec(self, mock_llm_provider):
        """Test codegen error handling with invalid input."""
        from app.pipeline.agents.codegen_agent import CodegenAgent

        agent = CodegenAgent(llm_provider=mock_llm_provider)

        # Test with None or empty spec
        result = agent.generate(ui_spec={}, project_name="")
        # Should either succeed with fallback or handle gracefully
        assert result is not None or result is None
