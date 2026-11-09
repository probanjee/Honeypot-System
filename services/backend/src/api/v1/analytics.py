"""
Analytics and Summary Endpoints
Calculates bounded database-side aggregations for the SOC dashboard.
"""

from datetime import datetime
from typing import Optional, Literal
from fastapi import APIRouter, Depends, Query

from ...schemas.analytics import SummaryAnalyticsResponse
from ...services.attack_service import AttackService
from ..dependencies import get_attack_service

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get(
    "/summary",
    response_model=SummaryAnalyticsResponse,
    summary="Dashboard Summary Analytics",
    description="Calculates incident volume, severity distribution, top categories, top rules, and top source countries."
)
async def get_summary_analytics(
    start_time: Optional[datetime] = Query(None, description="Start timestamp in UTC"),
    end_time: Optional[datetime] = Query(None, description="End timestamp in UTC"),
    window: Literal["1h", "24h", "7d"] = Query(
        "24h",
        description="Relative time window if start_time is omitted (1h, 24h, 7d)"
    ),
    service: AttackService = Depends(get_attack_service)
) -> SummaryAnalyticsResponse:
    return await service.get_analytics_summary(
        start_time=start_time,
        end_time=end_time,
        window=window
    )
