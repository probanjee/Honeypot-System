"""
Kafka Event Schemas for Backend Streaming Consumer (Phase 5)
Strictly validates enriched attack events received from the `enriched-attacks` Kafka topic.
"""

from typing import List, Dict, Any, Optional, Literal
from datetime import datetime
import uuid
from pydantic import BaseModel, Field, field_validator
from .attacks import AttackListItemResponse


class MatchedRule(BaseModel):
    rule_id: str
    rule_name: str
    category: str
    weight: int = Field(default=0, ge=0, le=100)


class SourceMetadata(BaseModel):
    ip: str
    port: int = Field(default=0, ge=0, le=65535)
    is_private: Optional[bool] = None


class DetectionMetadata(BaseModel):
    severity_score: int = Field(ge=0, le=100)
    severity_level: Literal["INFORMATIONAL", "LOW", "MEDIUM", "HIGH", "CRITICAL"]
    matched_rules: List[MatchedRule] = Field(default_factory=list)


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


class EnrichedAttackEvent(BaseModel):
    """
    Kafka event contract payload for `enriched-attacks`.
    Guarantees compatibility with Phase 3 Ingestion Service outbox records.
    """
    event_id: str
    mongo_raw_id: str
    schema_version: Literal["1.0.0"] = "1.0.0"
    timestamp: datetime
    ingested_at: datetime
    event_type: Literal["ATTACK_ENRICHED"] = "ATTACK_ENRICHED"
    source: SourceMetadata
    geo: GeoMetadata = Field(default_factory=GeoMetadata)
    threat_intel: ThreatIntelMetadata = Field(default_factory=ThreatIntelMetadata)
    detection: DetectionMetadata
    request: RequestMetadata
    primary_category: str
    geoip_status: str = "UNAVAILABLE"

    @field_validator("event_id")
    @classmethod
    def validate_uuid(cls, v: str) -> str:
        try:
            uuid.UUID(v)
            return v
        except ValueError:
            raise ValueError(f"event_id '{v}' is not a valid UUID format")

    def to_sse_payload(self) -> Dict[str, Any]:
        """
        Converts the canonical enriched event into the public AttackListItemResponse representation.
        Ensures exact schema consistency between SSE streaming events and REST query responses.
        """
        validated_item = AttackListItemResponse(
            id=uuid.UUID(self.event_id),
            timestamp=self.timestamp,
            ingested_at=self.ingested_at,
            source_ip=self.source.ip,
            source_port=self.source.port,
            is_private_ip=bool(self.source.is_private),
            http_method=self.request.method,
            request_path=self.request.path,
            protocol=self.request.protocol,
            primary_category=self.primary_category,
            severity_score=self.detection.severity_score,
            severity_level=self.detection.severity_level,
            geo_country=self.geo.country,
            geo_country_code=self.geo.country_code,
            geo_city=self.geo.city,
            geo_latitude=self.geo.latitude,
            geo_longitude=self.geo.longitude,
            geoip_status=self.geoip_status
        )
        return validated_item.model_dump(mode="json")
