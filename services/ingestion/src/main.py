"""
Main entrypoint for VIGILANCE Ingestion Service (Phase 3)
Handles signal interrupts, structured logging setup, and service lifecycle.
"""

import asyncio
import signal
import sys
import structlog

from .config import settings
from .service import IngestionService


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
        "vigilance_ingestion_starting",
        service=settings.service_name,
        version=settings.service_version,
        database_url=settings.database_url.split("@")[-1] if "@" in settings.database_url else "local",
        kafka_bootstrap=settings.kafka_bootstrap_servers
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
            # Signal handlers not implemented on Windows loop without proactor
            pass

    service = IngestionService()
    try:
        await service.run(stop_event)
    except Exception as exc:
        logger.critical("ingestion_service_fatal_error", error=str(exc))
        sys.exit(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
