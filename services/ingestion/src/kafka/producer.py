"""
Asynchronous Kafka Producer Wrapper (Phase 3)
Publishes to enriched-attacks and dead-letter queue topics with message keying.
"""

import json
from typing import Dict, Any, Optional
import structlog
from aiokafka import AIOKafkaProducer

from ..config import settings

logger = structlog.get_logger(__name__)


class KafkaEventProducer:
    def __init__(
        self,
        bootstrap_servers: Optional[str] = None,
        producer_impl: Optional[Any] = None
    ):
        self.bootstrap_servers = bootstrap_servers or settings.kafka_bootstrap_servers
        self._producer = producer_impl
        self._started = False

    async def start(self) -> None:
        if self._producer is None:
            self._producer = AIOKafkaProducer(
                bootstrap_servers=self.bootstrap_servers,
                value_serializer=lambda v: json.dumps(v, default=str).encode("utf-8"),
                key_serializer=lambda k: k.encode("utf-8") if k else None,
                acks="all",
                enable_idempotence=True,
                max_request_size=1048576  # 1MB
            )
            await self._producer.start()
            logger.info("kafka_producer_started", bootstrap_servers=self.bootstrap_servers)
        self._started = True

    async def stop(self) -> None:
        if self._producer and hasattr(self._producer, "stop"):
            try:
                await self._producer.stop()
                logger.info("kafka_producer_stopped")
            except Exception as exc:
                logger.warning("kafka_producer_stop_error", error=str(exc))
        self._started = False

    async def publish(self, topic: str, key: str, payload: Dict[str, Any]) -> Any:
        """
        Publish a message to Kafka and wait for broker acknowledgement.
        Keying ensures partition consistency for related events.
        """
        if not self._started:
            raise RuntimeError("KafkaEventProducer must be started before publishing")

        try:
            record_metadata = await self._producer.send_and_wait(
                topic=topic,
                key=key,
                value=payload
            )
            logger.info(
                "kafka_message_published",
                topic=topic,
                key=key,
                partition=getattr(record_metadata, "partition", 0),
                offset=getattr(record_metadata, "offset", -1)
            )
            return record_metadata
        except Exception as exc:
            logger.error("kafka_publish_failed", topic=topic, key=key, error=str(exc))
            raise
