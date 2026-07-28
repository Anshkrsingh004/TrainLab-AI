"""Tests for the health check and root endpoints.

These run without a live database: the health endpoint's DB ping is best-effort,
so it returns 200 with ``database`` set to either "ok" or "down".
"""

from fastapi.testclient import TestClient


def test_health_returns_ok(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "TrainLab AI"
    assert data["version"] == "0.1.0"
    assert data["database"] in {"ok", "down"}


def test_root_returns_metadata(client: TestClient) -> None:
    response = client.get("/")
    assert response.status_code == 200

    data = response.json()
    assert data["service"] == "TrainLab AI"
    assert data["health"] == "/api/v1/health"
