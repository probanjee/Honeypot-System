"""
Server-Sent Events (SSE) Live Attack Stream Endpoint
Delivers near-real-time attack notifications over persistent HTTP streaming.
"""

from typing import Optional, Any
from fastapi import APIRouter, Depends, Header, Request
from fastapi.responses import StreamingResponse

from ...database import get_session_factory
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
    session_factory: Any = Depends(get_session_factory),
    broadcaster: SSEBroadcaster = Depends(get_event_broadcaster)
) -> StreamingResponse:
    # 1. Materialize historical replay items in a transient, short-lived session (if requested)
    replayed_events = []
    if last_event_id:
        async with session_factory() as session:
            replayed_events = await broadcaster.fetch_replay_events(session, last_event_id)

    # 2. Stream without retaining any open database session
    generator = broadcaster.stream_for_client(
        request=request,
        initial_events=replayed_events
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
