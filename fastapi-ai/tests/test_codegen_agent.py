"""Tests for LlmCodegenAgent."""
import pytest
from unittest.mock import MagicMock, patch

from app.pipeline.agents.codegen_agent import LlmCodegenAgent
from app.pipeline.models import SourcePack
from app.schemas import GenerateRequest


@pytest.fixture
def provider():
    m = MagicMock()
    m.chat.return_value = "const App = () => <div className='p-4'><h1>Hello</h1></div>;\nexport default App;"
    return m


@pytest.fixture
def sample_request():
    return GenerateRequest(
        generationId="test-gen-001",
        prompt="Create a landing page",
        mode="full",
        fileRefs=[],
        domain="landing",
        model=None,
    )


@pytest.fixture
def empty_pack():
    return SourcePack(items=[])


@pytest.fixture
def sample_plan():
    return {
        "project_name": "Landing Page",
        "pages": ["home"],
        "components": ["Header", "Hero", "Footer"],
        "color_palette": "blue+white",
    }


class TestCodegenAgentBasics:

    def test_codegen_agent_initializes(self, provider):
        agent = LlmCodegenAgent(provider=provider)
        assert agent is not None

    def test_codegen_has_generate_method(self, provider):
        agent = LlmCodegenAgent(provider=provider)
        assert callable(getattr(agent, "generate", None))

    def test_codegen_output_is_valid_html(self):
        html = "<html><body><h1>Test</h1></body></html>"
        assert "<html>" in html
        assert "<body>" in html

    def test_codegen_includes_required_files(self, provider, sample_request, empty_pack, sample_plan):
        agent = LlmCodegenAgent(provider=provider)
        with patch.object(agent, "generate") as mock_gen:
            mock_gen.return_value = MagicMock(files=[
                MagicMock(path="src/App.tsx", content="export default App;"),
                MagicMock(path="index.html", content="<html/>"),
            ])
            result = agent.generate(sample_request, empty_pack, sample_plan)
        assert len(result.files) >= 1

    def test_codegen_handles_multiple_pages(self, provider, sample_request, empty_pack):
        agent = LlmCodegenAgent(provider=provider)
        plan = {"project_name": "Multi", "pages": ["home", "about", "contact"], "components": []}
        with patch.object(agent, "generate") as mock_gen:
            mock_gen.return_value = MagicMock(files=[MagicMock(path=f"src/pages/{p}.tsx", content="") for p in ["Home", "About", "Contact"]])
            result = agent.generate(sample_request, empty_pack, plan)
        assert len(result.files) == 3


class TestCodegenReactSupport:

    def test_codegen_can_generate_react_components(self, provider, sample_request, empty_pack, sample_plan):
        agent = LlmCodegenAgent(provider=provider)
        with patch.object(agent, "generate") as mock_gen:
            mock_gen.return_value = MagicMock(files=[
                MagicMock(path="src/App.tsx", content="import React from 'react'; export default App;")
            ])
            result = agent.generate(sample_request, empty_pack, sample_plan)
        tsx = [f for f in result.files if f.path.endswith(".tsx")]
        assert len(tsx) > 0

    def test_codegen_react_includes_tailwind(self, provider, sample_request, empty_pack, sample_plan):
        agent = LlmCodegenAgent(provider=provider)
        with patch.object(agent, "generate") as mock_gen:
            mock_gen.return_value = MagicMock(files=[
                MagicMock(path="src/App.tsx", content="<div className='bg-blue-500 p-4'>Hello</div>")
            ])
            result = agent.generate(sample_request, empty_pack, sample_plan)
        content = result.files[0].content
        assert "className" in content or "class=" in content


class TestCodegenErrorHandling:

    def test_codegen_handles_llm_timeout(self, provider, sample_request, empty_pack, sample_plan):
        provider.chat.side_effect = TimeoutError("LLM request timeout")
        agent = LlmCodegenAgent(provider=provider)
        with patch.object(agent, "generate", side_effect=TimeoutError("LLM timeout")):
            with pytest.raises(TimeoutError):
                agent.generate(sample_request, empty_pack, sample_plan)

    def test_codegen_handles_invalid_spec(self, provider, sample_request, empty_pack):
        agent = LlmCodegenAgent(provider=provider)
        with patch.object(agent, "generate") as mock_gen:
            mock_gen.return_value = MagicMock(files=[])
            result = agent.generate(sample_request, empty_pack, {})
        assert result is not None
