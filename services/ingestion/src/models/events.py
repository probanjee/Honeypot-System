"""
Pydantic Schemas for VIGILANCE Event Contracts (Draft 7, schema_version 1.0.0)
Specification: docs/api/event-schemas.md
"""

from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
import uuid


class MatchedRule(BaseModel):
    rule_id: str
    rule_name: str
    category: str
    weight: int = Field(ge=0, le=100)


class SourceMetadata(BaseModel):
    ip: str
    port: int = Field(default=0, ge=0, le=65535)
    is_private: Optional[bool] = None


class DetectionMetadata(BaseModel):
    severity_score: int = Field(ge=0, le=100)
    severity_level: Literal["INFORMATIONAL", "LOW", "MEDIUM", "HIGH", "CRITICAL"]
    matched_rules: List[MatchedRule]


class RequestMetadata(BaseModel):
    method: str
    path: str
    protocol: str = "HTTP/1.1"
    headers: Dict[str, Any] = Field(default_factory=dict)
    raw_payload: Optional[str] = None
    truncated: bool = False
    user_agent: Optional[str] = None


class GeoMetadata(BaseModel):
    country: str = "Unknown"
    country_code: str = "XX"
    city: str = "Unknown"
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class ThreatIntelMetadata(BaseModel):
    provider: str = "None"
    threat_score: Optional[int] = None
    is_known_attacker: bool = False
    status: Literal["ENRICHED", "CACHED", "SKIPPED_PRIVATE", "UNAVAILABLE"] = "UNAVAILABLE"


# ── 1. Input Event Envelope: raw-attacks ─────────────────────────────────────
class RawAttackEvent(BaseModel):
    event_id: str
    mongo_raw_id: str
    schema_version: Literal["1.0.0"] = "1.0.0"
    timestamp: datetime
    event_type: Literal["RAW_ATTACK_DETECTED"] = "RAW_ATTACK_DETECTED"
    source: SourceMetadata
    detection: DetectionMetadata
    request: RequestMetadata

    @field_validator("event_id")
    @classmethod
    def validate_uuid(cls, v: str) -> str:
        try:
            uuid.UUID(v)
            return v
        except ValueError:
            raise ValueError(f"event_id '{v}' is not a valid UUID format")


# ── 2. Output Event Envelope: enriched-attacks ───────────────────────────────
class EnrichedAttackEvent(BaseModel):
    event_id: str
    mongo_raw_id: str
    schema_version: Literal["1.0.0"] = "1.0.0"
    timestamp: datetime
    ingested_at: datetime
    event_type: Literal["ATTACK_ENRICHED"] = "ATTACK_ENRICHED"
    source: SourceMetadata
    geo: GeoMetadata
    threat_intel: ThreatIntelMetadata
    detection: DetectionMetadata
    request: RequestMetadata
    primary_category: str
    geoip_status: str = "UNAVAILABLE"
