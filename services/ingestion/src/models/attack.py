"""
SQLAlchemy Models for VIGILANCE Canonical Relational Store
Specification: docs/database/schema.md & ADR-001/ADR-002
"""

import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from decimal import Decimal

from sqlalchemy import (
    String, Integer, Boolean, Text, DateTime, Numeric, JSON,
    ForeignKey, UniqueConstraint, Index, func
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.types import TypeDecorator, CHAR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


# Cross-platform UUID type decorator (native UUID on PostgreSQL, CHAR(36) on SQLite)
class GUID(TypeDecorator):
    impl = CHAR(36)
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, uuid.UUID):
            return str(value) if dialect.name != "postgresql" else value
        return str(uuid.UUID(str(value))) if dialect.name != "postgresql" else uuid.UUID(str(value))

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(str(value))


# ── 1. Canonical Attacks Table ────────────────────────────────────────────────
class Attack(Base):
    __tablename__ = "attacks"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True)
    mongo_raw_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    ingested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=func.now())
    source_ip: Mapped[str] = mapped_column(String(45), nullable=False, index=True)
    source_port: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_private_ip: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    http_method: Mapped[str] = mapped_column(String(10), nullable=False)
    request_path: Mapped[str] = mapped_column(Text, nullable=False)
    protocol: Mapped[str] = mapped_column(String(20), nullable=False, default="HTTP/1.1")
    primary_category: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    severity_score: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    severity_level: Mapped[str] = mapped_column(String(20), nullable=False)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    detection_summary: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    processing_metadata: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    
    # GeoIP Enrichment fields
    geo_country: Mapped[str] = mapped_column(String(100), default="Unknown")
    geo_country_code: Mapped[str] = mapped_column(String(2), default="XX", index=True)
    geo_city: Mapped[str] = mapped_column(String(100), default="Unknown")
    geo_latitude: Mapped[Optional[Decimal]] = mapped_column(Numeric(9, 6), nullable=True)
    geo_longitude: Mapped[Optional[Decimal]] = mapped_column(Numeric(9, 6), nullable=True)
    geoip_status: Mapped[str] = mapped_column(String(30), nullable=False, default="UNAVAILABLE")

    # Threat Actor attribution reference (optional, explicitly decoupled from IP identity)
    threat_actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(), ForeignKey("threat_actors.id", ondelete="SET NULL"), nullable=True
    )
    schema_version: Mapped[str] = mapped_column(String(10), nullable=False, default="1.0.0")

    # Relationships
    signatures: Mapped[List["AttackSignature"]] = relationship(
        "AttackSignature", back_populates="attack", cascade="all, delete-orphan", lazy="selectin"
    )
    threat_actor: Mapped[Optional["ThreatActor"]] = relationship("ThreatActor", back_populates="attacks")

    __table_args__ = (
        Index("idx_attacks_timestamp_desc", timestamp.desc()),
        Index("idx_attacks_source_ip_ts", source_ip, timestamp.desc()),
    )


# ── 2. Attack Signatures (Granular Matched Rules) ──────────────────────────────
class AttackSignature(Base):
    __tablename__ = "attack_signatures"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    attack_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("attacks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    signature_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    rule_name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    weight: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())

    attack: Mapped["Attack"] = relationship("Attack", back_populates="signatures")

    __table_args__ = (
        UniqueConstraint("attack_id", "signature_id", name="uq_attack_signatures_attack_rule"),
    )


# ── 3. Threat Actors (Attribution Groups) ──────────────────────────────────────
class ThreatActor(Base):
    __tablename__ = "threat_actors"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    actor_name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    threat_type: Mapped[str] = mapped_column(String(50), nullable=False, default="UNKNOWN")
    attribution_confidence: Mapped[str] = mapped_column(String(20), nullable=False, default="LOW")
    attribution_notes: Mapped[str] = mapped_column(Text, nullable=False)
    first_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())

    attacks: Mapped[List["Attack"]] = relationship("Attack", back_populates="threat_actor")


# ── 4. System Metrics (Operational Aggregations) ───────────────────────────────
class SystemMetric(Base):
    __tablename__ = "system_metrics"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    metric_name: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    metric_grain: Mapped[str] = mapped_column(String(20), nullable=False, default="1m")
    window_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    metric_value: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    labels: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())

    __table_args__ = (
        UniqueConstraint("metric_name", "metric_grain", "window_start", name="uq_system_metrics_window"),
    )


# ── 5. Enriched Outbox (Transactional Outbox for enriched-attacks) ─────────────
class EnrichedOutbox(Base):
    __tablename__ = "enriched_outbox"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("attacks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    topic: Mapped[str] = mapped_column(String(64), nullable=False, default="enriched-attacks")
    payload: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    publish_status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING", index=True)
    claimed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    claimed_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_enriched_outbox_status_ts", "publish_status", "created_at"),
    )
