"""
VIGILANCE Analytics Service (Phase 6)
Consumes canonical enriched attack events, runs statistical MAD anomaly detection,
and publishes explainable anomaly alerts to the `alerts` Kafka topic.
"""

import asyncio
from datetime import datetime, timezone
import json
from typing import Optional, Any
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from pydantic import ValidationError
import structlog

from .config import settings
from .schemas import EnrichedAttackEvent, AnomalyAlertEvent
from .detector import MADAnomalyDetector

logger = structlog.get_logger(__name__)


class AnalyticsService:
    """
    Managed streaming worker for real-time statistical anomaly detection.
    """
    def __init__(
        self,
        consumer: Optional[Any] = None,
        producer: Optional[Any] = None,
        detector: Optional[MADAnomalyDetector] = None,
        topic_source: Optional[str] = None,
        topic_alerts: Optional[str] = None,
        bootstrap_servers: Optional[str] = None,
        group_id: Optional[str] = None
    ):
        self.topic_source = topic_source or settings.topic_enriched_attacks
        self.topic_alerts = topic_alerts or settings.topic_alerts
        self.bootstrap_servers = bootstrap_servers or settings.kafka_bootstrap_servers
        self.group_id = group_id or settings.kafka_group_id

        self.consumer = consumer
        self.producer = producer
        self.detector = detector or MADAnomalyDetector(
            window_size_minutes=settings.window_size_minutes,
            z_score_threshold=settings.z_score_threshold,
            min_observations=settings.min_observations,
            min_spike_threshold=settings.min_spike_threshold
        )

        self._running = False
        self._metrics = {
            "consumed_count": 0,
            "alerts_emitted_count": 0,
            "errors_count": 0,
            "started_at": datetime.now(timezone.utc)
        }

    async def start(self) -> None:
        """Initializes Kafka producer and consumer connections."""
        logger.info(
            "starting_analytics_service",
            service=settings.service_name,
            version=settings.service_version,
            source_topic=self.topic_source,
            alerts_topic=self.topic_alerts
        )

        # 1. Start Producer
        if self.producer is None:
            self.producer = AIOKafkaProducer(
                bootstrap_servers=self.bootstrap_servers,
                value_serializer=lambda v: json.dumps(v, default=str).encode("utf-8"),
                key_serializer=lambda k: k.encode("utf-8") if k else None,
                acks="all"
            )
            await self.producer.start()
            logger.info("kafka_producer_started", bootstrap_servers=self.bootstrap_servers)
        elif hasattr(self.producer, "start"):
            await self.producer.start()

        # 2. Start Consumer
        if self.consumer is None:
            self.consumer = AIOKafkaConsumer(
                self.topic_source,
                bootstrap_servers=self.bootstrap_servers,
                group_id=self.group_id,
                enable_auto_commit=False,
                auto_offset_reset="latest",
                value_deserializer=lambda v: json.loads(v.decode("utf-8")),
                key_deserializer=lambda k: k.decode("utf-8") if k else None,
                max_poll_records=50,
                request_timeout_ms=10000
            )
            await self.consumer.start()
            logger.info("kafka_consumer_started", topic=self.topic_source, group_id=self.group_id)
        elif hasattr(self.consumer, "start"):
            await self.consumer.start()

        self._running = True

    async def stop(self) -> None:
        """Gracefully halts the consumer and flushes broker connections."""
        self._running = False
        logger.info("stopping_analytics_service")

        if self.consumer and hasattr(self.consumer, "stop"):
            try:
                await self.consumer.stop()
            except Exception as exc:
                logger.warning("consumer_stop_error", error=str(exc))

        if self.producer and hasattr(self.producer, "stop"):
            try:
                await self.producer.stop()
            except Exception as exc:
                logger.warning("producer_stop_error", error=str(exc))

        logger.info("analytics_service_stopped", metrics=self._metrics)

    async def process_record(self, record_value: Any) -> Optional[AnomalyAlertEvent]:
        """
        Validates an attack record, feeds its timestamp to MAD detector,
        and publishes an anomaly alert if a traffic volume surge is detected.
        """
        self._metrics["consumed_count"] += 1

        # 1. Parse and validate enriched attack event envelope
        try:
            if isinstance(record_value, str):
                data = json.loads(record_value)
            elif isinstance(record_value, dict):
                data = record_value
            else:
                logger.warning("invalid_record_type", record_type=type(record_value).__name__)
                return None

            event = EnrichedAttackEvent.model_validate(data)
        except (ValidationError, Exception) as val_err:
            logger.warning("malformed_enriched_attack_skipped", error=str(val_err))
            self._metrics["errors_count"] += 1
            return None

        # 2. Feed timestamp into statistical anomaly detector
        alert = self.detector.add_event(event.timestamp)

        # 3. If an anomaly is triggered, emit alert to Kafka
        if alert is not None:
            self._metrics["alerts_emitted_count"] += 1
            logger.info(
                "anomaly_alert_triggered",
                alert_id=str(alert.alert_id),
                alert_type=alert.alert_type,
                severity=alert.severity,
                observed_value=alert.observed_value,
                median=alert.baseline_median,
                mad=alert.mad,
                z_score=alert.modified_z_score,
                explanation=alert.explanation
            )
            await self.publish_alert(alert)

        return alert

    async def publish_alert(self, alert: AnomalyAlertEvent) -> None:
        """Publishes AnomalyAlertEvent envelope to Kafka topic `alerts`."""
        if not self.producer:
            logger.error("cannot_publish_alert_producer_not_ready")
            return

        payload = alert.model_dump(mode="json")
        try:
            await self.producer.send_and_wait(
                topic=self.topic_alerts,
                key=alert.alert_type,
                value=payload
            )
            logger.debug("alert_published_to_kafka", alert_id=str(alert.alert_id), topic=self.topic_alerts)
        except Exception as exc:
            logger.error("alert_publication_failed", alert_id=str(alert.alert_id), error=str(exc))
            self._metrics["errors_count"] += 1

    async def run(self, stop_event: asyncio.Event) -> None:
        """Continuous event consumption loop."""
        await self.start()

        logger.info("analytics_service_running_loop")
        try:
            while not stop_event.is_set():
                try:
                    records_map = await self.consumer.getmany(timeout_ms=1000, max_records=50)
                    for topic_partition, records in records_map.items():
                        for record in records:
                            await self.process_record(record.value)
                        # Commit offsets after batch is evaluated
                        await self.consumer.commit()
                except Exception as exc:
                    if not stop_event.is_set():
                        logger.error("error_in_analytics_loop", error=str(exc))
                        await asyncio.sleep(0.5)
        finally:
            await self.stop()

