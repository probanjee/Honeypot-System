"""
End-to-End Pipeline & Failure Scenario Tests for Ingestion Service (Phase 3)
"""

import pytest
from datetime import datetime, timezone
import uuid
from sqlalchemy import select

from src.models.attack import Attack, AttackSignature, EnrichedOutbox
from src.service import IngestionService
from src.outbox import OutboxPublisher
from tests.conftest import MockKafkaProducer, MockKafkaConsumer


@pytest.mark.asyncio
async def test_end_to_end_successful_ingestion(test_db_session, mock_geoip_service, valid_raw_attack_dict):
    producer = MockKafkaProducer()
    consumer = MockKafkaConsumer([valid_raw_attack_dict])
    outbox_publisher = OutboxPublisher(producer=producer)

    service = IngestionService(
        consumer=consumer,
        producer=producer,
        geoip_service=mock_geoip_service,
        outbox_publisher=outbox_publisher
    )

    # Process single event inside transaction
    success, status = await service.process_single_event(valid_raw_attack_dict, test_db_session)
    await test_db_session.commit()

    assert success is True
    assert status == "PERSISTED"

    # Verify canonical Attack in DB
    event_id = uuid.UUID(valid_raw_attack_dict["event_id"])
    attack = await test_db_session.get(Attack, event_id)
    assert attack is not None
    assert attack.source_ip == "8.8.8.8"
    assert attack.primary_category == "SQL_INJECTION"
    assert attack.geo_country == "United States"
    assert attack.geo_country_code == "US"
    assert attack.geoip_status == "ENRICHED"

    # Verify signatures in DB
    sig_result = await test_db_session.execute(
        select(AttackSignature).where(AttackSignature.attack_id == event_id)
    )
    signatures = list(sig_result.scalars().all())
    assert len(signatures) == 2
    sig_ids = {s.signature_id for s in signatures}
    assert "SQLI-001" in sig_ids
    assert "PROBE-002" in sig_ids

    # Verify Outbox record in DB
    outbox_result = await test_db_session.execute(
        select(EnrichedOutbox).where(EnrichedOutbox.event_id == event_id)
    )
    outbox = outbox_result.scalar_one()
    assert outbox.publish_status == "PENDING"
    assert outbox.payload["event_id"] == valid_raw_attack_dict["event_id"]
    assert outbox.payload["geo"]["country_code"] == "US"

    # Now run outbox publisher to verify publication to enriched-attacks
    published = await outbox_publisher.process_batch(test_db_session)
    assert published == 1
    assert len(producer.published_messages) == 1
    assert producer.published_messages[0]["topic"] == "enriched-attacks"


@pytest.mark.asyncio
async def test_quarantine_malformed_event_to_dlq(test_db_session, mock_geoip_service):
    producer = MockKafkaProducer()
    consumer = MockKafkaConsumer()
    service = IngestionService(
        consumer=consumer,
        producer=producer,
        geoip_service=mock_geoip_service
    )

    malformed_event = {
        "event_id": "invalid-uuid",
        "timestamp": "not-a-timestamp",
        "detection": "missing-subfields"
    }

    success, status = await service.process_single_event(malformed_event, test_db_session)
    await test_db_session.commit()

    assert success is True
    assert status == "QUARANTINED_DLQ"

    # Verify no attack was written to DB
    all_attacks = (await test_db_session.execute(select(Attack))).scalars().all()
    assert len(all_attacks) == 0

    # Verify DLQ publication occurred
    assert len(producer.published_messages) == 1
    dlq_msg = producer.published_messages[0]
    assert dlq_msg["topic"] == "raw-attacks-dlq"
    assert "not a valid UUID format" in dlq_msg["payload"]["reason"]


@pytest.mark.asyncio
async def test_duplicate_raw_event_handling_idempotency(test_db_session, mock_geoip_service, valid_raw_attack_dict):
    producer = MockKafkaProducer()
    consumer = MockKafkaConsumer()
    service = IngestionService(
        consumer=consumer,
        producer=producer,
        geoip_service=mock_geoip_service
    )

    # Delivery 1: Should persist
    success1, status1 = await service.process_single_event(valid_raw_attack_dict, test_db_session)
    await test_db_session.commit()
    assert success1 is True
    assert status1 == "PERSISTED"

    # Delivery 2 (Duplicate redelivery of same raw event)
    success2, status2 = await service.process_single_event(valid_raw_attack_dict, test_db_session)
    await test_db_session.commit()
    assert success2 is True
    assert status2 == "DUPLICATE_SUPPRESSED"

    # Verify exactly 1 attack record and 2 signature records exist
    event_id = uuid.UUID(valid_raw_attack_dict["event_id"])
    attacks = (await test_db_session.execute(select(Attack).where(Attack.id == event_id))).scalars().all()
    assert len(attacks) == 1

    sigs = (await test_db_session.execute(select(AttackSignature).where(AttackSignature.attack_id == event_id))).scalars().all()
    assert len(sigs) == 2

    outboxes = (await test_db_session.execute(select(EnrichedOutbox).where(EnrichedOutbox.event_id == event_id))).scalars().all()
    assert len(outboxes) == 1


