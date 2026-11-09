"""
Kafka Client Package for VIGILANCE Ingestion Service (Phase 3)
"""

from .consumer import KafkaEventConsumer
from .producer import KafkaEventProducer

__all__ = ["KafkaEventConsumer", "KafkaEventProducer"]
