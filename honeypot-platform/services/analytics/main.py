import asyncio
import json
import os
import pandas as pd
import numpy as np
from kafka import KafkaConsumer
from shared.logger import get_logger
from shared.kafka_producer import AsyncKafkaProducer

logger = get_logger("analytics-service")

class AnalyticsService:
    def __init__(self, bootstrap_servers):
        self.bootstrap_servers = bootstrap_servers
        self.producer = AsyncKafkaProducer(bootstrap_servers)
        self.window = []
        self.window_size = 300  # 5 minutes in seconds

    async def start(self):
        self.consumer = KafkaConsumer(
            'enriched-attacks',
            bootstrap_servers=self.bootstrap_servers,
            group_id='analytics-group',
            auto_offset_reset='latest',
            value_deserializer=lambda m: json.loads(m.decode('utf-8'))
        )
        self.producer.connect()
        
        while True:
            msg_pack = self.consumer.poll(timeout_ms=1000)
            for tp, messages in msg_pack.items():
                for msg in messages:
                    attack = msg.value
                    self.window.append(attack)
                    
                    # Run anomaly detection every 10 messages
                    if len(self.window) % 10 == 0:
                        await self.detect_anomalies()
            
            await asyncio.sleep(0.1)

    async def detect_anomalies(self):
        if not self.window: return
        
        df = pd.DataFrame(self.window)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Group by 10s intervals
        counts = df.resample('10S', on='timestamp').size()
        
        if len(counts) < 5: return
        
        # Median Absolute Deviation (MAD)
        median = counts.median()
        mad = (counts - median).abs().median()
        
        latest_count = counts.iloc[-1]
        threshold = median + 3 * mad
        
        if latest_count > threshold and latest_count > 5:
            logger.warning(f"Anomaly detected! Current rate: {latest_count}, Threshold: {threshold}")
            alert = {
                "type": "TRAFFIC_SPIKE",
                "severity": "HIGH",
                "current_rate": int(latest_count),
                "threshold": float(threshold),
                "timestamp": pd.Timestamp.now().isoformat()
            }
            await self.producer.send_message("alerts", alert)

        # Cleanup window
        now = pd.Timestamp.now(tz='UTC')
        self.window = [a for a in self.window if (now - pd.to_datetime(a['timestamp'])).total_seconds() < self.window_size]

if __name__ == "__main__":
    bootstrap = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    service = AnalyticsService(bootstrap)
    asyncio.run(service.start())
