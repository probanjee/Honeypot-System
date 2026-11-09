"""
VIGILANCE Analytics & Anomaly Detection Service Configuration (Phase 6)
Settings for sliding-window Median Absolute Deviation (MAD) anomaly detection.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    # Kafka Configuration
    kafka_bootstrap_servers: str = Field(
        default="127.0.0.1:9092",
        description="Comma-separated Kafka broker addresses"
    )
    kafka_group_id: str = Field(
        default="vigilance-analytics-mad-group",
        description="Consumer group identifier for analytics worker"
    )
    topic_enriched_attacks: str = Field(
        default="enriched-attacks",
        description="Source topic for incoming canonical enriched attacks"
    )
    topic_alerts: str = Field(
        default="alerts",
        description="Destination topic for statistical anomaly alerts"
    )

    # MAD Anomaly Detector Parameters
    window_size_minutes: int = Field(
        default=30,
        description="Sliding time window duration in minutes (number of 1-minute buckets)"
    )
    bucket_size_seconds: int = Field(
        default=60,
        description="Aggregation granularity in seconds (default: 60s = 1 minute buckets)"
    )
    z_score_threshold: float = Field(
        default=3.5,
        description="Modified Z-score threshold for anomaly classification (Boris Iglewicz & David Hoaglin standard)"
    )
    min_observations: int = Field(
        default=5,
        description="Minimum populated buckets required before lifting WARMUP suppression"
    )
    min_spike_threshold: int = Field(
        default=10,
        description="Absolute delta threshold when both MAD and MeanAD are 0 (e.g. idle honeypot baseline)"
    )

    # Service Metadata
    service_name: str = "vigilance-analytics-service"
    service_version: str = "1.0.0"
    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

