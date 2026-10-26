"""
Tests for Keyset / Cursor Pagination Mechanics, Deterministic Ordering, and HMAC Tamper Detection
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from src.core.security import encode_cursor, decode_cursor, InvalidCursorException
from src.config import settings


def test_cursor_encoding_and_decoding():
    now = datetime(2026, 10, 26, 3, 0, 0, tzinfo=timezone.utc)
    rec_id = uuid.uuid4()
    secret = "test-secret-key-123"

    token = encode_cursor(now, rec_id, secret)
    assert isinstance(token, str)
    assert "." in token

    decoded_ts, decoded_id = decode_cursor(token, secret)
    assert decoded_ts == now
    assert decoded_id == rec_id


def test_tampered_cursor_payload_rejected():
    now = datetime.now(timezone.utc)
    rec_id = uuid.uuid4()
    secret = "test-secret-key-123"

    token = encode_cursor(now, rec_id, secret)
    b64_payload, b64_sig = token.split(".")

    # Tamper with the payload (e.g. modify first character)
    tampered_payload = ("A" if b64_payload[0] != "A" else "B") + b64_payload[1:]
    tampered_token = f"{tampered_payload}.{b64_sig}"

    with pytest.raises(InvalidCursorException) as exc_info:
        decode_cursor(tampered_token, secret)
    assert "signature verification failed" in str(exc_info.value)


def test_tampered_cursor_signature_rejected():
    now = datetime.now(timezone.utc)
    rec_id = uuid.uuid4()
    secret = "test-secret-key-123"

    token = encode_cursor(now, rec_id, secret)
    b64_payload, b64_sig = token.split(".")

    # Tamper with signature
    tampered_sig = ("X" if b64_sig[0] != "X" else "Y") + b64_sig[1:]
    tampered_token = f"{b64_payload}.{tampered_sig}"

    with pytest.raises(InvalidCursorException):
        decode_cursor(tampered_token, secret)


def test_wrong_secret_rejected():
    now = datetime.now(timezone.utc)
    rec_id = uuid.uuid4()

    token = encode_cursor(now, rec_id, "secret-one")
    with pytest.raises(InvalidCursorException):
        decode_cursor(token, "secret-two")


@pytest.mark.asyncio
async def test_api_keyset_cursor_pagination_flow(async_client, seed_attacks):
    """
    Verifies full multi-page forward traversal over 15 seed attacks with limit=5.
    Ensures zero duplicate records and zero skipped records across page boundaries.
    """
    seen_ids = set()
    page_count = 0
    cursor = None
    has_more = True

    while has_more:
        page_count += 1
        url = "/api/v1/attacks?limit=5"
        if cursor:
            url += f"&cursor={cursor}"

        response = await async_client.get(url)
        assert response.status_code == 200
        data = response.json()

        items = data["items"]
        assert len(items) <= 5

        # Check for duplicates across pages
        for item in items:
            item_id = item["id"]
            assert item_id not in seen_ids, f"Duplicate item {item_id} encountered on page {page_count}"
            seen_ids.add(item_id)

        has_more = data["has_more"]
        cursor = data["next_cursor"]

        if has_more:
            assert cursor is not None
        else:
            assert cursor is None

    assert page_count == 3  # 15 items with limit 5 should take exactly 3 pages
    assert len(seen_ids) == 15


@pytest.mark.asyncio
async def test_pagination_repeated_timestamps_handled_deterministically(async_client, seed_attacks):
    """
    Seed attacks include items 4 and 5 with identical timestamps.
    Verify that pagination does not skip or duplicate items when timestamps match.
    """
    response = await async_client.get("/api/v1/attacks?limit=15&sort=asc")
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 15

    # Verify monotonic ordering: ts[i] <= ts[i+1]
    for i in range(len(items) - 1):
        t1 = datetime.fromisoformat(items[i]["timestamp"])
        t2 = datetime.fromisoformat(items[i + 1]["timestamp"])
        assert t1 <= t2
        if t1 == t2:
            # Tie-breaker UUID ordering
            assert items[i]["id"] <= items[i + 1]["id"]


@pytest.mark.asyncio
async def test_tampered_cursor_returns_http_400(async_client):
    response = await async_client.get("/api/v1/attacks?cursor=invalid.tampered.token")
    assert response.status_code == 400
    assert "Invalid pagination cursor" in response.json()["detail"]


@pytest.mark.asyncio
async def test_invalid_limit_bounds_rejected(async_client):
    # limit > 100
    res_large = await async_client.get("/api/v1/attacks?limit=101")
    assert res_large.status_code == 422

    # limit < 1
    res_zero = await async_client.get("/api/v1/attacks?limit=0")
    assert res_zero.status_code == 422
