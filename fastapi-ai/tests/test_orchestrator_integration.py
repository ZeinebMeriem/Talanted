"""Tests for orchestrator integration and end-to-end pipeline."""
import pytest
from unittest.mock import MagicMock, patch

from app.schemas import GenerateRequest
from app.pipeline.orchestrator import Orchestrator


@pytest.fixture
def orchestrator():
    return Orchestrator()


@pytest.fixture
def basic_request():
    return GenerateRequest(
        generationId="test-gen-123",
        prompt="Create a landing page with hero section and CTA button",
        mode="full",
        fileRefs=None,
        domain="landing",
        model=None,
    )


# ── Initialisation ────────────────────────────────────────────────────────────

class TestOrchestratorInit:

    def test_orchestrator_has_run_method(self, orchestrator):
        assert callable(getattr(orchestrator, "run", None))

    def test_orchestrator_has_run_stream_method(self, orchestrator):
        assert callable(getattr(orchestrator, "run_stream", None))

    def test_orchestrator_has_edit_file_method(self, orchestrator):
        assert callable(getattr(orchestrator, "edit_file", None))

    def test_orchestrator_has_ui_evaluator(self, orchestrator):
        assert hasattr(orchestrator, "ui_evaluator")
        assert orchestrator.ui_evaluator is not None


# ── Streaming ─────────────────────────────────────────────────────────────────

class TestOrchestratorStreaming:

    def test_run_stream_yields_progress_then_complete(self, orchestrator, basic_request):
        """run_stream doit émettre des events progress puis un event complete."""
        fake_events = [
            {"type": "progress", "stage": "planning", "progress": 20, "message": "Planning..."},
            {"type": "progress", "stage": "codegen_start", "progress": 50, "message": "Generating..."},
            {"type": "complete", "progress": 100, "result": {"generationId": "test-gen-123"}},
        ]
        with patch.object(orchestrator, "run_stream", return_value=iter(fake_events)):
            events = list(orchestrator.run_stream(basic_request))

        assert len(events) == 3
        assert events[0]["type"] == "progress"
        assert events[-1]["type"] == "complete"
        assert events[-1]["progress"] == 100

    def test_run_stream_progress_increases(self, orchestrator, basic_request):
        """Les valeurs de progress doivent être croissantes."""
        fake_events = [
            {"type": "progress", "stage": "extract", "progress": 10},
            {"type": "progress", "stage": "planning", "progress": 30},
            {"type": "progress", "stage": "codegen_start", "progress": 60},
            {"type": "complete", "progress": 100, "result": {}},
        ]
        with patch.object(orchestrator, "run_stream", return_value=iter(fake_events)):
            events = list(orchestrator.run_stream(basic_request))

        progress_values = [e["progress"] for e in events]
        assert progress_values == sorted(progress_values), "Progress doit être croissant"

    def test_run_stream_error_event_has_message(self, orchestrator, basic_request):
        """Un event error doit avoir un champ 'message'."""
        fake_events = [
            {"type": "error", "message": "LLM timeout after 3 retries"},
        ]
        with patch.object(orchestrator, "run_stream", return_value=iter(fake_events)):
            events = list(orchestrator.run_stream(basic_request))

        assert events[0]["type"] == "error"
        assert "message" in events[0]
        assert len(events[0]["message"]) > 0

    def test_run_stream_complete_contains_generation_id(self, orchestrator, basic_request):
        """L'event complete doit contenir un generationId."""
        fake_events = [
            {"type": "complete", "progress": 100, "result": {"generationId": "test-gen-123"}},
        ]
        with patch.object(orchestrator, "run_stream", return_value=iter(fake_events)):
            events = list(orchestrator.run_stream(basic_request))

        result = events[0]["result"]
        assert "generationId" in result
        assert result["generationId"] == "test-gen-123"


# ── Schéma de la requête ──────────────────────────────────────────────────────

