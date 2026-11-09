"""
Main entrypoint for VIGILANCE Analytics Service (Phase 6)
Consumes enriched attacks, calculates sliding-window MAD anomalies,
and emits alerts to Kafka.
"""

import asyncio
import signal
import sys
import structlog

from .config import settings
from .service import AnalyticsService


def setup_logging():
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.dev.ConsoleRenderer() if sys.stdout.isatty() else structlog.processors.JSONRenderer()
        ],
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True
    )


async def main():
    setup_logging()
    logger = structlog.get_logger(__name__)
    logger.info(
        "vigilance_analytics_starting",
        service=settings.service_name,
        version=settings.service_version,
        kafka_bootstrap=settings.kafka_bootstrap_servers,
        source_topic=settings.topic_enriched_attacks,
        alerts_topic=settings.topic_alerts,
        window_minutes=settings.window_size_minutes,
        z_threshold=settings.z_score_threshold
    )

    stop_event = asyncio.Event()

    def handle_signal():
        logger.info("shutdown_signal_received")
        stop_event.set()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, handle_signal)
        except NotImplementedError:
            pass

    service = AnalyticsService()
    try:
        await service.run(stop_event)
    except Exception as exc:
        logger.critical("analytics_service_fatal_error", error=str(exc))
        sys.exit(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass

