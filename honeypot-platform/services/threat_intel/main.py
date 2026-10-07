import asyncio
import json
import os
from kafka import KafkaConsumer
from shared.logger import get_logger
from shared.kafka_producer import AsyncKafkaProducer
from services.threat_intel.src.abuseipdb import AbuseIPDBClient
from services.threat_intel.src.shodan import ShodanClient

logger = get_logger("threat-intel")

class ThreatIntelService:
    def __init__(self, bootstrap_servers):
        self.bootstrap_servers = bootstrap_servers
        self.abuseipdb = AbuseIPDBClient(os.getenv("ABUSEIPDB_API_KEY", "mock_key"))
        self.shodan = ShodanClient(os.getenv("SHODAN_API_KEY", "mock_key"))
        self.producer = AsyncKafkaProducer(bootstrap_servers)
        self.running = False

    async def start(self):
        self.consumer = KafkaConsumer(
            'raw-attacks',
            bootstrap_servers=self.bootstrap_servers,
            group_id='threat-intel-group',
            auto_offset_reset='earliest',
            value_deserializer=lambda m: json.loads(m.decode('utf-8'))
        )
        self.producer.connect()
        self.running = True
        
        while self.running:
            msg_pack = self.consumer.poll(timeout_ms=1000, max_records=10)
            for tp, messages in msg_pack.items():
                for msg in messages:
                    attack = msg.value
                    ip = attack.get("source_ip")
                    
                    # Enrich with threat intel
                    intel = await self.enrich_ip(ip)
                    
                    # Create alert if dangerous
                    if intel["abuse_score"] > 50:
                        alert = {
                            "type": "HIGH_THREAT_IP",
                            "severity": "HIGH" if intel["abuse_score"] < 90 else "CRITICAL",
                            "ip": ip,
                            "score": intel["abuse_score"],
                            "tags": intel["tags"],
                            "timestamp": attack["timestamp"]
                        }
                        await self.producer.send_message("alerts", alert)
            
            await asyncio.sleep(0.1)

    async def enrich_ip(self, ip):
        abuse_score = await self.abuseipdb.get_score(ip)
        shodan_tags = await self.shodan.get_tags(ip)
        return {
            "abuse_score": abuse_score,
            "tags": shodan_tags
        }

if __name__ == "__main__":
    bootstrap = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    service = ThreatIntelService(bootstrap)
    asyncio.run(service.start())
