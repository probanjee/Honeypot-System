"""
Unit and integration tests for PostgreSQL Transactional Outbox Worker
"""

import pytest
from datetime import datetime, timezone, timedelta
import uuid
from sqlalchemy import select

from src.models.attack import Attack, EnrichedOutbox
from src.outbox import OutboxPublisher
from tests.conftest import MockKafkaProducer


@pytest.mark.asyncio
async def test_outbox_successful_publishing(test_db_session):
    producer = MockKafkaProducer()
    publisher = OutboxPublisher(producer=producer, worker_id="worker-1", batch_size=10)

    # 1. Create dummy Attack and Outbox record
    attack_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    attack = Attack(
        id=attack_id,
        mongo_raw_id="mongo_outbox_test",
        timestamp=now,
        ingested_at=now,
        source_ip="198.51.100.1",
        source_port=123,
        is_private_ip=False,
        http_method="GET",
        request_path="/",
        protocol="HTTP/1.1",
        primary_category="TEST",
        severity_score=10,
        severity_level="LOW",
        detection_summary={},
        processing_metadata={},
        schema_version="1.0.0"
    )
    test_db_session.add(attack)
    await test_db_session.flush()

    outbox_id = uuid.uuid4()
    outbox = EnrichedOutbox(
        id=outbox_id,
        event_id=attack_id,
        topic="enriched-attacks",
        payload={"event_id": str(attack_id), "status": "enriched"},
        publish_status="PENDING",
        created_at=now
    )
    test_db_session.add(outbox)
    await test_db_session.commit()

    # 2. Process batch
    published_count = await publisher.process_batch(test_db_session)
    assert published_count == 1

    # 3. Verify in producer
    assert len(producer.published_messages) == 1
    assert producer.published_messages[0]["topic"] == "enriched-attacks"
    assert producer.published_messages[0]["key"] == str(attack_id)

    # 4. Verify in database
    refreshed = await test_db_session.get(EnrichedOutbox, outbox_id)
    assert refreshed.publish_status == "PUBLISHED"
    assert refreshed.published_at is not None
    assert refreshed.retry_count == 0


@pytest.mark.asyncio
async def test_outbox_transient_failure_and_retry(test_db_session):
    producer = MockKafkaProducer()
    producer.fail_publish = True  # Trigger broker connection failure
    publisher = OutboxPublisher(producer=producer, worker_id="worker-1", max_retries=3)

    attack_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    attack = Attack(
        id=attack_id,
        mongo_raw_id="mongo_transient",
        timestamp=now,
        ingested_at=now,
        source_ip="198.51.100.2",
        source_port=80,
        is_private_ip=False,
        http_method="GET",
        request_path="/",
        protocol="HTTP/1.1",
        primary_category="TEST",
        severity_score=20,
        severity_level="LOW",
        detection_summary={},
        processing_metadata={},
        schema_version="1.0.0"
    )
    test_db_session.add(attack)
    await test_db_session.flush()

    outbox_id = uuid.uuid4()
    outbox = EnrichedOutbox(
        id=outbox_id,
        event_id=attack_id,
        topic="enriched-attacks",
        payload={"event_id": str(attack_id)},
        publish_status="PENDING",
        created_at=now
    )
    test_db_session.add(outbox)
    await test_db_session.commit()

    # Attempt 1: fails
    published_count = await publisher.process_batch(test_db_session)
    assert published_count == 0

    refreshed = await test_db_session.get(EnrichedOutbox, outbox_id)
    assert refreshed.publish_status == "PENDING"  # Re-queued for next attempt
    assert refreshed.retry_count == 1
    assert "Simulated Kafka Broker Unavailability" in refreshed.last_error

    # Attempt 2: fails
    await publisher.process_batch(test_db_session)
    refreshed2 = await test_db_session.get(EnrichedOutbox, outbox_id)
    assert refreshed2.retry_count == 2
    assert refreshed2.publish_status == "PENDING"

    # Attempt 3: exceeds max_retries=3 -> permanently marked FAILED
    await publisher.process_batch(test_db_session)
    refreshed3 = await test_db_session.get(EnrichedOutbox, outbox_id)
    assert refreshed3.retry_count == 3
    assert refreshed3.publish_status == "FAILED"


@pytest.mark.asyncio
async def test_outbox_reclaims_abandoned_worker_claim(test_db_session):
    producer = MockKafkaProducer()
    # claim_timeout_seconds = 30
    publisher = OutboxPublisher(producer=producer, worker_id="worker-healthy", claim_timeout_seconds=30)

    attack_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    attack = Attack(
        id=attack_id,
        mongo_raw_id="mongo_abandoned",
        timestamp=now,
        ingested_at=now,
        source_ip="198.51.100.3",
        source_port=80,
        is_private_ip=False,
        http_method="GET",
        request_path="/",
        protocol="HTTP/1.1",
        primary_category="TEST",
        severity_score=20,
        severity_level="LOW",
        detection_summary={},
        processing_metadata={},
        schema_version="1.0.0"
    )
    test_db_session.add(attack)
    await test_db_session.flush()

    outbox_id = uuid.uuid4()
    # Record was claimed 2 minutes ago by a dead worker
    two_minutes_ago = now - timedelta(minutes=2)
    outbox = EnrichedOutbox(
        id=outbox_id,
        event_id=attack_id,
        topic="enriched-attacks",
        payload={"event_id": str(attack_id)},
        publish_status="CLAIMED",
        claimed_at=two_minutes_ago,
        claimed_by="crashed-worker-99",
        created_at=two_minutes_ago
    )
    test_db_session.add(outbox)
    await test_db_session.commit()

    # Process batch with healthy worker: should reclaim abandoned claim
    published = await publisher.process_batch(test_db_session)
    assert published == 1

    refreshed = await test_db_session.get(EnrichedOutbox, outbox_id)
    assert refreshed.publish_status == "PUBLISHED"
    assert refreshed.claimed_by == "worker-healthy"
