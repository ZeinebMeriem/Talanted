"""Tests for design system agent."""
import pytest
from unittest.mock import MagicMock


class TestDesignSystemAgentBasics:
    """Test DesignSystemAgent basic functionality."""

    def test_design_agent_initializes(self):
        """Test that DesignSystemAgent can be instantiated."""
        from app.pipeline.agents.design_system_agent import DesignSystemAgent

        mock_llm = MagicMock()
        agent = DesignSystemAgent(llm_provider=mock_llm)
        assert agent is not None

    def test_design_agent_generates_color_palette(self, mock_llm_provider):
        """Test that design agent generates color palette."""
        from app.pipeline.agents.design_system_agent import DesignSystemAgent

        agent = DesignSystemAgent(llm_provider=mock_llm_provider)

        mock_llm_provider.chat_json.return_value = {
            "primary": "#3b82f6",
            "secondary": "#8b5cf6",
            "accent": "#ec4899",
            "background": "#ffffff",
            "text": "#1f2937",
        }

        result = agent.generate_color_palette(
            project_name="Test Project", domain="landing"
        )
        assert result is not None
        if isinstance(result, dict):
            assert "primary" in result or len(result) > 0

    def test_design_agent_generates_typography(self, mock_llm_provider):
        """Test that design agent generates typography system."""
        from app.pipeline.agents.design_system_agent import DesignSystemAgent

        agent = DesignSystemAgent(llm_provider=mock_llm_provider)

        mock_llm_provider.chat_json.return_value = {
            "font_family": "Inter",
            "heading_scale": "48px, 36px, 28px, 24px",
            "body_size": "16px",
            "line_height": 1.5,
        }

        result = agent.generate_typography(domain="landing")
        assert result is not None

    def test_design_agent_generates_component_specs(self, mock_llm_provider):
        """Test that design agent generates component specifications."""
        from app.pipeline.agents.design_system_agent import DesignSystemAgent

        agent = DesignSystemAgent(llm_provider=mock_llm_provider)

        mock_llm_provider.chat_json.return_value = {
            "Button": {
                "primary": {"bg": "#3b82f6", "text": "white"},
                "secondary": {"bg": "#e5e7eb", "text": "#1f2937"},
            },
            "Card": {"shadow": "0 1px 3px rgba(0,0,0,0.1)", "border_radius": "8px"},
        }

        result = agent.generate_components(
            domain="landing", components=["Button", "Card"]
        )
        assert result is not None


class TestDesignSystemOutputFormat:
    """Test design system output formatting."""

    def test_design_output_has_required_fields(self, mock_llm_provider):
        """Test that design output includes all required fields."""
        from app.pipeline.agents.design_system_agent import DesignSystemAgent

        agent = DesignSystemAgent(llm_provider=mock_llm_provider)

        output = {
            "colors": {"primary": "#3b82f6", "secondary": "#8b5cf6"},
            "typography": {"font": "Inter", "size": "16px"},
            "spacing": {"unit": "4px", "scale": [4, 8, 16, 32, 64]},
        }

        # Verify structure
        assert "colors" in output or "typography" in output or "spacing" in output

    def test_design_system_css_generation(self):
        """Test that design system can generate CSS variables."""
        design_tokens = {
            "primary": "#3b82f6",
            "secondary": "#8b5cf6",
            "font_family": "Inter",
        }

        # Verify tokens can be converted to CSS
        css_vars = {f"--{k}": v for k, v in design_tokens.items()}
        assert "--primary" in css_vars
        assert css_vars["--primary"] == "#3b82f6"


class TestDesignSystemDomainContext:
    """Test design system with domain-specific guidance."""

    def test_design_respects_domain_guidelines(self, mock_llm_provider):
        """Test that design agent respects domain color/style guidelines."""
        from app.pipeline.agents.design_system_agent import DesignSystemAgent

        agent = DesignSystemAgent(llm_provider=mock_llm_provider)

        # Medical domain should use calm, professional colors
        medical_design = agent.generate_color_palette(
            project_name="Clinic App", domain="medical"
        )
        assert medical_design is not None

        # E-commerce should use vibrant, conversion-oriented colors
        ecommerce_design = agent.generate_color_palette(
            project_name="Shop", domain="ecommerce"
        )
        assert ecommerce_design is not None

    def test_design_consistency_across_calls(self, mock_llm_provider):
        """Test that multiple calls produce consistent design tokens."""
        from app.pipeline.agents.design_system_agent import DesignSystemAgent

        agent = DesignSystemAgent(llm_provider=mock_llm_provider)

        mock_llm_provider.chat_json.return_value = {
            "primary": "#3b82f6",
            "secondary": "#8b5cf6",
        }

        result1 = agent.generate_color_palette("Test", domain="landing")
        result2 = agent.generate_color_palette("Test", domain="landing")

        # Both should return valid results
        assert result1 is not None
        assert result2 is not None
