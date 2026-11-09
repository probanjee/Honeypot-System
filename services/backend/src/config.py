"""
VIGILANCE Analytical Backend API Configuration (Phase 4)
Environment-driven settings using Pydantic Settings.
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    # Server Configuration
    api_host: str = Field(default="0.0.0.0", description="API bind host")
    api_port: int = Field(default=8000, description="API bind port")
    api_prefix: str = Field(default="/api/v1", description="API route prefix")

    # PostgreSQL Configuration
    database_url: str = Field(
        default="postgresql+asyncpg://vigilance_user:vigilance_password@127.0.0.1:5432/vigilance_db",
        description="Async SQLAlchemy database connection URL"
    )
    db_pool_size: int = Field(default=10, description="Database connection pool size")
    db_max_overflow: int = Field(default=5, description="Max overflow connections")
    db_timeout_seconds: float = Field(default=10.0, description="Query timeout")

    # Security & CORS
    cors_origins: List[str] = Field(
        default=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173"
        ],
        description="Allowed CORS origins for the SOC dashboard"
    )
    cursor_signing_secret: str = Field(
        default="vigilance-secure-cursor-hmac-key-change-in-production",
        description="HMAC secret used to sign and verify pagination cursors"
    )

    # Kafka Configuration (for SSE Stream ingestion)
    kafka_bootstrap_servers: str = Field(
        default="127.0.0.1:9092",
        description="Comma-separated Kafka broker addresses"
    )
    kafka_group_id: str = Field(
        default="vigilance-backend-sse-group",
        description="Consumer group identifier for backend SSE listener"
    )
    topic_enriched_attacks: str = Field(
        default="enriched-attacks",
        description="Topic for streaming newly persisted enriched attacks"
    )

    # SSE Stream Settings
    sse_client_queue_size: int = Field(default=100, description="Per-client bounded in-memory event buffer")
    sse_heartbeat_interval_seconds: float = Field(default=15.0, description="Interval for keep-alive SSE comments")
    sse_replay_max_records: int = Field(default=50, description="Max records to replay from DB on Last-Event-ID")

    # Pagination Constraints
    max_page_size: int = Field(default=100, description="Maximum allowed page size")
    default_page_size: int = Field(default=20, description="Default page size when unspecified")

    # Service Metadata
    service_name: str = "vigilance-backend-api"
    service_version: str = "1.0.0"
    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
