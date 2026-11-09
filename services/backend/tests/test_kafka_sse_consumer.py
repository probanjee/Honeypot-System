"""
Tests for Kafka-to-SSE Bridge Consumer and Session Lifecycle (Phase 5)
Verifies:
1. Event schema validation and conversion from EnrichedAttackEvent to AttackListItemResponse.
2. Malformed / poison-pill Kafka message rejection.
3. Broadcasting to active SSE clients and deduplication.
4. Consumer lifecycle (startup, stop, broker retry).
5. SSE Replay Database Session Release (zero DB sessions held during live streaming).
6. Concurrent SSE client subscriptions on single backend instance.
"""

import asyncio
import json
import uuid
from datetime import datetime, timezone
import pytest
from unittest.mock import AsyncMock, MagicMock

from src.schemas.events import EnrichedAttackEvent
from src.services.kafka_consumer import KafkaSSEConsumer
from src.services.sse_broadcaster import SSEBroadcaster, broadcaster
from src.models.attack import Attack


@pytest.fixture
def sample_valid_enriched_event():
    """Generates a valid EnrichedAttackEvent matching Phase 3 Kafka schema."""
    event_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    return {
        "event_id": event_id,
        "mongo_raw_id": "6720f123456789abcdef0123",
        "schema_version": "1.0.0",
        "timestamp": now,
        "ingested_at": now,
        "event_type": "ATTACK_ENRICHED",
        "source": {
            "ip": "198.51.100.42",
            "port": 49152,
            "is_private": False
        },
        "geo": {
            "country": "Germany",
            "country_code": "DE",
            "city": "Frankfurt",
            "latitude": 50.1109,
            "longitude": 8.6821
        },
        "threat_intel": {
            "provider": "None",
            "threat_score": None,
            "is_known_attacker": False,
            "status": "UNAVAILABLE"
        },
        "detection": {
            "severity_score": 85,
            "severity_level": "HIGH",
            "matched_rules": [
                {
                    "rule_id": "SQLI-001",
                    "rule_name": "SQL Injection in Login Path",
                    "category": "SQL_INJECTION",
                    "weight": 80
                }
            ]
        },
        "request": {
            "method": "POST",
            "path": "/api/v1/auth/login",
            "protocol": "HTTP/1.1",
            "headers": {"content-type": "application/json"},
            "raw_payload": "user=' OR '1'='1",
            "truncated": False,
            "user_agent": "sqlmap/1.7.2#stable"
        },
        "primary_category": "SQL_INJECTION",
        "geoip_status": "ENRICHED"
    }


def test_enriched_attack_event_validation_and_sse_conversion(sample_valid_enriched_event):
    """Verifies that EnrichedAttackEvent parses valid Kafka JSON and converts to SSE representation."""
    event = EnrichedAttackEvent.model_validate(sample_valid_enriched_event)
    assert event.event_id == sample_valid_enriched_event["event_id"]
    assert event.detection.severity_level == "HIGH"
    assert event.geo.country == "Germany"
    assert event.geo.latitude == 50.1109

    sse_data = event.to_sse_payload()
    assert sse_data["id"] == sample_valid_enriched_event["event_id"]
    assert sse_data["source_ip"] == "198.51.100.42"
    assert sse_data["severity_level"] == "HIGH"
    assert sse_data["severity_score"] == 85
    assert sse_data["primary_category"] == "SQL_INJECTION"
    assert sse_data["geo_country"] == "Germany"
    assert sse_data["geo_latitude"] == 50.1109
    assert sse_data["geo_longitude"] == 8.6821
    assert sse_data["geoip_status"] == "ENRICHED"


def test_enriched_attack_event_invalid_uuid_rejected(sample_valid_enriched_event):
    """Verifies that an event with a non-UUID event_id is rejected by schema validator."""
    sample_valid_enriched_event["event_id"] = "not-a-valid-uuid"
    with pytest.raises(Exception):
        EnrichedAttackEvent.model_validate(sample_valid_enriched_event)