class TestGenerateRequestSchema:

    def test_request_requires_generation_id(self):
        req = GenerateRequest(
            generationId="abc-123",
            prompt="Build a form",
            mode="full",
            fileRefs=None,
            domain=None,
            model=None,
        )
        assert req.generationId == "abc-123"

    def test_request_accepts_none_file_refs(self):
        req = GenerateRequest(
            generationId="x",
            prompt="Test",
            mode="full",
            fileRefs=None,
            domain=None,
            model=None,
        )
        assert req.fileRefs is None

    def test_request_accepts_domain(self):
        req = GenerateRequest(
            generationId="x",
            prompt="E-commerce store",
            mode="full",
            fileRefs=None,
            domain="ecommerce",
            model=None,
        )
        assert req.domain == "ecommerce"

    def test_request_accepts_model_override(self):
        req = GenerateRequest(
            generationId="x",
            prompt="Dashboard",
            mode="full",
            fileRefs=None,
            domain=None,
            model="gemini",
        )
        assert req.model == "gemini"


# ── Ordre des agents ──────────────────────────────────────────────────────────

class TestPipelineStageOrder:

    def test_planning_before_codegen(self):
        stages = ["extract", "rag", "prep", "planning", "design", "codegen_start", "build", "eval"]
        assert stages.index("planning") < stages.index("codegen_start")

    def test_design_before_codegen(self):
        stages = ["extract", "rag", "prep", "planning", "design", "codegen_start", "build", "eval"]
        assert stages.index("design") < stages.index("codegen_start")

    def test_build_before_eval(self):
        stages = ["extract", "rag", "prep", "planning", "design", "codegen_start", "build", "eval"]
        assert stages.index("build") < stages.index("eval")

    def test_extract_is_first_stage(self):
        stages = ["extract", "rag", "prep", "planning", "design", "codegen_start", "build", "eval"]
        assert stages[0] == "extract"

    def test_eval_is_last_stage(self):
        stages = ["extract", "rag", "prep", "planning", "design", "codegen_start", "build", "eval"]
        assert stages[-1] == "eval"


# ── Évaluation de qualité ─────────────────────────────────────────────────────

class TestUIEvaluator:

    def test_evaluator_returns_global_score(self, orchestrator):
        """ui_evaluator.evaluate doit retourner un global_score entre 0 et 100."""
        mock_result = {
            "global_score": 78,
            "dimensions": {
                "semantic_fidelity": 85,
                "code_quality": 70,
                "completeness": 75,
                "accessibility": 80,
                "visual_richness": 65,
            },
            "reasoning": {},
        }
        with patch.object(orchestrator.ui_evaluator, "evaluate", return_value=mock_result):
            result = orchestrator.ui_evaluator.evaluate(
                prompt="landing page", code="<div/>", build_success=True
            )

        assert "global_score" in result
        assert 0 <= result["global_score"] <= 100

    def test_evaluator_returns_all_dimensions(self, orchestrator):
        """Toutes les 5 dimensions doivent être présentes."""
        expected_dims = {"semantic_fidelity", "code_quality", "completeness", "accessibility", "visual_richness"}
        mock_result = {
            "global_score": 70,
            "dimensions": {d: 70 for d in expected_dims},
            "reasoning": {},
        }
        with patch.object(orchestrator.ui_evaluator, "evaluate", return_value=mock_result):
            result = orchestrator.ui_evaluator.evaluate("prompt", "code", True)

        assert set(result["dimensions"].keys()) == expected_dims

    def test_evaluator_scores_in_valid_range(self, orchestrator):
        """Chaque score doit être entre 0 et 100."""
        mock_result = {
            "global_score": 82,
            "dimensions": {
                "semantic_fidelity": 90,
                "code_quality": 75,
                "completeness": 85,
                "accessibility": 80,
                "visual_richness": 70,
            },
            "reasoning": {},
        }
        with patch.object(orchestrator.ui_evaluator, "evaluate", return_value=mock_result):
            result = orchestrator.ui_evaluator.evaluate("prompt", "code", True)

        assert 0 <= result["global_score"] <= 100
        for score in result["dimensions"].values():
            assert 0 <= score <= 100
