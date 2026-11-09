"""
VIGILANCE Ingestion Service (Phase 3)

Core Responsibilities:
1. Consumes raw attack events from Kafka (`raw-attacks`).
2. Validates incoming events against strict Draft 7 JSON schemas via Pydantic v2.
3. Quarantines malformed/poison-pill events to the DLQ (`raw-attacks-dlq`).
4. Performs GeoIP and network classification (public vs private/reserved).
5. Persists canonical attack records into PostgreSQL using idempotent `ON CONFLICT DO NOTHING`.
6. Persists granular signature matches into `attack_signatures` with relational integrity.
7. Atomic Transactional Outbox insertion (`enriched_outbox`) for at-least-once downstream delivery.
8. Commits Kafka offsets ONLY after database transactions successfully commit.
"""

import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, Tuple, Optional
import uuid
import structlog
from pydantic import ValidationError
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .database import get_db_session, engine
from .models.events import RawAttackEvent, EnrichedAttackEvent, GeoMetadata, ThreatIntelMetadata
from .models.attack import Attack, AttackSignature, EnrichedOutbox
from .geoip.service import GeoIPService, GeoEnrichmentResult
from .kafka.consumer import KafkaEventConsumer
from .kafka.producer import KafkaEventProducer
from .outbox import OutboxPublisher

logger = structlog.get_logger(__name__)


