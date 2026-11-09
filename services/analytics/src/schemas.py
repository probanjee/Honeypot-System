"""
VIGILANCE Analytics Event Schemas (Phase 6)
Validates consumed enriched attack envelopes and defines outgoing AnomalyAlertEvent.
Adheres to JSON Schema Draft 7 and docs/api/event-schemas.md.
"""

from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Literal
from uuid import UUID, uuid4
from pydantic import BaseModel, Field, ConfigDict


class AttackDetectionRule(BaseModel):
    rule_id: str
    rule_name: str
    category: str
    weight: int


class DetectionSummary(BaseModel):
    severity_score: int
    severity_level: Literal["INFORMATIONAL", "LOW", "MEDIUM", "HIGH", "CRITICAL"]
    matched_rules: List[AttackDetectionRule] = Field(default_factory=list)


class AttackSource(BaseModel):
    ip: str
    port: int = 0
    is_private: bool = False


class EnrichedAttackEvent(BaseModel):
    """Event consumed from Kafka topic `enriched-attacks`."""
    event_id: UUID
    mongo_raw_id: str
    schema_version: Literal["1.0.0"] = "1.0.0"
    timestamp: datetime
    event_type: Literal["ATTACK_ENRICHED"] = "ATTACK_ENRICHED"
    source: AttackSource
    detection: DetectionSummary
    request: Dict[str, Any] = Field(default_factory=dict)
    geo: Optional[Dict[str, Any]] = None
    threat_intel: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(extra="ignore")


class AnomalyAlertEvent(BaseModel):
    """
    Alert published to Kafka topic `alerts`.
    Conforms to docs/api/event-schemas.md (#3. Schema: alerts Event).
    """
    alert_id: UUID = Field(default_factory=uuid4)
    schema_version: Literal["1.0.0"] = "1.0.0"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    alert_type: Literal["TRAFFIC_VOLUME_SPIKE", "SEVERITY_SHIFT", "REPEATED_SOURCE_FLOOD"] = "TRAFFIC_VOLUME_SPIKE"
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = "HIGH"
    metric: str = "events_per_minute"
    observed_value: float
    baseline_median: float
    mad: float
    modified_z_score: float
    threshold: float
    window_size_minutes: int
    explanation: str

    model_config = ConfigDict(extra="forbid")

