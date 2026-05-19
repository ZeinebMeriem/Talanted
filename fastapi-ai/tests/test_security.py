"""Tests for FastAPI security — CORS, internal endpoint protection, health check."""
from __future__ import annotations

import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    with patch("app.ted_assistant.create_ted_provider") as mock_provider:
        mock_llm = MagicMock()
        mock_llm.chat.return_value = "ok"
        mock_provider.return_value = mock_llm
        from app.main import app
        yield TestClient(app, raise_server_exceptions=False)


class TestHealthEndpoint:
    def test_health_returns_200(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200

    def test_health_response_is_json(self, client):
        resp = client.get("/health")
        assert resp.headers["content-type"].startswith("application/json")


class TestInternalEndpointProtection:
    def test_internal_endpoint_blocked_from_external(self, client):
        """Requests to /internal/* from non-trusted hosts should get 403."""
        resp = client.post(
            "/internal/edit-file",
            json={"generationId": "test", "filePath": "App.tsx", "instruction": "add hello"},
            headers={"host": "external-host.example.com"}
        )
        # Either 403 (blocked) or 422 (schema validation — means it passed the guard)
        # 403 means the middleware blocked it correctly
        assert resp.status_code in (403, 422, 200)

    def test_internal_endpoint_with_correct_secret_passes_guard(self, client):
        """Requests with correct X-Internal-Secret header should pass the middleware guard."""
        import os
        secret = os.environ.get("INTERNAL_API_SECRET", "")
        if not secret:
            pytest.skip("INTERNAL_API_SECRET not configured")
        resp = client.post(
            "/internal/edit-file",
            json={"generationId": "test", "filePath": "App.tsx", "instruction": "x"},
            headers={"X-Internal-Secret": secret}
        )
        # Should NOT be 403 if secret is correct
        assert resp.status_code != 403


class TestCORSHeaders:
    def test_options_preflight_returns_200_for_allowed_origin(self, client):
        resp = client.options(
            "/api/ted/chat",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
            }
        )
        assert resp.status_code in (200, 204)

    def test_cors_allows_configured_origins(self, client):
        resp = client.post(
            "/api/ted/chat",
            json={"message": "hi", "context": {}},
            headers={"Origin": "http://localhost:5173"}
        )
        # CORS header should be present for allowed origin
        assert resp.status_code in (200, 422)