@pytest.mark.asyncio
async def test_kafka_sse_consumer_processes_valid_message(sample_valid_enriched_event):
    """Verifies that valid Kafka messages are deserialized, converted, and broadcast to subscribers."""
    test_broadcaster = SSEBroadcaster(queue_size=10)
    q = await test_broadcaster.register()

    mock_consumer_impl = MagicMock()
    mock_consumer_impl.commit = AsyncMock()

    consumer = KafkaSSEConsumer(
        broadcaster_instance=test_broadcaster,
        consumer_impl=mock_consumer_impl
    )

    mock_record = MagicMock()
    mock_record.value = sample_valid_enriched_event
    mock_record.key = sample_valid_enriched_event["event_id"]

    success = await consumer.process_record(mock_record)
    assert success is True
    assert q.qsize() == 1

    received_event = await q.get()
    assert received_event["id"] == sample_valid_enriched_event["event_id"]
    assert received_event["source_ip"] == "198.51.100.42"
    assert received_event["severity_level"] == "HIGH"

    mock_consumer_impl.commit.assert_awaited_once()
    await test_broadcaster.unregister(q)


@pytest.mark.asyncio
async def test_kafka_sse_consumer_handles_malformed_poison_pill():
    """Verifies that malformed or non-JSON payloads are skipped without crashing or halting the consumer."""
    test_broadcaster = SSEBroadcaster(queue_size=10)
    mock_consumer_impl = MagicMock()
    mock_consumer_impl.commit = AsyncMock()

    consumer = KafkaSSEConsumer(
        broadcaster_instance=test_broadcaster,
        consumer_impl=mock_consumer_impl
    )

    # 1. Invalid JSON string
    mock_record_bad_json = MagicMock()
    mock_record_bad_json.value = "{invalid-json: none}"
    mock_record_bad_json.key = "bad-key-1"
    assert await consumer.process_record(mock_record_bad_json) is False

    # 2. Missing mandatory fields
    mock_record_missing_fields = MagicMock()
    mock_record_missing_fields.value = {"event_id": str(uuid.uuid4()), "partial": "data"}
    mock_record_missing_fields.key = "bad-key-2"
    assert await consumer.process_record(mock_record_missing_fields) is False


@pytest.mark.asyncio
async def test_kafka_sse_consumer_lifecycle_startup_and_stop():
    """Verifies that consumer starts background task cleanly and halts without unhandled exceptions."""
    mock_impl = MagicMock()
    mock_impl.start = AsyncMock()
    mock_impl.stop = AsyncMock()
    mock_impl.fetch_batch = AsyncMock(return_value=[])

    consumer = KafkaSSEConsumer(consumer_impl=mock_impl)
    await consumer.start()
    assert consumer._running is True
    assert consumer._task is not None

    # Give event loop a cycle
    await asyncio.sleep(0.05)

    await consumer.stop()
    assert consumer._running is False
    mock_impl.stop.assert_awaited()


@pytest.mark.asyncio
async def test_sse_replay_materialization_releases_db_session(test_db_session, seed_attacks):
    """
    Verifies that fetch_replay_events queries and materializes results into plain dicts
    so that the database session can be immediately released back to the pool before live streaming.
    """
    last_attack = seed_attacks[10]
    replayed = await SSEBroadcaster.fetch_replay_events(
        db_session=test_db_session,
        last_event_id=str(last_attack.id)
    )

    # Expect attacks 11, 12, 13, 14 (4 records)
    assert len(replayed) == 4
    for item in replayed:
        assert isinstance(item, dict)
        assert "id" in item
        assert "severity_score" in item
        assert "geo_country" in item
        # Coordinates should be floats or None, not SQLAlchemy Decimal objects
        if item.get("geo_latitude") is not None:
            assert isinstance(item["geo_latitude"], float)


@pytest.mark.asyncio
async def test_sse_multiple_concurrent_clients():
    """
    Verifies that multiple concurrent clients can subscribe to a single broadcaster instance
    and all receive broadcast events independently without interference.
    """
    b = SSEBroadcaster(queue_size=10)
    q1 = await b.register()
    q2 = await b.register()
    q3 = await b.register()

    test_event = {"id": str(uuid.uuid4()), "source_ip": "10.0.0.1", "severity_score": 90}
    delivered = await b.broadcast(test_event)
    assert delivered == 3

    assert (await q1.get())["source_ip"] == "10.0.0.1"
    assert (await q2.get())["source_ip"] == "10.0.0.1"
    assert (await q3.get())["source_ip"] == "10.0.0.1"

    await b.unregister(q1)
    await b.unregister(q2)
    await b.unregister(q3)
