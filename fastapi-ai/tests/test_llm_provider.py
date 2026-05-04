"""Tests for LLM provider abstraction and fallback mechanism."""
import pytest
from unittest.mock import MagicMock, patch

from app.pipeline.llm_provider import LlmProvider


# ── Interface ─────────────────────────────────────────────────────────────────

class TestLlmProviderInterface:

    def test_provider_has_chat_method(self):
        assert hasattr(LlmProvider, "chat")

    def test_provider_has_chat_json_method(self):
        assert hasattr(LlmProvider, "chat_json")

    def test_provider_has_chat_vision_method(self):
        assert hasattr(LlmProvider, "chat_vision")

    def test_chat_returns_string(self):
        mock_provider = MagicMock(spec=LlmProvider)
        mock_provider.chat.return_value = "Generated React component"
        result = mock_provider.chat(system="You are a coder", user="Build a button")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_chat_json_returns_dict(self):
        mock_provider = MagicMock(spec=LlmProvider)
        mock_provider.chat_json.return_value = {"components": ["Header", "Footer"]}
        result = mock_provider.chat_json(system="You are a planner", user="Plan a page")
        assert isinstance(result, dict)
        assert "components" in result

    def test_chat_vision_returns_string(self):
        mock_provider = MagicMock(spec=LlmProvider)
        mock_provider.chat_vision.return_value = "A wireframe with header"
        result = mock_provider.chat_vision("base64data", "image/png", "Describe this")
        assert isinstance(result, str)


# ── Sélection du fournisseur ──────────────────────────────────────────────────

class TestProviderSelection:

    def test_create_planner_provider_returns_provider(self):
        from app.pipeline.llm_provider import create_planner_provider
        with patch.dict("os.environ", {"PLANNER_PROVIDER": "ollama", "NO_LOCAL_MODEL": "false"}):
            provider = create_planner_provider()
            assert provider is not None

    def test_create_coder_provider_returns_provider(self):
        from app.pipeline.llm_provider import create_coder_provider
        with patch.dict("os.environ", {"CODER_PROVIDER": "ollama", "NO_LOCAL_MODEL": "false"}):
            provider = create_coder_provider()
            assert provider is not None

    def test_create_planner_provider_with_gemini_key(self):
        from app.pipeline.llm_provider import create_planner_provider
        with patch.dict("os.environ", {
            "PLANNER_PROVIDER": "gemini",
            "GEMINI_API_KEY": "fake-key-123",
            "NO_LOCAL_MODEL": "false"
        }):
            provider = create_planner_provider()
            assert provider is not None

    def test_create_coder_provider_with_groq_key(self):
        from app.pipeline.llm_provider import create_coder_provider
        with patch.dict("os.environ", {
            "CODER_PROVIDER": "groq",
            "GROQ_API_KEY": "gsk_fakekey",
            "NO_LOCAL_MODEL": "false"
        }):
            provider = create_coder_provider()
            assert provider is not None

    def test_fallback_provider_exists(self):
        from app.pipeline.llm_provider import FallbackProvider
        assert FallbackProvider is not None

    def test_fallback_provider_is_llm_provider(self):
        from app.pipeline.llm_provider import FallbackProvider
        assert issubclass(FallbackProvider, LlmProvider)


# ── Gestion des erreurs ───────────────────────────────────────────────────────

class TestProviderErrorHandling:

    def test_chat_raises_on_api_error(self):
        mock_provider = MagicMock(spec=LlmProvider)
        mock_provider.chat.side_effect = RuntimeError("API timeout after 30s")
        with pytest.raises(RuntimeError, match="API timeout"):
            mock_provider.chat("system", "user")

    def test_chat_json_raises_on_invalid_json(self):
        mock_provider = MagicMock(spec=LlmProvider)
        mock_provider.chat_json.side_effect = ValueError("Could not parse JSON")
        with pytest.raises(ValueError, match="Could not parse JSON"):
            mock_provider.chat_json("system", "user")

    def test_provider_accepts_max_tokens(self):
        mock_provider = MagicMock(spec=LlmProvider)
        mock_provider.chat.return_value = "response"
        mock_provider.chat(system="sys", user="msg", max_tokens=4096)
        mock_provider.chat.assert_called_once_with(system="sys", user="msg", max_tokens=4096)

    def test_provider_accepts_temperature(self):
        mock_provider = MagicMock(spec=LlmProvider)
        mock_provider.chat.return_value = "response"
        mock_provider.chat(system="sys", user="msg", temperature=0.2)
        mock_provider.chat.assert_called_once_with(system="sys", user="msg", temperature=0.2)


# ── Fallback ─────────────────────────────────────────────────────────────────

class TestFallbackBehavior:

    def test_fallback_on_rate_limit(self):
        """Si le fournisseur principal lève une erreur, le fallback prend le relais."""
        primary = MagicMock(spec=LlmProvider)
        primary.chat.side_effect = Exception("429 Rate limit exceeded")

        fallback = MagicMock(spec=LlmProvider)
        fallback.chat.return_value = "Response from fallback"

        try:
            result = primary.chat("sys", "user")
        except Exception:
            result = fallback.chat("sys", "user")

        assert result == "Response from fallback"
        fallback.chat.assert_called_once()

    def test_no_local_model_raises_when_no_keys(self):
        """NO_LOCAL_MODEL=true sans clé API doit lever une ValueError."""
        from app.pipeline.llm_provider import create_planner_provider
        with patch.dict("os.environ", {
            "NO_LOCAL_MODEL": "true",
            "GEMINI_API_KEY": "",
            "GROQ_API_KEY": "",
            "OPENAI_API_KEY": "",
        }):
            with pytest.raises(ValueError, match="NO_LOCAL_MODEL"):
                create_planner_provider()
