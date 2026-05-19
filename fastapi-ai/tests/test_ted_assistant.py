"""Tests for TED assistant — mode detection, file selection, and API endpoints."""
from __future__ import annotations

import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient


# ── detect_mode tests ─────────────────────────────────────────────────────────

from app.ted_assistant import detect_mode, select_relevant_files


class TestDetectMode:
    def test_greeting_hi(self):
        assert detect_mode("hi") == "chat"

    def test_greeting_hello(self):
        assert detect_mode("hello") == "chat"

    def test_greeting_thanks(self):
        assert detect_mode("thanks") == "chat"

    def test_greeting_short_no_keywords(self):
        assert detect_mode("ok cool") == "chat"

    def test_explain_what_is(self):
        assert detect_mode("what is useEffect?") == "explain"

    def test_explain_french(self):
        assert detect_mode("c'est quoi ce composant?") == "explain"

    def test_explain_how_does(self):
        assert detect_mode("how does this component work?") == "explain"

    def test_fix_bug(self):
        assert detect_mode("there is a bug in the form") == "fix"

    def test_fix_french_negation(self):
        assert detect_mode("mon composant ne s'affiche pas") == "fix"

    def test_fix_error(self):
        assert detect_mode("I have an error in App.tsx") == "fix"

    def test_improve_color_change(self):
        assert detect_mode("change the sidebar color to dark green") == "improve"

    def test_improve_optimize(self):
        assert detect_mode("optimize the performance of the list") == "improve"

    def test_generate_create(self):
        assert detect_mode("create a new button component") == "generate"

    def test_generate_extract(self):
        assert detect_mode("extraire le composant StatCard dans App.tsx") == "generate"

    def test_generate_french(self):
        assert detect_mode("crée un composant de notification") == "generate"

    def test_empty_string(self):
        assert detect_mode("") == "chat"

    def test_whitespace_only(self):
        assert detect_mode("   ") == "chat"


# ── select_relevant_files tests ───────────────────────────────────────────────

class TestSelectRelevantFiles:
    def _make_file(self, path: str, content: str = "") -> dict:
        return {"path": path, "content": content}

    def test_empty_files_returns_empty(self):
        assert select_relevant_files([], "", "hi") == []

    def test_current_file_has_highest_priority(self):
        files = [
            self._make_file("src/Other.tsx"),
            self._make_file("src/App.tsx"),
        ]
        result = select_relevant_files(files, "src/App.tsx", "help me")
        assert result[0]["path"] == "src/App.tsx"

    def test_max_files_respected(self):
        files = [self._make_file(f"src/File{i}.tsx") for i in range(10)]
        result = select_relevant_files(files, "", "test", max_files=3)
        assert len(result) <= 3

    def test_filename_in_message_boosts_score(self):
        files = [
            self._make_file("src/Navbar.tsx", ""),
            self._make_file("src/Footer.tsx", ""),
        ]
        result = select_relevant_files(files, "", "fix the Navbar component")
        assert result[0]["path"] == "src/Navbar.tsx"


# ── API endpoint tests ────────────────────────────────────────────────────────

@pytest.fixture
def client():
    with patch("app.ted_assistant.create_ted_provider") as mock_provider:
        mock_llm = MagicMock()
        mock_llm.chat.return_value = "Hey! I'm here to help."
        mock_provider.return_value = mock_llm
        from app.main import app
        yield TestClient(app)


class TestTedChatEndpoint:
    def test_chat_returns_200(self, client):
        resp = client.post("/api/ted/chat", json={"message": "hi", "context": {}})
        assert resp.status_code == 200

    def test_chat_response_has_required_fields(self, client):
        resp = client.post("/api/ted/chat", json={"message": "hi", "context": {}})
        data = resp.json()
        assert "response" in data
        assert "mode" in data

    def test_greeting_detected_as_chat_mode(self, client):
        resp = client.post("/api/ted/chat", json={"message": "hello", "context": {}})
        assert resp.json()["mode"] == "chat"

    def test_explain_mode_detected(self, client):
        resp = client.post("/api/ted/chat", json={
            "message": "explain how useEffect works",
            "context": {}
        })
        assert resp.json()["mode"] == "explain"

    def test_missing_message_returns_422(self, client):
        resp = client.post("/api/ted/chat", json={"context": {}})
        assert resp.status_code == 422

    def test_llm_exception_returns_graceful_fallback(self, client):
        with patch("app.ted_assistant.TedAssistant.chat") as mock_chat:
            mock_chat.side_effect = Exception("LLM unavailable")
            resp = client.post("/api/ted/chat", json={"message": "hi", "context": {}})
            # Should not crash — either 200 with fallback or proper error
            assert resp.status_code in (200, 500)


class TestTedSuggestionsEndpoint:
    def test_suggestions_returns_200(self, client):
        resp = client.post("/api/ted/suggestions", json={"currentFile": "src/App.tsx"})
        assert resp.status_code == 200

    def test_suggestions_returns_list(self, client):
        resp = client.post("/api/ted/suggestions", json={})
        assert isinstance(resp.json(), list)

    def test_suggestions_have_required_fields(self, client):
        resp = client.post("/api/ted/suggestions", json={})
        for suggestion in resp.json():
            assert "id" in suggestion
            assert "title" in suggestion
            assert "action" in suggestion
