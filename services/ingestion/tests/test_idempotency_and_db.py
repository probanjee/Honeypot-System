"""
Integration & Unit tests for PostgreSQL Schema, Idempotent INSERTs, and Relational Constraints
"""

import pytest
from datetime import datetime, timezone
import uuid
from sqlalchemy import select, delete
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.exc import IntegrityError

from src.models.attack import Attack, AttackSignature, ThreatActor, EnrichedOutbox


@pytest.mark.asyncio
async def test_canonical_attack_insertion(test_db_session):
    event_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    attack = Attack(
        id=event_id,
        mongo_raw_id="mongo_obj_123",
        timestamp=now,
        ingested_at=now,
        source_ip="203.0.113.195",
        source_port=44332,
        is_private_ip=False,
        http_method="POST",
        request_path="/admin/login",
        protocol="HTTP/1.1",
        primary_category="AUTH_BYPASS",
        severity_score=90,
        severity_level="CRITICAL",
        user_agent="curl/7.68.0",
        detection_summary={"rule_count": 1},
        processing_metadata={"service": "test"},
        geo_country="Netherlands",
        geo_country_code="NL",
        geo_city="Amsterdam",
        geoip_status="ENRICHED",
        schema_version="1.0.0"
    )
    test_db_session.add(attack)
    await test_db_session.commit()

    # Query back
    stmt = select(Attack).where(Attack.id == event_id)
    result = await test_db_session.execute(stmt)
    retrieved = result.scalar_one()

    assert retrieved.id == event_id
    assert retrieved.primary_category == "AUTH_BYPASS"
    assert retrieved.severity_score == 90
    assert retrieved.geo_country_code == "NL"


@pytest.mark.asyncio
async def test_idempotent_on_conflict_do_nothing(test_db_session):
    event_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    values = {
        "id": event_id,
        "mongo_raw_id": "mongo_obj_abc",
        "timestamp": now,
        "ingested_at": now,
        "source_ip": "198.51.100.5",
        "source_port": 8080,
        "is_private_ip": False,
        "http_method": "GET",
        "request_path": "/test",
        "protocol": "HTTP/1.1",
        "primary_category": "PROBING",
        "severity_score": 30,
        "severity_level": "LOW",
        "detection_summary": {},
        "processing_metadata": {},
        "geo_country": "Unknown",
        "geo_country_code": "XX",
        "geo_city": "Unknown",
        "geoip_status": "UNAVAILABLE",
        "schema_version": "1.0.0"
    }

    # 1. First insert: should insert 1 row
    stmt1 = sqlite_insert(Attack).values(**values).on_conflict_do_nothing(index_elements=[Attack.id])
    res1 = await test_db_session.execute(stmt1)
    await test_db_session.commit()
    assert res1.rowcount == 1

    # 2. Duplicate insert with identical event_id: should insert 0 rows
    stmt2 = sqlite_insert(Attack).values(**values).on_conflict_do_nothing(index_elements=[Attack.id])
    res2 = await test_db_session.execute(stmt2)
    await test_db_session.commit()
    assert res2.rowcount == 0

    # 3. Verify exactly one record exists in database
    count_stmt = select(Attack).where(Attack.id == event_id)
    result = await test_db_session.execute(count_stmt)
    assert len(list(result.scalars().all())) == 1


@pytest.mark.asyncio
async def test_attack_signature_uniqueness_constraint(test_db_session):
    attack_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    attack = Attack(
        id=attack_id,
        mongo_raw_id="mongo_obj_sig",
        timestamp=now,
        ingested_at=now,
        source_ip="198.51.100.10",
        source_port=1234,
        is_private_ip=False,
        http_method="GET",
        request_path="/",
        protocol="HTTP/1.1",
        primary_category="TEST",
        severity_score=10,
        severity_level="INFORMATIONAL",
        detection_summary={},
        processing_metadata={},
        schema_version="1.0.0"
    )
    test_db_session.add(attack)
    await test_db_session.flush()

    sig1 = AttackSignature(
        id=uuid.uuid4(),
        attack_id=attack_id,
        signature_id="SIG-001",
        rule_name="Test Rule 1",
        category="TEST",
        weight=10
    )
    test_db_session.add(sig1)
    await test_db_session.commit()

    # Attempt to insert identical (attack_id, signature_id) -> must violate unique constraint
    sig2 = AttackSignature(
        id=uuid.uuid4(),
        attack_id=attack_id,
        signature_id="SIG-001",
        rule_name="Duplicate Rule",
        category="TEST",
        weight=10
    )
    test_db_session.add(sig2)
    with pytest.raises(IntegrityError):
        await test_db_session.commit()

    await test_db_session.rollback()


@pytest.mark.asyncio
async def test_foreign_key_cascade_deletion(test_db_session):
    attack_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    attack = Attack(
        id=attack_id,
        mongo_raw_id="mongo_obj_cascade",
        timestamp=now,
        ingested_at=now,
        source_ip="198.51.100.20",
        source_port=80,
        is_private_ip=False,
        http_method="GET",
        request_path="/cascade",
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

    sig = AttackSignature(
        id=uuid.uuid4(),
        attack_id=attack_id,
        signature_id="SIG-CASCADE",
        rule_name="Cascade Rule",
        category="TEST",
        weight=20
    )
    test_db_session.add(sig)

    outbox = EnrichedOutbox(
        id=uuid.uuid4(),
        event_id=attack_id,
        topic="enriched-attacks",
        payload={"event_id": str(attack_id)},
        publish_status="PENDING"
    )
    test_db_session.add(outbox)
    await test_db_session.commit()

    # Delete the parent attack record
    await test_db_session.delete(attack)
    await test_db_session.commit()

    # Verify signature and outbox were cascaded
    sig_res = await test_db_session.execute(select(AttackSignature).where(AttackSignature.attack_id == attack_id))
    assert len(list(sig_res.scalars().all())) == 0

    outbox_res = await test_db_session.execute(select(EnrichedOutbox).where(EnrichedOutbox.event_id == attack_id))
    assert len(list(outbox_res.scalars().all())) == 0


@pytest.mark.asyncio
async def test_threat_actor_set_null_on_delete(test_db_session):
    actor_id = uuid.uuid4()
    actor = ThreatActor(
        id=actor_id,
        actor_name="APT-TEST-ENTITY",
        threat_type="NATION_STATE_SIMULATION",
        attribution_confidence="MEDIUM",
        attribution_notes="Attribution based on distinct heuristic patterns; not verified human actor."
    )
    test_db_session.add(actor)
    await test_db_session.flush()

    attack_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    attack = Attack(
        id=attack_id,
        mongo_raw_id="mongo_actor_test",
        timestamp=now,
        ingested_at=now,
        source_ip="203.0.113.88",
        source_port=443,
        is_private_ip=False,
        http_method="POST",
        request_path="/api/exec",
        protocol="HTTP/1.1",
        primary_category="EXPLOITATION",
        severity_score=95,
        severity_level="CRITICAL",
        threat_actor_id=actor_id,
        detection_summary={},
        processing_metadata={},
        schema_version="1.0.0"
    )
    test_db_session.add(attack)
    await test_db_session.commit()

    # Delete the threat actor
    await test_db_session.delete(actor)
    await test_db_session.commit()

    # Verify attack record still exists and threat_actor_id was set to NULL
    refreshed_attack = await test_db_session.get(Attack, attack_id)
    assert refreshed_attack is not None
    assert refreshed_attack.threat_actor_id is None
