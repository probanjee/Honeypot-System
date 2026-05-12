import asyncio
import json
import os
from kafka import KafkaConsumer
from src.slack import send_slack_alert
from src.pagerduty import trigger_incident

KAFKA_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")


async def route_alert(data: dict):
    severity = data.get("severity", 0)
    attack_type = data.get("attack_type", "")
    event_type = data.get("event", "ATTACK")

    if event_type == "ANOMALY_DETECTED" or severity >= 90:
        await trigger_incident(data)
    if severity >= 60:
        await send_slack_alert(data)
    print(f"[Alerting] Routed alert: {attack_type} severity={severity}")


async def main():
    consumer = KafkaConsumer(
        "alerts",
        bootstrap_servers=KAFKA_SERVERS,
        group_id="alerting-group",
        auto_offset_reset="earliest",
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
    )

    print("[Alerting Service] Listening on 'alerts' topic")
    for msg in consumer:
        await route_alert(msg.value)


if __name__ == "__main__":
    asyncio.run(main())
