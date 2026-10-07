import asyncio
import json
import os
from kafka import KafkaConsumer
from src.abuseipdb import query_abuseipdb
from src.shodan import query_shodan

KAFKA_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")


async def enrich_ip(ip: str) -> dict:
    abuse_task = asyncio.create_task(query_abuseipdb(ip))
    shodan_task = asyncio.create_task(query_shodan(ip))
    abuse_data, shodan_data = await asyncio.gather(abuse_task, shodan_task)
    return {
        "ip": ip,
        "abuseipdb_score": abuse_data.get("abuseConfidenceScore", 0),
        "abuseipdb_reports": abuse_data.get("totalReports", 0),
        "shodan_ports": shodan_data.get("ports", []),
        "shodan_tags": shodan_data.get("tags", []),
    }


async def main():
    consumer = KafkaConsumer(
        "raw-attacks",
        bootstrap_servers=KAFKA_SERVERS,
        group_id="threat-intel-group",
        auto_offset_reset="earliest",
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
    )

    seen_ips: set[str] = set()
    print("[Threat Intel] Service started")

    for msg in consumer:
        data = msg.value
        ip = data.get("source_ip", "")
        if not ip or ip in seen_ips:
            continue
        seen_ips.add(ip)
        # Keep cache from growing unboundedly
        if len(seen_ips) > 10000:
            seen_ips.clear()

        enriched = await enrich_ip(ip)
        print(f"[Threat Intel] Enriched {ip}: AbuseScore={enriched['abuseipdb_score']}")


if __name__ == "__main__":
    asyncio.run(main())
