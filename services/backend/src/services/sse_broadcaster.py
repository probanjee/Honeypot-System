"""
Server-Sent Events (SSE) Broadcaster
Manages per-client bounded streaming queues, heartbeat keepalives,
Last-Event-ID database replay, and seamless transition to live delivery.
"""

import asyncio
import json
import uuid
from collections import deque
from datetime import datetime, timezone
from typing import AsyncGenerator, Dict, Any, Optional, Set
import structlog
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..repositories.attack_repo import AttackRepository
from ..schemas.attacks import AttackListItemResponse

logger = structlog.get_logger(__name__)


class SSEBroadcaster:
    """
    Central in-memory subscription hub for SSE connections.
    Distributes newly persisted attacks to all active client queues.
    """
    def __init__(self, queue_size: Optional[int] = None):
        self.queue_size = queue_size or settings.sse_client_queue_size
        self._subscribers: Set[asyncio.Queue] = set()
        self._lock = asyncio.Lock()
        self._running = True
        self._kafka_task: Optional[asyncio.Task] = None

    async def start(self) -> None:
        """Start background consumer task if Kafka is configured."""
        self._running = True
        logger.info("sse_broadcaster_started")

    async def stop(self) -> None:
        """Stops broadcaster and cancels any running listeners."""
        self._running = False
        if self._kafka_task and not self._kafka_task.done():
            self._kafka_task.cancel()
            try:
                await self._kafka_task
            except asyncio.CancelledError:
                pass

        async with self._lock:
            self._subscribers.clear()
        logger.info("sse_broadcaster_stopped")

    async def register(self) -> asyncio.Queue:
        """Registers a new client and returns its bounded private queue."""
        q = asyncio.Queue(maxsize=self.queue_size)
        async with self._lock:
            self._subscribers.add(q)
        logger.debug("sse_client_registered", active_subscribers=len(self._subscribers))
        return q

    async def unregister(self, q: asyncio.Queue) -> None:
        """Unregisters a client queue upon disconnection."""
        async with self._lock:
            self._subscribers.discard(q)
        logger.debug("sse_client_unregistered", active_subscribers=len(self._subscribers))

    async def broadcast(self, event_data: Dict[str, Any]) -> int:
        """
        Pushes a new attack event to all connected clients.
        If a client queue is full, drops oldest message to prevent slow-client memory leaks.
        """
        async with self._lock:
            subscribers = list(self._subscribers)

        delivered = 0
        for q in subscribers:
            try:
                if q.full():
                    try:
                        q.get_nowait()  # Drop oldest
                    except asyncio.QueueEmpty:
                        pass
                q.put_nowait(event_data)
                delivered += 1
            except Exception as exc:
                logger.warning("sse_queue_push_failed", error=str(exc))

        return delivered

    @staticmethod
    def format_sse_message(event_id: str, event_type: str, data: Dict[str, Any]) -> str:
        """Encodes an event into standard SSE wire format."""
        json_data = json.dumps(data, default=str)
        return f"id: {event_id}\nevent: {event_type}\ndata: {json_data}\n\n"

    @staticmethod
    def format_keepalive() -> str:
        """Keepalive comment line to prevent reverse-proxy timeouts."""
        return ": keepalive\n\n"

    async def stream_for_client(
        self,
        request: Request,
        db_session: AsyncSession,
        last_event_id: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        SSE Generator for an individual HTTP client connection.
        Handles:
        1. Last-Event-ID historical replay from PostgreSQL.
        2. Bounded deduplication buffer across replay-to-live handoff.
        3. Periodic keepalive heartbeats.
        4. Graceful cancellation and cleanup upon client disconnection.
        """
        client_queue = await self.register()
        recent_seen_ids: deque = deque(maxlen=500)
        seen_set: Set[str] = set()

        def mark_seen(eid: str) -> bool:
            """Returns True if event was not previously seen; records it in bounded buffer."""
            if eid in seen_set:
                return False
            if len(recent_seen_ids) == recent_seen_ids.maxlen:
                oldest = recent_seen_ids.popleft()
                seen_set.discard(oldest)
            recent_seen_ids.append(eid)
            seen_set.add(eid)
            return True

        repo = AttackRepository(db_session)

        try:
            # ── 1. Replay Phase (if Last-Event-ID provided) ─────────────────────
            if last_event_id:
                try:
                    last_uuid = uuid.UUID(last_event_id.strip())
                    last_attack = await repo.get_by_id(last_uuid)
                    if last_attack:
                        replayed_attacks = await repo.get_attacks_after(
                            since_timestamp=last_attack.timestamp,
                            since_id=last_attack.id,
                            limit=settings.sse_replay_max_records
                        )
                        for attack in replayed_attacks:
                            eid_str = str(attack.id)
                            mark_seen(eid_str)
                            item_data = AttackListItemResponse.model_validate(attack).model_dump(mode="json")
                            yield self.format_sse_message(
                                event_id=eid_str,
                                event_type="attack.created",
                                data=item_data
                            )
                except Exception as exc:
                    logger.warning("sse_replay_failed", last_event_id=last_event_id, error=str(exc))

            # ── 2. Live Stream Phase with Heartbeats ───────────────────────────
            while True:
                if await request.is_disconnected():
                    logger.info("sse_client_disconnected_detected")
                    break

                try:
                    # Wait for live event or heartbeat timeout
                    event_data = await asyncio.wait_for(
                        client_queue.get(),
                        timeout=settings.sse_heartbeat_interval_seconds
                    )

                    eid_str = str(event_data.get("id") or event_data.get("event_id"))
                    # Deduplicate in case event arrived during replay
                    if mark_seen(eid_str):
                        yield self.format_sse_message(
                            event_id=eid_str,
                            event_type="attack.created",
                            data=event_data
                        )
                except asyncio.TimeoutError:
                    # Send periodic keepalive comment to maintain connection
                    yield self.format_keepalive()

        except asyncio.CancelledError:
            logger.info("sse_client_connection_cancelled")
        finally:
            await self.unregister(client_queue)


# Global broadcaster instance
broadcaster = SSEBroadcaster()
