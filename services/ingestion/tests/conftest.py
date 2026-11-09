"""
Pytest Fixtures for VIGILANCE Ingestion Service Tests (Phase 3)
"""

import asyncio
from datetime import datetime, timezone
from typing import AsyncGenerator, Dict, Any, List
import uuid
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

from src.models.base import Base
from src.models.attack import Attack, AttackSignature, ThreatActor, SystemMetric, EnrichedOutbox
from src.kafka.producer import KafkaEventProducer
from src.kafka.consumer import KafkaEventConsumer
from src.geoip.service import GeoIPService


class MockKafkaProducer:
    """In-memory mock Kafka producer recording published events."""
    def __init__(self):
        self.published_messages: List[Dict[str, Any]] = []
        self.fail_publish = False

    async def start(self):
        pass

    async def stop(self):
        pass

    async def publish(self, topic: str, key: str, payload: Dict[str, Any]):
        if self.fail_publish:
            raise ConnectionError("Simulated Kafka Broker Unavailability")
        msg = {
            "topic": topic,
            "key": key,
            "payload": payload,
            "timestamp": datetime.now(timezone.utc)
        }
        self.published_messages.append(msg)
        return type("RecordMetadata", (), {"partition": 0, "offset": len(self.published_messages)})()


class MockConsumerRecord:
    def __init__(self, value: Dict[str, Any], key: str = "", offset: int = 0):
        self.value = value
        self.key = key.encode("utf-8") if key else None
        self.offset = offset


class MockKafkaConsumer:
    """In-memory mock Kafka consumer feeding controlled message batches."""
    def __init__(self, initial_records: List[Dict[str, Any]] = None):
        self.records: List[MockConsumerRecord] = [
            MockConsumerRecord(r, offset=i) for i, r in enumerate(initial_records or [])
        ]
        self.committed = False
        self.committed_offset = -1
        self.topic = "raw-attacks"

    async def start(self):
        pass

    async def stop(self):
        pass

    async def fetch_batch(self, max_records: int = 20, timeout_ms: int = 1000):
        batch = self.records[:max_records]
        self.records = self.records[max_records:]
        return batch

    async def commit(self):
        self.committed = True


@pytest.fixture
async def test_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provides an isolated in-memory SQLite database session with full schema initialized."""
    test_engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False
    )

    from sqlalchemy import event
    @event.listens_for(test_engine.sync_engine, "connect")
    def enable_sqlite_fk(dbapi_con, con_record):
        cursor = dbapi_con.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(
        bind=test_engine,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
        class_=AsyncSession
    )

    async with session_factory() as session:
        yield session

    await test_engine.dispose()


@pytest.fixture
def mock_producer() -> MockKafkaProducer:
    return MockKafkaProducer()


@pytest.fixture
def mock_geoip_service() -> GeoIPService:
    # Service with mock public IP resolution
    override = {
        "8.8.8.8": {
            "country": "United States",
            "country_code": "US",
            "city": "Mountain View",
            "latitude": 37.4056,
            "longitude": -122.0775,
            "threat_score": 10
        }
    }
    return GeoIPService(enabled=True, override_lookup=override)


@pytest.fixture
def valid_raw_attack_dict() -> Dict[str, Any]:
    event_id = str(uuid.uuid4())
    return {
        "event_id": event_id,
        "mongo_raw_id": "671aa5f1234567890abcdef1",
        "schema_version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_type": "RAW_ATTACK_DETECTED",
        "source": {
            "ip": "8.8.8.8",
            "port": 54321
        },
        "detection": {
            "severity_score": 75,
            "severity_level": "HIGH",
            "matched_rules": [
                {
                    "rule_id": "SQLI-001",
                    "rule_name": "SQL Injection in Query Param",
                    "category": "SQL_INJECTION",
                    "weight": 80
                },
                {
                    "rule_id": "PROBE-002",
                    "rule_name": "Database Error Probing",
                    "category": "PROBING",
                    "weight": 40
                }
            ]
        },
        "request": {
            "method": "GET",
            "path": "/api/users?id=1%20UNION%20SELECT%20null,username,password%20FROM%20users",
            "protocol": "HTTP/1.1",
            "headers": {"host": "localhost:3000", "user-agent": "sqlmap/1.7#dev"},
            "raw_payload": None,
            "truncated": False,
            "user_agent": "sqlmap/1.7#dev"
        }
    }
