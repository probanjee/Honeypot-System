"""
Asynchronous Kafka Consumer Wrapper (Phase 3)
Consumes from raw-attacks with manual offset commitment for at-least-once reliability.
"""

from typing import Optional, Any, AsyncGenerator
import json
import structlog
from aiokafka import AIOKafkaConsumer, ConsumerRecord

from ..config import settings

logger = structlog.get_logger(__name__)


class KafkaEventConsumer:
    def __init__(
        self,
        topic: Optional[str] = None,
        bootstrap_servers: Optional[str] = None,
        group_id: Optional[str] = None,
        consumer_impl: Optional[Any] = None
    ):
        self.topic = topic or settings.topic_raw_attacks
        self.bootstrap_servers = bootstrap_servers or settings.kafka_bootstrap_servers
        self.group_id = group_id or settings.kafka_group_id
        self._consumer = consumer_impl
        self._started = False

    async def start(self) -> None:
        if self._consumer is None:
            self._consumer = AIOKafkaConsumer(
                self.topic,
                bootstrap_servers=self.bootstrap_servers,
                group_id=self.group_id,
                enable_auto_commit=False,  # CRITICAL: Manual commit only after DB transaction succeeds
                auto_offset_reset="earliest",
                value_deserializer=lambda v: json.loads(v.decode("utf-8")),
                key_deserializer=lambda k: k.decode("utf-8") if k else None,
                max_poll_records=50
            )
            await self._consumer.start()
            logger.info(
                "kafka_consumer_started",
                topic=self.topic,
                group_id=self.group_id,
                bootstrap_servers=self.bootstrap_servers
            )
        self._started = True

    async def stop(self) -> None:
        if self._consumer and hasattr(self._consumer, "stop"):
            try:
                await self._consumer.stop()
                logger.info("kafka_consumer_stopped")
            except Exception as exc:
                logger.warning("kafka_consumer_stop_error", error=str(exc))
        self._started = False

    async def fetch_batch(self, max_records: int = 20, timeout_ms: int = 1000) -> list[ConsumerRecord]:
        """Fetch a batch of records from Kafka."""
        if not self._started:
            raise RuntimeError("KafkaEventConsumer must be started before fetching")

        if hasattr(self._consumer, "getmany"):
            message_map = await self._consumer.getmany(timeout_ms=timeout_ms, max_records=max_records)
            records = []
            for tp_records in message_map.values():
                records.extend(tp_records)
            return records
        
        # If wrapped consumer is a simple mock or list
        if hasattr(self._consumer, "fetch_batch"):
            return await self._consumer.fetch_batch(max_records=max_records, timeout_ms=timeout_ms)

        return []

    async def commit(self) -> None:
        """
        Manually commit consumer offsets.
        Must only be invoked after database transactions have successfully committed.
        """
        if not self._started:
            raise RuntimeError("Consumer not started")

        if self._consumer and hasattr(self._consumer, "commit"):
            try:
                await self._consumer.commit()
                logger.debug("kafka_offset_committed")
            except Exception as exc:
                logger.error("kafka_offset_commit_failed", error=str(exc))
                raise
