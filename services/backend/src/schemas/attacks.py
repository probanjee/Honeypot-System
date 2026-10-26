"""
Pydantic Schemas for Attack Records and Signature Associations
"""

import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional, Literal
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict, field_validator


class AttackSignatureResponse(BaseModel):
    id: uuid.UUID
    signature_id: str
    rule_name: str
    category: str
    weight: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AttackListItemResponse(BaseModel):
    id: uuid.UUID
    timestamp: datetime
    ingested_at: datetime
    source_ip: str
    source_port: int
    is_private_ip: bool
    http_method: str
    request_path: str
    protocol: str
    primary_category: str
    severity_score: int
    severity_level: Literal["INFORMATIONAL", "LOW", "MEDIUM", "HIGH", "CRITICAL"]
    geo_country: str
    geo_country_code: str
    geo_city: str
    geoip_status: str

    model_config = ConfigDict(from_attributes=True)


class AttackDetailResponse(AttackListItemResponse):
    user_agent: Optional[str] = None
    detection_summary: Dict[str, Any] = Field(default_factory=dict)
    processing_metadata: Dict[str, Any] = Field(default_factory=dict)
    geo_latitude: Optional[float] = None
    geo_longitude: Optional[float] = None
    threat_actor_id: Optional[uuid.UUID] = None
    mongo_raw_id: str
    schema_version: str
    signatures: List[AttackSignatureResponse] = Field(default_factory=list)

    @field_validator("geo_latitude", "geo_longitude", mode="before")
    @classmethod
    def convert_decimal_to_float(cls, v):
        if v is not None and isinstance(v, (Decimal, str)):
            return float(v)
        return v

    model_config = ConfigDict(from_attributes=True)


class AttackFilterParams(BaseModel):
    limit: int = Field(default=20, ge=1, le=100)
    cursor: Optional[str] = None
    severity: Optional[Literal["INFORMATIONAL", "LOW", "MEDIUM", "HIGH", "CRITICAL"]] = None
    min_score: Optional[int] = Field(default=None, ge=0, le=100)
    max_score: Optional[int] = Field(default=None, ge=0, le=100)
    signature: Optional[str] = None
    source_ip: Optional[str] = None
    country: Optional[str] = Field(default=None, max_length=2)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    sort: Literal["desc", "asc"] = "desc"

    @field_validator("country")
    @classmethod
    def uppercase_country(cls, v: Optional[str]) -> Optional[str]:
        return v.upper() if v else None
