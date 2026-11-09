"""
Kafka to SSE Bridge Consumer (Phase 5)

Continuously consumes enriched attack events from Kafka (`enriched-attacks`),
validates event envelopes against Draft 7 JSON contracts via Pydantic v2,
converts valid events to the public SSE representation, and broadcasts them
to all connected SOC dashboard clients.
"""

import asyncio
import json
from typing import Optional, Any
import structlog
from aiokafka import AIOKafkaConsumer, ConsumerRecord
from pydantic import ValidationError

from ..config import settings
from ..schemas.events import EnrichedAttackEvent
from .sse_broadcaster import SSEBroadcaster, broadcaster

logger = structlog.get_logger(__name__)


class KafkaSSEConsumer:
    """
    Managed background Kafka consumer bridging the Kafka enriched event bus
    with the in-memory FastAPI SSE broadcaster.
    """
    def __init__(
        self,
        broadcaster_instance: Optional[SSEBroadcaster] = None,
        topic: Optional[str] = None,
        bootstrap_servers: Optional[str] = None,
        group_id: Optional[str] = None,
        consumer_impl: Optional[Any] = None
    ):
        self.broadcaster = broadcaster_instance or broadcaster
        self.topic = topic or settings.topic_enriched_attacks
        self.bootstrap_servers = bootstrap_servers or settings.kafka_bootstrap_servers
        self.group_id = group_id or settings.kafka_group_id
        self._consumer = consumer_impl
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._stop_event = asyncio.Event()

    async def start(self) -> None:
        """Launches the consumer background task via application lifespan."""
        if self._running:
            return
        self._running = True
        self._stop_event.clear()
        self._task = asyncio.create_task(self._consume_loop(), name="kafka-sse-consumer")
        logger.info(
            "kafka_sse_consumer_started",
            topic=self.topic,
            group_id=self.group_id,
            bootstrap_servers=self.bootstrap_servers
        )

    async def stop(self) -> None:
        """Gracefully halts the consumer loop and closes broker connections."""
        if not self._running:
            return
        self._running = False
        self._stop_event.set()

        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

        if self._consumer and hasattr(self._consumer, "stop"):
            try:
                await self._consumer.stop()
                logger.info("kafka_sse_consumer_connection_closed")
            except Exception as exc:
                logger.warning("kafka_sse_consumer_stop_error", error=str(exc))

        logger.info("kafka_sse_consumer_stopped")

    async def _init_consumer(self) -> bool:
        """Initializes and starts the underlying aiokafka consumer."""
        if self._consumer is not None:
            if hasattr(self._consumer, "start"):
                await self._consumer.start()
            return True

        try:
            self._consumer = AIOKafkaConsumer(
                self.topic,
                bootstrap_servers=self.bootstrap_servers,
                group_id=self.group_id,
                enable_auto_commit=False,
                auto_offset_reset="latest",  # For live SSE stream, start with latest events
                value_deserializer=lambda v: json.loads(v.decode("utf-8")),
                key_deserializer=lambda k: k.decode("utf-8") if k else None,
                max_poll_records=50,
                request_timeout_ms=10000
            )
            await self._consumer.start()
            logger.info("aiokafka_connection_established", topic=self.topic)
            return True
        except Exception as exc:
            logger.warning(
                "kafka_broker_connection_failed_will_retry",
                servers=self.bootstrap_servers,
                error=str(exc)
            )
            self._consumer = None
            return False

    async def process_record(self, record: Any) -> bool:
        """
        Processes a single Kafka ConsumerRecord:
        1. Deserializes and validates event envelope.
        2. Converts to public SSE payload.
        3. Dispatches to broadcaster for delivery to all connected clients.
        4. Commits offset.
        """
        raw_val = record.value if hasattr(record, "value") else record
        key = getattr(record, "key", None)

        # 1. Validation against EnrichedAttackEvent
        try:
            if isinstance(raw_val, str):
                raw_dict = json.loads(raw_val)
            elif isinstance(raw_val, dict):
                raw_dict = raw_val
            else:
                logger.error("invalid_kafka_message_type", msg_type=type(raw_val).__name__)
                return False

            event = EnrichedAttackEvent.model_validate(raw_dict)
        except (ValidationError, Exception) as val_err:
            logger.warning(
                "malformed_kafka_event_skipped",
                key=key,
                error=str(val_err)
            )
            # Offset should still advance past poison pills
            return False

        # 2. Conversion to public SSE payload
        try:
            sse_payload = event.to_sse_payload()
        except Exception as conv_err:
            logger.error("sse_conversion_failed", event_id=event.event_id, error=str(conv_err))
            return False

        # 3. Broadcast to all active SSE subscriber queues
        delivered_count = await self.broadcaster.broadcast(sse_payload)
        logger.debug(
            "kafka_event_broadcast_to_sse",
            event_id=event.event_id,
            category=event.primary_category,
            severity=event.detection.severity_level,
            delivered_clients=delivered_count
        )

        # 4. Commit offset if consumer supports it
        if self._consumer and hasattr(self._consumer, "commit"):
            try:
                await self._consumer.commit()
            except Exception as commit_err:
                logger.error("kafka_commit_failed", error=str(commit_err))

        return True

    async def _consume_loop(self) -> None:
        """Main resilience consumption loop with automatic reconnection."""
        retry_delay = 2.0
        max_retry_delay = 30.0

        while self._running and not self._stop_event.is_set():
            # Ensure consumer connection
            if self._consumer is None:
                connected = await self._init_consumer()
                if not connected:
                    await asyncio.sleep(retry_delay)
                    retry_delay = min(retry_delay * 1.5, max_retry_delay)
                    continue
                else:
                    retry_delay = 2.0

            try:
                # Fetch next batch of records
                if hasattr(self._consumer, "getmany"):
                    message_map = await self._consumer.getmany(timeout_ms=1000, max_records=20)
                    for tp, records in message_map.items():
                        for record in records:
                            if not self._running:
                                break
                            await self.process_record(record)
                elif hasattr(self._consumer, "fetch_batch"):
                    records = await self._consumer.fetch_batch(max_records=20, timeout_ms=1000)
                    for record in records:
                        if not self._running:
                            break
                        await self.process_record(record)
                elif hasattr(self._consumer, "__aiter__"):
                    async for record in self._consumer:
                        if not self._running:
                            break
                        await self.process_record(record)
                else:
                    await asyncio.sleep(0.5)

            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.warning("kafka_consumption_error_reconnecting", error=str(exc))
                if self._consumer and hasattr(self._consumer, "stop"):
                    try:
                        await self._consumer.stop()
                    except Exception:
                        pass
                self._consumer = None
                await asyncio.sleep(retry_delay)
                retry_delay = min(retry_delay * 1.5, max_retry_delay)


# Global consumer bridge instance
kafka_sse_consumer = KafkaSSEConsumer()
