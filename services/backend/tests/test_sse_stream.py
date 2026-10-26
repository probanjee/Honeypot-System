"""
Tests for Server-Sent Events (SSE) Live Stream, Heartbeats, Reconnection, and Replay
"""

import asyncio
import pytest
import uuid
from datetime import datetime, timezone
from src.services.sse_broadcaster import SSEBroadcaster, broadcaster
from src.models.attack import Attack


def test_sse_wire_formatting():
    msg = SSEBroadcaster.format_sse_message(
        event_id="test-id-123",
        event_type="attack.created",
        data={"category": "SQL_INJECTION", "score": 90}
    )
    assert msg.startswith("id: test-id-123\n")
    assert "event: attack.created\n" in msg
    assert 'data: {"category": "SQL_INJECTION", "score": 90}\n\n' in msg

    keepalive = SSEBroadcaster.format_keepalive()
    assert keepalive == ": keepalive\n\n"


@pytest.mark.asyncio
async def test_sse_broadcaster_bounded_queue():
    """Verify that slow clients with full queues do not leak memory; oldest message is dropped."""
    b = SSEBroadcaster(queue_size=2)
    q = await b.register()

    # Push 3 messages into queue of size 2
    await b.broadcast({"msg": 1})
    await b.broadcast({"msg": 2})
    await b.broadcast({"msg": 3})

    assert q.qsize() == 2
    # First item should have been dropped (msg 1), remaining should be 2 and 3
    first = await q.get()
    second = await q.get()
    assert first["msg"] == 2
    assert second["msg"] == 3

    await b.unregister(q)


@pytest.mark.asyncio
async def test_sse_reconnection_and_replay_from_database(test_db_session, seed_attacks):
    """
    Simulates a client reconnecting with Last-Event-ID set to seed attack #10.
    The client should receive attacks #11-#14 as historical replay, followed by live events.
    """
    b = SSEBroadcaster(queue_size=10)
    last_seen_attack = seed_attacks[10]

    # Create dummy request object that stays connected for 1 iteration
    class MockRequest:
        def __init__(self):
            self.checks = 0
        async def is_disconnected(self):
            self.checks += 1
            return self.checks > 3

    mock_req = MockRequest()

    stream_gen = b.stream_for_client(
        request=mock_req,
        db_session=test_db_session,
        last_event_id=str(last_seen_attack.id)
    )

    replayed_events = []
    # Collect the replayed items
    for _ in range(4):  # Seed has 15 items (0..14), so after #10 there are 4 items (#11, #12, #13, #14)
        msg = await stream_gen.asend(None)
        replayed_events.append(msg)

    assert len(replayed_events) == 4
    for ev in replayed_events:
        assert "event: attack.created" in ev
        assert "id: " in ev

    # Verify that seed attack 14 is the last replayed event
    assert str(seed_attacks[14].id) in replayed_events[-1]


@pytest.mark.asyncio
async def test_sse_endpoint_headers(async_client):
    """Verify standard SSE response headers on stream endpoint."""
    # Start stream and read first chunk
    async with async_client.stream("GET", "/api/v1/attacks/stream") as response:
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]
        assert response.headers["cache-control"] == "no-cache"
        assert response.headers["connection"] == "keep-alive"
        assert response.headers["x-accel-buffering"] == "no"
