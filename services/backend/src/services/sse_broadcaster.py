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
from typing import AsyncGenerator, Dict, Any, Optional, Set, List
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

    @staticmethod
    async def fetch_replay_events(
        db_session: AsyncSession,
        last_event_id: str
    ) -> List[Dict[str, Any]]:
        """
        Queries historical events for Last-Event-ID replay and materializes the result set.
        Executed in a transient, short-lived DB transaction so connections are not held open.
        """
        try:
            last_uuid = uuid.UUID(last_event_id.strip())
            repo = AttackRepository(db_session)
            last_attack = await repo.get_by_id(last_uuid)
            if not last_attack:
                return []
            replayed_attacks = await repo.get_attacks_after(
                since_timestamp=last_attack.timestamp,
                since_id=last_attack.id,
                limit=settings.sse_replay_max_records
            )
            return [
                AttackListItemResponse.model_validate(attack).model_dump(mode="json")
                for attack in replayed_attacks
            ]
        except Exception as exc:
            logger.warning("sse_replay_query_failed", last_event_id=last_event_id, error=str(exc))
            return []

    async def stream_for_client(
        self,
        request: Request,
        db_session: Optional[AsyncSession] = None,
        last_event_id: Optional[str] = None,
        initial_events: Optional[List[Dict[str, Any]]] = None
    ) -> AsyncGenerator[str, None]:
        """
        SSE Generator for an individual HTTP client connection.
        Handles:
        1. Last-Event-ID historical replay (materialized and yielded before live loop).
        2. Bounded deduplication buffer across replay-to-live handoff.
        3. Periodic keepalive heartbeats.
        4. Graceful cancellation and cleanup upon client disconnection.
        5. Zero DB sessions held during live stream.
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

        # ── 1. Replay Phase: materialize replayed items and yield ───────────
        replayed_items: List[Dict[str, Any]] = []
        if initial_events is not None:
            replayed_items = initial_events
        elif last_event_id and db_session is not None:
            replayed_items = await self.fetch_replay_events(db_session, last_event_id)

        disconnect_task = asyncio.create_task(request.is_disconnected())

        try:
            for item_data in replayed_items:
                eid_str = str(item_data.get("id") or item_data.get("event_id"))
                mark_seen(eid_str)
                yield self.format_sse_message(
                    event_id=eid_str,
                    event_type="attack.created",
                    data=item_data
                )

            # Flush initial handshake comment to confirm stream establishment to clients and proxies
            yield ": connected\n\n"

            # ── 2. Live Stream Phase with Heartbeats (ZERO DB connection held) ─
            while True:
                if disconnect_task.done() and disconnect_task.result():
                    logger.info("sse_client_disconnected_detected")
                    break

                queue_task = asyncio.create_task(client_queue.get())
                done, pending = await asyncio.wait(
                    [queue_task, disconnect_task],
                    timeout=settings.sse_heartbeat_interval_seconds,
                    return_when=asyncio.FIRST_COMPLETED
                )

                if disconnect_task in done and disconnect_task.result():
                    queue_task.cancel()
                    logger.info("sse_client_disconnected_detected")
                    break

                if queue_task in done:
                    event_data = queue_task.result()
                    eid_str = str(event_data.get("id") or event_data.get("event_id"))
                    # Deduplicate in case event arrived during replay
                    if mark_seen(eid_str):
                        yield self.format_sse_message(
                            event_id=eid_str,
                            event_type="attack.created",
                            data=event_data
                        )
                else:
                    queue_task.cancel()
                    yield self.format_keepalive()

        except asyncio.CancelledError:
            logger.info("sse_client_connection_cancelled")
        finally:
            if not disconnect_task.done():
                disconnect_task.cancel()
            await self.unregister(client_queue)


# Global broadcaster instance
broadcaster = SSEBroadcaster()
