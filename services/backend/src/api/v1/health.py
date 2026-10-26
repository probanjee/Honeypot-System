"""
Health Check Route
Evaluates service liveness and upstream dependency health (PostgreSQL & Event Broadcaster).
"""

from datetime import datetime, timezone
import time
from fastapi import APIRouter, Depends, status, Response
from sqlalchemy.ext.asyncio import AsyncSession

from ...config import settings
from ...database import get_db, check_db_health
from ...schemas.health import HealthResponse, ComponentHealth
from ..dependencies import get_event_broadcaster
from ...services.sse_broadcaster import SSEBroadcaster

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Service and Dependency Health Check",
    description="Returns detailed health status of the API and its database connection."
)
async def get_health(
    response: Response,
    db: AsyncSession = Depends(get_db),
    broadcaster: SSEBroadcaster = Depends(get_event_broadcaster)
) -> HealthResponse:
    now = datetime.now(timezone.utc)
    components = {}

    # Probe Database Connectivity
    start_t = time.perf_counter()
    is_db_healthy = await check_db_health(db)
    db_latency = (time.perf_counter() - start_t) * 1000.0

    if is_db_healthy:
        components["database"] = ComponentHealth(
            status="healthy",
            latency_ms=round(db_latency, 2),
            message="PostgreSQL connection responsive"
        )
    else:
        components["database"] = ComponentHealth(
            status="unhealthy",
            latency_ms=round(db_latency, 2),
            message="PostgreSQL ping query failed or timed out"
        )

    # Check SSE Broadcaster state
    broadcaster_running = getattr(broadcaster, "_running", True)
    components["event_broadcaster"] = ComponentHealth(
        status="healthy" if broadcaster_running else "degraded",
        message="In-memory SSE broadcast hub active"
    )

    # Determine overall status
    if not is_db_healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        overall_status = "unhealthy"
    else:
        overall_status = "healthy"

    return HealthResponse(
        status=overall_status,
        service=settings.service_name,
        version=settings.service_version,
        timestamp=now,
        components=components
    )
