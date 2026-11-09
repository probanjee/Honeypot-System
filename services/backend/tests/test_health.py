"""
Tests for System Health Endpoint and Dependency Probing
"""

import pytest
from unittest.mock import patch


@pytest.mark.asyncio
async def test_health_check_healthy(async_client):
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "healthy"
    assert data["service"] == "vigilance-backend-api"
    assert data["components"]["database"]["status"] == "healthy"
    assert "latency_ms" in data["components"]["database"]
    assert data["components"]["event_broadcaster"]["status"] == "healthy"


@pytest.mark.asyncio
async def test_health_check_database_unhealthy_returns_503(async_client):
    with patch("src.api.v1.health.check_db_health", return_value=False):
        response = await async_client.get("/api/v1/health")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "unhealthy"
        assert data["components"]["database"]["status"] == "unhealthy"
