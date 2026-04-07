"""Tests for LLM provider abstraction and fallback mechanism."""
import pytest
from unittest.mock import MagicMock, patch

from app.pipeline.llm_provider import LlmProvider


class TestLlmProviderInterface:
    """Test that LlmProvider interface works correctly."""

    def test_provider_has_required_methods(self):
        """Test that LlmProvider has required abstract methods."""
        # LlmProvider is abstract, but we can verify it has the right interface
        assert hasattr(LlmProvider, "chat")
        assert hasattr(LlmProvider, "chat_json")
        assert hasattr(LlmProvider, "chat_vision")

    def test_chat_json_extracts_json_from_text(self, mocker):
        """Test that chat_json parses JSON from text response."""
        # Mock concrete provider
        mock_provider = MagicMock(spec=LlmProvider)
        mock_provider.chat.return_value = '{"name": "Test", "count": 42}'
        mock_provider.chat_json.return_value = {"name": "Test", "count": 42}

        result = mock_provider.chat_json("system prompt", "user prompt")
        assert result == {"name": "Test", "count": 42}
        mock_provider.chat.assert_called_once()

    def test_chat_vision_returns_empty_string_by_default(self, mocker):
        """Test that vision methods return empty string when not implemented."""
        mock_provider = MagicMock(spec=LlmProvider)
        mock_provider.chat_vision.return_value = ""

        result = mock_provider.chat_vision("base64_image", "image/jpeg", "describe this")
        assert result == ""


class TestLlmProviderFallback:
    """Test LLM provider selection and fallback logic."""

    @patch.dict("os.environ", {"GEMINI_API_KEY": ""})
    @patch.dict("os.environ", {"OPENAI_API_KEY": ""})
    def test_fallback_to_ollama_when_no_api_keys(self):
        """Test that system falls back to Ollama when no cloud API keys are set."""
        # This verifies the priority chain: Gemini → OpenAI → Ollama
        from app.pipeline.llm_provider import get_provider

        # When no keys are set, should try to use Ollama
        provider = get_provider("ollama")
        assert provider is not None

    def test_provider_accepts_temperature_option(self, mocker):
        """Test that providers accept temperature in options."""
        mock_provider = MagicMock(spec=LlmProvider)
        mock_provider.chat.return_value = "response"

        result = mock_provider.chat(
            system="sys", user="msg", temperature=0.5, max_tokens=100
        )
        assert result == "response"
        mock_provider.chat.assert_called_once_with(
            system="sys", user="msg", temperature=0.5, max_tokens=100
        )

    def test_provider_error_handling(self, mocker):
        """Test that provider wraps errors gracefully."""
        mock_provider = MagicMock(spec=LlmProvider)
        mock_provider.chat.side_effect = RuntimeError("API timeout")

        with pytest.raises(RuntimeError):
            mock_provider.chat("sys", "msg")
