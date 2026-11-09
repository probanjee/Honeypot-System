"""
Tests for Summary Analytics Endpoints and SQL Aggregations
"""

import pytest


@pytest.mark.asyncio
async def test_analytics_summary_with_seed_data(async_client, seed_attacks):
    response = await async_client.get("/api/v1/analytics/summary?window=24h")
    assert response.status_code == 200
    data = response.json()

    assert data["total_attacks"] == 15
    assert data["distinct_sources_count"] == 5
    assert len(data["severity_breakdown"]) > 0

    # Top categories
    assert len(data["top_categories"]) > 0
    categories = [c["category"] for c in data["top_categories"]]
    assert "SQL_INJECTION" in categories

    # Top countries (must exclude 'XX' and 'Unknown')
    country_codes = [k["country_code"] for k in data["top_countries"]]
    assert "XX" not in country_codes
    assert len(country_codes) > 0

    # Top signatures
    assert len(data["top_signatures"]) > 0
    assert data["time_window"]["window_label"] == "24h"


@pytest.mark.asyncio
async def test_analytics_summary_empty_database(async_client):
    response = await async_client.get("/api/v1/analytics/summary?window=1h")
    assert response.status_code == 200
    data = response.json()

    assert data["total_attacks"] == 0
    assert data["distinct_sources_count"] == 0
    assert data["severity_breakdown"] == {}
    assert data["top_categories"] == []
    assert data["top_signatures"] == []
    assert data["top_countries"] == []
