"""
Pytest Fixtures for FastAPI Backend Tests (Phase 4)
Provides an isolated in-memory SQLite database, seed data helpers, and async HTTP test clients.
"""

import sys
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import AsyncGenerator, List, Dict, Any
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool
from sqlalchemy import event

# Add service directory to sys.path
backend_root = os.path.dirname(os.path.dirname(__file__))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from src.models.base import Base
from src.models.attack import Attack, AttackSignature, ThreatActor
from src.database import get_db
from src.main import app
from src.config import settings


@pytest.fixture
async def test_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provides an isolated in-memory SQLite database session with full schema initialized."""
    test_engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False
    )

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
async def async_client(test_db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP test client with database dependency override."""
    async def override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client

    app.dependency_overrides.clear()


@pytest.fixture
async def seed_attacks(test_db_session: AsyncSession) -> List[Attack]:
    """Seeds a controlled set of 15 attacks across multiple categories, countries, and severities."""
    base_time = datetime.now(timezone.utc) - timedelta(hours=3)
    attacks = []

    severities = ["LOW", "MEDIUM", "HIGH", "CRITICAL", "INFORMATIONAL"]
    categories = ["SQL_INJECTION", "COMMAND_INJECTION", "PROBING", "AUTH_BYPASS", "BRUTE_FORCE"]
    countries = [("US", "United States"), ("DE", "Germany"), ("NL", "Netherlands"), ("XX", "Unknown"), ("GB", "United Kingdom")]

    for i in range(15):
        attack_id = uuid.uuid4()
        ts = base_time + timedelta(minutes=i * 5)
        # Introduce a repeated timestamp for tie-breaker pagination testing
        if i == 5:
            ts = base_time + timedelta(minutes=4 * 5)

        country_code, country_name = countries[i % len(countries)]
        attack = Attack(
            id=attack_id,
            mongo_raw_id=f"mongo_raw_{i:03d}",
            timestamp=ts,
            ingested_at=ts + timedelta(seconds=1),
            source_ip=f"198.51.100.{10 + (i % 5)}",
            source_port=50000 + i,
            is_private_ip=(country_code == "XX"),
            http_method="POST" if i % 2 == 0 else "GET",
            request_path=f"/decoy/endpoint/{i}",
            protocol="HTTP/1.1",
            primary_category=categories[i % len(categories)],
            severity_score=20 + (i * 5),
            severity_level=severities[i % len(severities)],
            user_agent=f"AttackerBot/1.{i}",
            detection_summary={"matched_count": 2},
            processing_metadata={"service": "test"},
            geo_country=country_name,
            geo_country_code=country_code,
            geo_city="Metropolis" if country_code != "XX" else "Unknown",
            geo_latitude=50.0 + i if country_code != "XX" else None,
            geo_longitude=10.0 + i if country_code != "XX" else None,
            geoip_status="ENRICHED" if country_code != "XX" else "UNAVAILABLE",
            schema_version="1.0.0"
        )
        test_db_session.add(attack)

        # Add child signatures
        sig1 = AttackSignature(
            id=uuid.uuid4(),
            attack_id=attack_id,
            signature_id=f"SIG-RULE-{i:02d}",
            rule_name=f"Signature Rule {i}",
            category=attack.primary_category,
            weight=40 + (i % 50),
            created_at=ts
        )
        test_db_session.add(sig1)
        attacks.append(attack)

    await test_db_session.commit()
    return attacks
