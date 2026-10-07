import pytest
import sys
import os
from unittest.mock import AsyncMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../../services/backend"))

from fastapi.testclient import TestClient
from app.factory import create_app
from app.core.database import get_db
from app.api.attacks import repo

@pytest.fixture
def client():
    # Mock the AttackRepository methods to avoid real database queries
    repo.get_attacks_with_filters = AsyncMock(return_value=([], 0))
    repo.get_attack_by_id = AsyncMock(return_value=None)
    
    app = create_app()
    # Clear all startup events to prevent connecting to Kafka or database
    app.router.on_startup.clear()
    
    # Override get_db to return a dummy async mock session
    async def mock_get_db():
        yield AsyncMock()
    app.dependency_overrides[get_db] = mock_get_db
    
    return TestClient(app)

def test_get_attacks_empty(client):
    response = client.get("/api/v1/attacks/")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data

def test_mitigate_attack(client):
    response = client.post("/api/v1/attacks/mitigate?ip=1.2.3.4")
    assert response.status_code == 200
    assert response.json()["status"] == "success"