@pytest.mark.asyncio
async def test_failure_scenario_b_crash_recovery_after_db_commit(test_db_session, mock_geoip_service, valid_raw_attack_dict):
    """
    Scenario B: PostgreSQL commits attack & outbox, but process crashes before outbox publication.
    Recovery: New worker starts up, queries pending outbox, and publishes cleanly.
    """
    producer = MockKafkaProducer()
    service = IngestionService(producer=producer, geoip_service=mock_geoip_service)

    # 1. Ingestion persists attack & pending outbox
    success, status = await service.process_single_event(valid_raw_attack_dict, test_db_session)
    await test_db_session.commit()
    assert success is True

    # 2. Simulate process crash: service object discarded without publishing to Kafka
    del service
    assert len(producer.published_messages) == 0

    # 3. Process restart / Recovery: new outbox publisher starts
    recovery_producer = MockKafkaProducer()
    recovery_publisher = OutboxPublisher(producer=recovery_producer, worker_id="recovery-worker-1")

    # Run batch processing
    published = await recovery_publisher.process_batch(test_db_session)
    assert published == 1

    # Verify event was recovered and published
    assert len(recovery_producer.published_messages) == 1
    assert recovery_producer.published_messages[0]["topic"] == "enriched-attacks"
    assert recovery_producer.published_messages[0]["key"] == valid_raw_attack_dict["event_id"]


@pytest.mark.asyncio
async def test_failure_scenario_a_postgres_unavailable_does_not_commit_offset(mock_geoip_service, valid_raw_attack_dict):
    """
    Scenario A: Database is unavailable during processing.
    Consumer MUST NOT commit Kafka offset. Unhandled error must bubble so Kafka redelivers.
    """
    producer = MockKafkaProducer()
    consumer = MockKafkaConsumer([valid_raw_attack_dict])
    service = IngestionService(consumer=consumer, producer=producer, geoip_service=mock_geoip_service)

    # Mock a broken session that raises ConnectionRefusedError during execution
    class BrokenSession:
        async def execute(self, stmt):
            raise ConnectionRefusedError("PostgreSQL connection refused: host 127.0.0.1:5432 unreachable")
        async def commit(self):
            raise ConnectionRefusedError("PostgreSQL connection refused")
        async def rollback(self):
            pass
        @property
        def bind(self):
            return None

    broken_session = BrokenSession()

    with pytest.raises(ConnectionRefusedError):
        await service.process_single_event(valid_raw_attack_dict, broken_session)

    # Offset was NOT committed on consumer
    assert consumer.committed is False


@pytest.mark.asyncio
async def test_consumer_restart_and_uncommitted_redelivery(test_db_session, mock_geoip_service, valid_raw_attack_dict):
    """
    Failure / Recovery test: If consumer process restarts before commit, the raw event is redelivered.
    Idempotent database constraint safely absorbs redelivery without creating duplicates.
    """
    producer = MockKafkaProducer()

    # 1. First run: event processed in DB, but process is interrupted before consumer.commit()
    service1 = IngestionService(producer=producer, geoip_service=mock_geoip_service)
    success1, status1 = await service1.process_single_event(valid_raw_attack_dict, test_db_session)
    await test_db_session.commit()
    assert success1 is True
    assert status1 == "PERSISTED"

    # 2. Consumer restarts with the same uncommitted message
    consumer2 = MockKafkaConsumer([valid_raw_attack_dict])
    service2 = IngestionService(consumer=consumer2, producer=producer, geoip_service=mock_geoip_service)

    # Redelivered message is consumed
    records = await consumer2.fetch_batch(max_records=1)
    assert len(records) == 1

    success2, status2 = await service2.process_single_event(records[0].value, test_db_session)
    await test_db_session.commit()

    # Idempotently suppressed
    assert success2 is True
    assert status2 == "DUPLICATE_SUPPRESSED"

    # Now offset commits safely
    await consumer2.commit()
    assert consumer2.committed is True
