"""
PostgreSQL Transactional Outbox Worker (Phase 3)

Ensures at-least-once publication of enriched events to Kafka.
Decouples database transaction from Kafka broker availability.
Handles abandoned claims, worker recovery, and retry limits.
"""

import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Optional
import uuid
import structlog
from sqlalchemy import select, update, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from .models.attack import EnrichedOutbox
from .kafka.producer import KafkaEventProducer
from .config import settings
from .database import get_db_session

logger = structlog.get_logger(__name__)


class OutboxPublisher:
    def __init__(
        self,
        producer: KafkaEventProducer,
        worker_id: Optional[str] = None,
        batch_size: Optional[int] = None,
        poll_interval: Optional[float] = None,
        claim_timeout_seconds: Optional[float] = None,
        max_retries: Optional[int] = None
    ):
        self.producer = producer
        self.worker_id = worker_id or f"outbox-worker-{uuid.uuid4().hex[:8]}"
        self.batch_size = batch_size or settings.outbox_batch_size
        self.poll_interval = poll_interval if poll_interval is not None else settings.outbox_poll_interval_seconds
        self.claim_timeout_seconds = claim_timeout_seconds if claim_timeout_seconds is not None else settings.outbox_claim_timeout_seconds
        self.max_retries = max_retries if max_retries is not None else settings.outbox_max_retries
        self._running = False

    async def claim_records(self, session: AsyncSession) -> List[EnrichedOutbox]:
        """
        Finds pending or abandoned outbox records and marks them as CLAIMED.
        Handles dialect-specific concurrency controls (SKIP LOCKED on PostgreSQL).
        """
        now = datetime.now(timezone.utc)
        claim_expiry = now - timedelta(seconds=self.claim_timeout_seconds)

        # Build claim query: PENDING or (CLAIMED but abandoned past claim_timeout_seconds)
        stmt = (
            select(EnrichedOutbox)
            .where(
                or_(
                    EnrichedOutbox.publish_status == "PENDING",
                    and_(
                        EnrichedOutbox.publish_status == "CLAIMED",
                        EnrichedOutbox.claimed_at < claim_expiry
                    )
                )
            )
            .order_by(EnrichedOutbox.created_at.asc())
            .limit(self.batch_size)
        )

        # On PostgreSQL, use FOR UPDATE SKIP LOCKED to prevent lock contention across multiple workers
        bind = session.bind
        if bind and getattr(bind.dialect, "name", "") == "postgresql":
            stmt = stmt.with_for_update(skip_locked=True)

        result = await session.execute(stmt)
        records = list(result.scalars().all())

        if not records:
            return []

        # Claim the selected records
        for record in records:
            record.publish_status = "CLAIMED"
            record.claimed_at = now
            record.claimed_by = self.worker_id

        await session.flush()
        return records

    async def process_batch(self, session: AsyncSession) -> int:
        """
        Claims and publishes a single batch of outbox events.
        Returns the number of events published.
        """
        records = await self.claim_records(session)
        if not records:
            return 0

        published_count = 0
        now = datetime.now(timezone.utc)

        for record in records:
            try:
                # Key by event_id for partition consistency
                await self.producer.publish(
                    topic=record.topic,
                    key=str(record.event_id),
                    payload=record.payload
                )

                # Successful publication
                record.publish_status = "PUBLISHED"
                record.published_at = now
                record.last_error = None
                published_count += 1
                logger.info(
                    "outbox_record_published",
                    outbox_id=str(record.id),
                    event_id=str(record.event_id),
                    topic=record.topic
                )
            except Exception as exc:
                record.retry_count += 1
                record.last_error = str(exc)

                if record.retry_count >= self.max_retries:
                    record.publish_status = "FAILED"
                    logger.error(
                        "outbox_record_failed_permanently",
                        outbox_id=str(record.id),
                        event_id=str(record.event_id),
                        retries=record.retry_count,
                        error=str(exc)
                    )
                else:
                    record.publish_status = "PENDING"  # Re-queue for next retry cycle
                    logger.warning(
                        "outbox_record_publish_failed_transient",
                        outbox_id=str(record.id),
                        event_id=str(record.event_id),
                        retry_count=record.retry_count,
                        max_retries=self.max_retries,
                        error=str(exc)
                    )

        await session.commit()
        return published_count

    async def run(self, stop_event: asyncio.Event) -> None:
        """Background reconciliation loop."""
        self._running = True
        logger.info(
            "outbox_publisher_loop_started",
            worker_id=self.worker_id,
            poll_interval=self.poll_interval
        )

        while not stop_event.is_set():
            try:
                async with get_db_session() as session:
                    published = await self.process_batch(session)

                if published == 0:
                    # If no records claimed, sleep for the poll interval
                    await asyncio.sleep(self.poll_interval)
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error("outbox_publisher_loop_error", error=str(exc))
                await asyncio.sleep(self.poll_interval)

        self._running = False
        logger.info("outbox_publisher_loop_stopped", worker_id=self.worker_id)
