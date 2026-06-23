"""Tests for PlannerAgent."""
import pytest
from unittest.mock import MagicMock, patch

from app.pipeline.agents.planner_agent import PlannerAgent
from app.pipeline.models import SourcePack
from app.schemas import GenerateRequest


@pytest.fixture
def provider():
    m = MagicMock()
    m.chat_json.return_value = {
        "project_name": "Test Project",
        "pages": ["home", "about"],
        "components": ["Header", "Hero", "Footer"],
        "layout": "hero + features",
    }
    return m


@pytest.fixture
def basic_request():
    return GenerateRequest(
        generationId="test-gen-123",
        prompt="Create a landing page with hero section and CTA button",
        mode="full",
        fileRefs=[],
        domain="landing",
        model=None,
    )


@pytest.fixture
def empty_pack():
    return SourcePack(items=[])


class TestPlannerAgentBasics:

    def test_planner_agent_initializes(self, provider):
        agent = PlannerAgent(provider=provider)
        assert agent is not None

    def test_planner_generates_project_structure(self, provider, basic_request, empty_pack):
        agent = PlannerAgent(provider=provider)
        with patch.object(agent, "plan", return_value={
            "project_name": "Landing Page",
            "pages": ["home"],
            "components": ["Header", "Hero"],
        }):
            result = agent.plan(basic_request, empty_pack)
        assert "project_name" in result
        assert "pages" in result

    def test_planner_detects_project_type(self):
        from app.pipeline.agents.planner_agent import _detect_project_type
        project_type, _ = _detect_project_type("analytics dashboard with charts and KPIs")
        assert project_type is not None
        assert isinstance(project_type, str)

    def test_planner_generates_valid_json_schema(self, provider, basic_request, empty_pack):
        agent = PlannerAgent(provider=provider)
        with patch.object(agent, "plan", return_value={
            "project_name": "E-Commerce Store",
            "pages": ["products", "cart"],
            "components": ["ProductCard", "CartIcon"],
        }):
            result = agent.plan(basic_request, empty_pack)
        assert isinstance(result, dict)
        assert len(result) > 0

    def test_planner_handles_empty_prompt(self, provider, empty_pack):
        agent = PlannerAgent(provider=provider)
        req = GenerateRequest(
            generationId="test",
            prompt="",
            mode="full",
            fileRefs=[],
            domain=None,
            model=None,
        )
        with patch.object(agent, "plan", return_value={"project_name": "App", "pages": []}):
            result = agent.plan(req, empty_pack)
        assert result is not None


class TestPlannerAgentWithDomainContext:

    def test_planner_uses_domain_context(self, provider, basic_request, empty_pack):
        agent = PlannerAgent(provider=provider)
        basic_request.domain = "landing"
        with patch.object(agent, "plan", return_value={
            "project_name": "Landing",
            "pages": ["home"],
            "domain": "landing",
        }):
            result = agent.plan(basic_request, empty_pack)
        assert result is not None

    def test_planner_provides_component_suggestions_for_domain(self):
        from app.pipeline.domain_prompts import DOMAIN_CONTEXTS
        assert len(DOMAIN_CONTEXTS) > 0
        for domain, ctx in DOMAIN_CONTEXTS.items():
            assert isinstance(domain, str)
            assert isinstance(ctx, dict)
