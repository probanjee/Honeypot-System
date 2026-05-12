import asyncio
import json
import os
import aiohttp
from kafka import KafkaConsumer
from shared.logger import get_logger

logger = get_logger("alerting-service")

class AlertingService:
    def __init__(self, bootstrap_servers):
        self.bootstrap_servers = bootstrap_servers
        self.slack_webhook = os.getenv("SLACK_WEBHOOK_URL")

    async def start(self):
        self.consumer = KafkaConsumer(
            'alerts',
            bootstrap_servers=self.bootstrap_servers,
            group_id='alerting-group',
            auto_offset_reset='latest',
            value_deserializer=lambda m: json.loads(m.decode('utf-8'))
        )
        
        while True:
            msg_pack = self.consumer.poll(timeout_ms=1000)
            for tp, messages in msg_pack.items():
                for msg in messages:
                    alert = msg.value
                    logger.info(f"Processing Alert: {alert['type']} - Severity: {alert['severity']}")
                    
                    if alert['severity'] in ['HIGH', 'CRITICAL']:
                        await self.send_slack(alert)
                    
                    if alert['severity'] == 'CRITICAL':
                        await self.trigger_pagerduty(alert)
            
            await asyncio.sleep(0.1)

    async def send_slack(self, alert):
        if not self.slack_webhook:
            logger.warning("Slack webhook not configured, skipping...")
            return

        payload = {
            "text": f"🚨 *{alert['severity']} ALERT*: {alert['type']}",
            "attachments": [{
                "color": "#ff0000" if alert['severity'] == "CRITICAL" else "#ffa500",
                "fields": [
                    {"title": "Details", "value": json.dumps(alert, indent=2), "short": False}
                ]
            }]
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(self.slack_webhook, json=payload) as resp:
                if resp.status != 200:
                    logger.error(f"Failed to send Slack alert: {await resp.text()}")

    async def trigger_pagerduty(self, alert):
        # Mock PagerDuty trigger
        logger.info(f"MOCK PAGERDUTY TRIGGER: {alert['type']}")

if __name__ == "__main__":
    bootstrap = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    service = AlertingService(bootstrap)
    asyncio.run(service.start())
