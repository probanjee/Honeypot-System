"""
Unit tests for VIGILANCE Event Schemas and Normalization (Draft 7 / Pydantic v2)
"""

import pytest
from pydantic import ValidationError
from datetime import datetime, timezone
import uuid

from src.models.events import RawAttackEvent, EnrichedAttackEvent, GeoMetadata, ThreatIntelMetadata


def test_valid_raw_attack_event_parsing(valid_raw_attack_dict):
    event = RawAttackEvent.model_validate(valid_raw_attack_dict)
    assert event.event_id == valid_raw_attack_dict["event_id"]
    assert event.detection.severity_score == 75
    assert event.detection.severity_level == "HIGH"
    assert len(event.detection.matched_rules) == 2
    assert event.schema_version == "1.0.0"


def test_invalid_uuid_rejected(valid_raw_attack_dict):
    valid_raw_attack_dict["event_id"] = "not-a-valid-uuid"
    with pytest.raises(ValidationError) as exc_info:
        RawAttackEvent.model_validate(valid_raw_attack_dict)
    assert "not a valid UUID format" in str(exc_info.value)


def test_severity_score_bounds_validation(valid_raw_attack_dict):
    # Score > 100 must fail
    valid_raw_attack_dict["detection"]["severity_score"] = 101
    with pytest.raises(ValidationError):
        RawAttackEvent.model_validate(valid_raw_attack_dict)

    # Score < 0 must fail
    valid_raw_attack_dict["detection"]["severity_score"] = -1
    with pytest.raises(ValidationError):
        RawAttackEvent.model_validate(valid_raw_attack_dict)


def test_severity_level_enum_validation(valid_raw_attack_dict):
    valid_raw_attack_dict["detection"]["severity_level"] = "CATASTROPHIC"
    with pytest.raises(ValidationError):
        RawAttackEvent.model_validate(valid_raw_attack_dict)


def test_matched_rule_weight_bounds(valid_raw_attack_dict):
    valid_raw_attack_dict["detection"]["matched_rules"][0]["weight"] = 150
    with pytest.raises(ValidationError):
        RawAttackEvent.model_validate(valid_raw_attack_dict)


def test_enriched_attack_event_envelope(valid_raw_attack_dict):
    raw = RawAttackEvent.model_validate(valid_raw_attack_dict)
    now = datetime.now(timezone.utc)
    enriched = EnrichedAttackEvent(
        event_id=raw.event_id,
        mongo_raw_id=raw.mongo_raw_id,
        schema_version="1.0.0",
        timestamp=raw.timestamp,
        ingested_at=now,
        event_type="ATTACK_ENRICHED",
        source=raw.source,
        geo=GeoMetadata(country="United States", country_code="US", city="Mountain View"),
        threat_intel=ThreatIntelMetadata(status="ENRICHED", provider="StaticOverride"),
        detection=raw.detection,
        request=raw.request,
        primary_category="SQL_INJECTION",
        geoip_status="ENRICHED"
    )

    data = enriched.model_dump(mode="json")
    assert data["event_type"] == "ATTACK_ENRICHED"
    assert data["geo"]["country_code"] == "US"
    assert data["primary_category"] == "SQL_INJECTION"
    assert data["geoip_status"] == "ENRICHED"
