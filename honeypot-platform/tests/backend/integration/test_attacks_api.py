import pytest
from httpx import AsyncClient
from app.factory import create_app

@pytest.fixture
async def client():
    app = create_app()
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_get_attacks_empty(client):
    response = await client.get("/api/v1/attacks/")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data

@pytest.mark.asyncio
async def test_mitigate_attack(client):
    response = await client.post("/api/v1/attacks/mitigate?ip=1.2.3.4")
    assert response.status_code == 200
    assert response.json()["status"] == "success"
