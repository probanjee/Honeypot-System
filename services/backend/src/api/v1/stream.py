"""
Server-Sent Events (SSE) Live Attack Stream Endpoint
Delivers near-real-time attack notifications over persistent HTTP streaming.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Header, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ...database import get_db
from ...services.sse_broadcaster import SSEBroadcaster
from ..dependencies import get_event_broadcaster

router = APIRouter(prefix="/attacks", tags=["Streaming"])


@router.get(
    "/stream",
    response_class=StreamingResponse,
    summary="Live Attack Event Stream (SSE)",
    description=(
        "Persistent text/event-stream delivering newly persisted attack events to the SOC dashboard. "
        "Supports native browser reconnection and replay via the Last-Event-ID header."
    )
)
async def stream_attack_events(
    request: Request,
    last_event_id: Optional[str] = Header(None, alias="Last-Event-ID"),
    db: AsyncSession = Depends(get_db),
    broadcaster: SSEBroadcaster = Depends(get_event_broadcaster)
) -> StreamingResponse:
    generator = broadcaster.stream_for_client(
        request=request,
        db_session=db,
        last_event_id=last_event_id
    )

    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Content-Type": "text/event-stream"
        }
    )
