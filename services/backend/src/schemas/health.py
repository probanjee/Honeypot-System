"""
Pydantic Schemas for System and Dependency Health Reporting
"""

from datetime import datetime
from typing import Dict, Any, Optional, Literal
from pydantic import BaseModel, Field


class ComponentHealth(BaseModel):
    status: Literal["healthy", "unhealthy", "degraded", "disabled"]
    latency_ms: Optional[float] = None
    message: Optional[str] = None


class HealthResponse(BaseModel):
    status: Literal["healthy", "degraded", "unhealthy"]
    service: str
    version: str
    timestamp: datetime
    components: Dict[str, ComponentHealth] = Field(default_factory=dict)
