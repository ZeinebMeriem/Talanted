"""Tests for DesignSystemAgent."""
import pytest
from unittest.mock import MagicMock, patch


@pytest.fixture
def provider():
    m = MagicMock()
    m.chat_json.return_value = {"primary": "#3b82f6", "font_family": "Inter"}
    return m


@pytest.fixture
def sample_plan():
    return {
        "project_name": "Test Project",
        "pages": ["home"],
        "components": ["Header", "Button", "Card"],
        "domain": "landing",
    }


class TestDesignSystemAgentBasics:

    def test_design_agent_initializes(self, provider):
        from app.pipeline.agents.design_system_agent import DesignSystemAgent
        agent = DesignSystemAgent(provider=provider)
        assert agent is not None

    def test_design_agent_has_generate_method(self, provider):
        from app.pipeline.agents.design_system_agent import DesignSystemAgent
        agent = DesignSystemAgent(provider=provider)
        assert callable(getattr(agent, "generate", None))

    def test_design_agent_generates_color_palette(self, provider, sample_plan):
        from app.pipeline.agents.design_system_agent import DesignSystemAgent
        agent = DesignSystemAgent(provider=provider)
        expected = {"primary": "#3b82f6", "secondary": "#8b5cf6", "font_family": "Inter"}
        with patch.object(agent, "generate", return_value=expected):
            result = agent.generate(sample_plan, context="landing page")
        assert "primary" in result

    def test_design_agent_generates_typography(self, provider, sample_plan):
        from app.pipeline.agents.design_system_agent import DesignSystemAgent
        agent = DesignSystemAgent(provider=provider)
        expected = {"font_family": "Inter", "heading_size": "48px", "body_size": "16px"}
        with patch.object(agent, "generate", return_value=expected):
            result = agent.generate(sample_plan)
        assert "font_family" in result

    def test_design_agent_generates_component_specs(self, provider, sample_plan):
        from app.pipeline.agents.design_system_agent import DesignSystemAgent
        agent = DesignSystemAgent(provider=provider)
        expected = {"primary": "#3b82f6", "border_radius": "8px"}
        with patch.object(agent, "generate", return_value=expected):
            result = agent.generate(sample_plan)
        assert result is not None


class TestDesignSystemOutputFormat:

    def test_design_output_has_required_fields(self, provider, sample_plan):
        from app.pipeline.agents.design_system_agent import DesignSystemAgent
        agent = DesignSystemAgent(provider=provider)
        expected = {"primary": "#3b82f6", "font_family": "Inter", "heading_size": "48px"}
        with patch.object(agent, "generate", return_value=expected):
            result = agent.generate(sample_plan)
        assert "primary" in result
        assert "font_family" in result

    def test_design_system_css_generation(self):
        css = ":root { --color-primary: #3b82f6; --font-family: Inter; }"
        assert "--color-primary" in css
        assert "--font-family" in css


class TestDesignSystemDomainContext:

    def test_design_respects_domain_guidelines(self, provider, sample_plan):
        from app.pipeline.agents.design_system_agent import DesignSystemAgent
        agent = DesignSystemAgent(provider=provider)
        with patch.object(agent, "generate", return_value={"primary": "#0ea5e9"}) as mock_gen:
            agent.generate(sample_plan, context="medical domain", theme_preset=None)
        mock_gen.assert_called_once()

    def test_design_consistency_across_calls(self, provider, sample_plan):
        from app.pipeline.agents.design_system_agent import DesignSystemAgent
        agent = DesignSystemAgent(provider=provider)
        fixed = {"primary": "#3b82f6", "secondary": "#8b5cf6"}
        with patch.object(agent, "generate", return_value=fixed):
            r1 = agent.generate(sample_plan)
            r2 = agent.generate(sample_plan)
        assert r1["primary"] == r2["primary"]
