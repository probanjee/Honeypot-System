"""
Tests for Attack Queries, Filters, Details, and Signature Endpoints
"""

import pytest
import uuid


@pytest.mark.asyncio
async def test_filter_by_severity_level(async_client, seed_attacks):
    response = await async_client.get("/api/v1/attacks?severity=CRITICAL")
    assert response.status_code == 200
    data = response.json()
    items = data["items"]
    assert len(items) > 0
    for item in items:
        assert item["severity_level"] == "CRITICAL"


@pytest.mark.asyncio
async def test_filter_by_score_range(async_client, seed_attacks):
    response = await async_client.get("/api/v1/attacks?min_score=50&max_score=70")
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) > 0
    for item in items:
        assert 50 <= item["severity_score"] <= 70


@pytest.mark.asyncio
async def test_filter_by_country_code(async_client, seed_attacks):
    # Test case insensitive
    response = await async_client.get("/api/v1/attacks?country=us")
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) > 0
    for item in items:
        assert item["geo_country_code"] == "US"


@pytest.mark.asyncio
async def test_filter_by_source_ip(async_client, seed_attacks):
    target_ip = seed_attacks[0].source_ip
    response = await async_client.get(f"/api/v1/attacks?source_ip={target_ip}")
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) > 0
    for item in items:
        assert item["source_ip"] == target_ip


@pytest.mark.asyncio
async def test_get_attack_details_success(async_client, seed_attacks):
    target = seed_attacks[0]
    response = await async_client.get(f"/api/v1/attacks/{target.id}")
    assert response.status_code == 200
    data = response.json()

    assert data["id"] == str(target.id)
    assert data["source_ip"] == target.source_ip
    assert data["primary_category"] == target.primary_category
    assert data["severity_score"] == target.severity_score
    assert len(data["signatures"]) > 0
    assert data["signatures"][0]["signature_id"] == "SIG-RULE-00"


@pytest.mark.asyncio
async def test_get_attack_details_not_found(async_client):
    random_id = uuid.uuid4()
    response = await async_client.get(f"/api/v1/attacks/{random_id}")
    assert response.status_code == 404
    assert f"'{random_id}' not found" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_attack_details_invalid_uuid(async_client):
    response = await async_client.get("/api/v1/attacks/not-a-valid-uuid")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_attack_signatures_endpoint(async_client, seed_attacks):
    target = seed_attacks[1]
    response = await async_client.get(f"/api/v1/attacks/{target.id}/signatures")
    assert response.status_code == 200
    sigs = response.json()
    assert isinstance(sigs, list)
    assert len(sigs) == 1
    assert sigs[0]["signature_id"] == "SIG-RULE-01"


@pytest.mark.asyncio
async def test_get_attack_signatures_not_found(async_client):
    random_id = uuid.uuid4()
    response = await async_client.get(f"/api/v1/attacks/{random_id}/signatures")
    assert response.status_code == 404
