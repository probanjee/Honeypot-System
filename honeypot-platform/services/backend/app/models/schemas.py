from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional, Dict, Any


class AttackBase(BaseModel):
    source_ip: str
    source_port: int
    protocol: str
    attack_type: str
    payload: str
    severity: int
    geo_country: Optional[str] = None
    geo_city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    headers: Optional[Dict[str, Any]] = None
    signatures: Optional[List[str]] = None


class AttackCreate(AttackBase):
    timestamp: datetime


class AttackResponse(AttackBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True


class AttackList(BaseModel):
    items: List[AttackResponse]
    total: int


class WebSocketMessage(BaseModel):
    event: str
    data: Dict[str, Any]


class AlertSchema(BaseModel):
    attack_id: Optional[int] = None
    source_ip: str
    attack_type: str
    severity: int
    message: str
    timestamp: datetime
