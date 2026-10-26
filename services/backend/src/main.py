"""
VIGILANCE Analytical Backend API Entrypoint (Phase 4)
FastAPI application with lifespan management, CORS security, and OpenAPI documentation.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import structlog

from .config import settings
from .core.logging import setup_logging
from .services.sse_broadcaster import broadcaster
from .services.kafka_consumer import kafka_sse_consumer
from .api.v1.router import api_v1_router

setup_logging()
logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager for shared resource initialization and teardown."""
    logger.info(
        "vigilance_backend_starting",
        service=settings.service_name,
        version=settings.service_version,
        cors_origins=settings.cors_origins
    )
    await broadcaster.start()
    await kafka_sse_consumer.start()
    try:
        yield
    finally:
        logger.info("vigilance_backend_shutting_down")
        await kafka_sse_consumer.stop()
        await broadcaster.stop()


def create_app() -> FastAPI:
    """Factory creating configured FastAPI application instance."""
    app = FastAPI(
        title="VIGILANCE Threat Intelligence & Deception API",
        description=(
            "Production-grade Analytical REST API and Server-Sent Events (SSE) live stream "
            "for the VIGILANCE Enterprise Honeypot Platform."
        ),
        version=settings.service_version,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan
    )

    # ── Defensive CORS Configuration ──────────────────────────────────────────
    # Restricts origins strictly to expected dashboard ports; avoids wildcard '*'
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["Content-Type", "Last-Event-ID"]
    )

    # ── Safe Global Error Handlers ────────────────────────────────────────────
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        logger.warning("request_validation_failed", path=request.url.path, errors=exc.errors())
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "detail": "Request parameter validation failed",
                "errors": [
                    {
                        "loc": [str(x) for x in err.get("loc", [])],
                        "msg": err.get("msg"),
                        "type": err.get("type")
                    }
                    for err in exc.errors()
                ]
            }
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        logger.error("unhandled_server_exception", path=request.url.path, error=str(exc))
        # Never expose internal stack traces or database connection strings to clients
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "An internal error occurred while processing the request"}
        )

    # ── Mount API v1 Router ───────────────────────────────────────────────────
    app.include_router(api_v1_router, prefix=settings.api_prefix)

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "services.backend.src.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True
    )
