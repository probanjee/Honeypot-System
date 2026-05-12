import json
import asyncio
from kafka import KafkaProducer
from shared.logger import get_logger

logger = get_logger(__name__)

class AsyncKafkaProducer:
    def __init__(self, bootstrap_servers: str):
        self.bootstrap_servers = bootstrap_servers
        self.producer = None

    def connect(self):
        try:
            self.producer = KafkaProducer(
                bootstrap_servers=self.bootstrap_servers,
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                acks='all',
                retries=5,
                retry_backoff_ms=1000
            )
            logger.info(f"Connected to Kafka at {self.bootstrap_servers}")
        except Exception as e:
            logger.error(f"Failed to connect to Kafka: {e}")
            raise

    async def send_message(self, topic: str, message: dict):
        if not self.producer:
            self.connect()
        
        loop = asyncio.get_event_loop()
        try:
            future = await loop.run_in_executor(None, lambda: self.producer.send(topic, message))
            # Wait for message to be sent
            # record_metadata = future.get(timeout=10)
            return True
        except Exception as e:
            logger.error(f"Error sending message to Kafka topic {topic}: {e}")
            return False

    def close(self):
        if self.producer:
            self.producer.close()
            logger.info("Kafka producer closed")