class IngestionService:
    def __init__(
        self,
        consumer: Optional[KafkaEventConsumer] = None,
        producer: Optional[KafkaEventProducer] = None,
        geoip_service: Optional[GeoIPService] = None,
        outbox_publisher: Optional[OutboxPublisher] = None
    ):
        self.consumer = consumer or KafkaEventConsumer()
        self.producer = producer or KafkaEventProducer()
        self.geoip_service = geoip_service or GeoIPService(
            database_path=settings.geoip_database_path,
            enabled=settings.geoip_enabled
        )
        self.outbox_publisher = outbox_publisher or OutboxPublisher(producer=self.producer)
        self._running = False
        self._metrics = {
            "consumed_count": 0,
            "persisted_count": 0,
            "duplicate_count": 0,
            "quarantined_count": 0,
            "error_count": 0,
            "started_at": datetime.now(timezone.utc)
        }

    async def start(self) -> None:
        """Start all underlying dependencies."""
        logger.info("starting_ingestion_service", version=settings.service_version)
        await self.producer.start()
        await self.consumer.start()
        self._running = True

    async def stop(self) -> None:
        """Stop dependencies cleanly."""
        logger.info("stopping_ingestion_service")
        self._running = False
        await self.consumer.stop()
        await self.producer.stop()
        self.geoip_service.close()

    async def quarantine_malformed_event(self, raw_data: Any, error_reason: str) -> None:
        """
        Quarantines malformed events to the Dead Letter Queue.
        Preserves original raw data and quarantine diagnostic metadata.
        """
        self._metrics["quarantined_count"] += 1
        dlq_payload = {
            "quarantined_at": datetime.now(timezone.utc).isoformat(),
            "reason": error_reason,
            "original_payload": raw_data
        }
        key = "quarantine"
        if isinstance(raw_data, dict) and "event_id" in raw_data:
            key = str(raw_data["event_id"])

        logger.warning(
            "event_quarantined_to_dlq",
            topic=settings.topic_dlq,
            key=key,
            reason=error_reason
        )
        try:
            await self.producer.publish(
                topic=settings.topic_dlq,
                key=key,
                payload=dlq_payload
            )
        except Exception as exc:
            logger.error("failed_to_publish_dlq_event", error=str(exc))

    async def process_single_event(
        self,
        raw_dict: Dict[str, Any],
        session: AsyncSession
    ) -> Tuple[bool, str]:
        """
        Process a single raw attack event inside an asynchronous database transaction.

        Returns:
            Tuple[bool, str]: (is_success, processing_status)
            Status can be "PERSISTED", "DUPLICATE_SUPPRESSED", "QUARANTINED_DLQ", or "ERROR"
        """
        self._metrics["consumed_count"] += 1

        # ── 1. Schema Validation via Pydantic v2 ──────────────────────────────
        try:
            raw_event = RawAttackEvent.model_validate(raw_dict)
        except (ValidationError, Exception) as val_err:
            await self.quarantine_malformed_event(raw_dict, str(val_err))
            return True, "QUARANTINED_DLQ"

        event_uuid = uuid.UUID(raw_event.event_id)

        # ── 2. GeoIP Enrichment & Network Classification ──────────────────────
        enrichment: GeoEnrichmentResult = self.geoip_service.enrich(raw_event.source.ip)

        # Determine primary attack category from detection matched rules
        primary_category = "UNKNOWN"
        if raw_event.detection.matched_rules:
            # Pick the category associated with highest weight rule
            sorted_rules = sorted(
                raw_event.detection.matched_rules,
                key=lambda r: r.weight,
                reverse=True
            )
            primary_category = sorted_rules[0].category

        # ── 3. Prepare Canonical Attack Record ────────────────────────────────
        now = datetime.now(timezone.utc)
        attack_values = {
            "id": event_uuid,
            "mongo_raw_id": raw_event.mongo_raw_id,
            "timestamp": raw_event.timestamp,
            "ingested_at": now,
            "source_ip": raw_event.source.ip,
            "source_port": raw_event.source.port,
            "is_private_ip": enrichment.is_private,
            "http_method": raw_event.request.method,
            "request_path": raw_event.request.path,
            "protocol": raw_event.request.protocol,
            "primary_category": primary_category,
            "severity_score": raw_event.detection.severity_score,
            "severity_level": raw_event.detection.severity_level,
            "user_agent": raw_event.request.user_agent,
            "detection_summary": {
                "matched_rule_count": len(raw_event.detection.matched_rules),
                "matched_rule_ids": [r.rule_id for r in raw_event.detection.matched_rules]
            },
            "processing_metadata": {
                "ingestion_service": settings.service_name,
                "ingestion_version": settings.service_version
            },
            "geo_country": enrichment.geo.country,
            "geo_country_code": enrichment.geo.country_code,
            "geo_city": enrichment.geo.city,
            "geo_latitude": enrichment.geo.latitude,
            "geo_longitude": enrichment.geo.longitude,
            "geoip_status": enrichment.status,
            "schema_version": raw_event.schema_version
        }

        # ── 4. Idempotent PostgreSQL Insertion (ON CONFLICT DO NOTHING) ──────
        dialect_name = getattr(session.bind.dialect, "name", "") if session.bind else ""
        if dialect_name == "sqlite":
            insert_stmt = sqlite_insert(Attack).values(**attack_values).on_conflict_do_nothing(
                index_elements=[Attack.id]
            )
        else:
            insert_stmt = pg_insert(Attack).values(**attack_values).on_conflict_do_nothing(
                index_elements=[Attack.id]
            )

        result = await session.execute(insert_stmt)

        # ── 5. Detect and Handle Duplicates ────────────────────────────────────
        if result.rowcount == 0:
            # Row already exists in PostgreSQL!
            self._metrics["duplicate_count"] += 1
            logger.info(
                "duplicate_attack_event_suppressed",
                event_id=raw_event.event_id,
                mongo_raw_id=raw_event.mongo_raw_id,
                source_ip=raw_event.source.ip,
                action="suppressed_via_db_constraint"
            )
            # Idempotency achieved: return success so caller can safely commit offset
            return True, "DUPLICATE_SUPPRESSED"

        # ── 6. Persist Granular Signature Matches ──────────────────────────────
        for rule in raw_event.detection.matched_rules:
            sig = AttackSignature(
                id=uuid.uuid4(),
                attack_id=event_uuid,
                signature_id=rule.rule_id,
                rule_name=rule.rule_name,
                category=rule.category,
                weight=rule.weight,
                created_at=now
            )
            session.add(sig)

        # ── 7. Prepare Enriched Event Envelope & Transactional Outbox ─────────
        enriched_event = EnrichedAttackEvent(
            event_id=raw_event.event_id,
            mongo_raw_id=raw_event.mongo_raw_id,
            schema_version="1.0.0",
            timestamp=raw_event.timestamp,
            ingested_at=now,
            event_type="ATTACK_ENRICHED",
            source=raw_event.source,
            geo=enrichment.geo,
            threat_intel=enrichment.threat_intel,
            detection=raw_event.detection,
            request=raw_event.request,
            primary_category=primary_category,
            geoip_status=enrichment.status
        )

        outbox_record = EnrichedOutbox(
            id=uuid.uuid4(),
            event_id=event_uuid,
            topic=settings.topic_enriched_attacks,
            payload=enriched_event.model_dump(mode="json"),
            publish_status="PENDING",
            created_at=now
        )
        session.add(outbox_record)

        self._metrics["persisted_count"] += 1
        logger.info(
            "canonical_attack_persisted",
            event_id=raw_event.event_id,
            category=primary_category,
            severity_level=raw_event.detection.severity_level,
            geoip_status=enrichment.status
        )
        return True, "PERSISTED"

    async def run(self, stop_event: asyncio.Event) -> None:
        """
        Main Ingestion Loop.
        Consumes batches, processes each event in a database transaction,
        and commits Kafka offset ONLY on transaction success.
        """
        await self.start()
        outbox_task = asyncio.create_task(self.outbox_publisher.run(stop_event))

        logger.info("ingestion_consumer_loop_active", topic=self.consumer.topic)

        try:
            while not stop_event.is_set():
                try:
                    records = await self.consumer.fetch_batch(max_records=20, timeout_ms=1000)
                    if not records:
                        await asyncio.sleep(0.1)
                        continue

                    # Process each record
                    for record in records:
                        payload = record.value
                        async with get_db_session() as session:
                            success, status = await self.process_single_event(payload, session)
                            if success:
                                await session.commit()
                            else:
                                # Processing error - rollback already triggered by get_db_session
                                logger.error("event_processing_aborted", status=status)
                                break

                    # Offset commit happens ONLY after all events in the batch were committed to DB
                    await self.consumer.commit()

                except asyncio.CancelledError:
                    break
                except Exception as exc:
                    self._metrics["error_count"] += 1
                    logger.error("ingestion_loop_error", error=str(exc))
                    await asyncio.sleep(1.0)
        finally:
            outbox_task.cancel()
            try:
                await outbox_task
            except asyncio.CancelledError:
                pass
            await self.stop()

    def get_metrics(self) -> Dict[str, Any]:
        """Expose operational metrics and health status."""
        return {
            **self._metrics,
            "service": settings.service_name,
            "version": settings.service_version,
            "database_url_masked": settings.database_url.split("@")[-1] if "@" in settings.database_url else "local",
            "geoip_enabled": settings.geoip_enabled
        }
