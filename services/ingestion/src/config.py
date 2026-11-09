"""
VIGILANCE Ingestion Service Configuration (Phase 3)
Environment-driven settings using Pydantic Settings.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    # PostgreSQL Configuration
    database_url: str = Field(
        default="postgresql+asyncpg://vigilance_user:vigilance_password@127.0.0.1:5432/vigilance_db",
        description="Async SQLAlchemy database connection URL"
    )
    db_pool_size: int = Field(default=10, description="Database connection pool size")
    db_max_overflow: int = Field(default=5, description="Max overflow connections")
    db_timeout_seconds: float = Field(default=10.0, description="Query timeout")

    # Kafka Configuration
    kafka_bootstrap_servers: str = Field(
        default="127.0.0.1:9092",
        description="Comma-separated Kafka broker addresses"
    )
    kafka_group_id: str = Field(
        default="vigilance-ingestion-group",
        description="Consumer group identifier"
    )
    topic_raw_attacks: str = Field(
        default="raw-attacks",
        description="Source topic for raw sensor attacks"
    )
    topic_enriched_attacks: str = Field(
        default="enriched-attacks",
        description="Destination topic for canonical enriched attacks"
    )
    topic_dlq: str = Field(
        default="raw-attacks-dlq",
        description="Dead-letter queue topic for poison pills"
    )

    # GeoIP Configuration
    geoip_database_path: str = Field(
        default="data/GeoLite2-City.mmdb",
        description="Path to local MaxMind GeoLite2 City database"
    )
    geoip_enabled: bool = Field(
        default=True,
        description="Whether to attempt GeoIP lookup on public IP addresses"
    )

    # Outbox Configuration
    outbox_batch_size: int = Field(default=50, description="Number of outbox events per batch")
    outbox_poll_interval_seconds: float = Field(default=2.0, description="Outbox worker polling interval")
    outbox_claim_timeout_seconds: float = Field(default=60.0, description="Abandoned claim expiration")
    outbox_max_retries: int = Field(default=5, description="Maximum outbox publication retries")

    # Service Metadata
    service_name: str = "ingestion-service"
    service_version: str = "1.0.0"
    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
