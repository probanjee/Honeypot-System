import json
import os
import asyncpg
from kafka import KafkaConsumer
from datetime import datetime

KAFKA_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
DB_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/honeypot")

# Convert asyncpg DSN to plain psycopg DSN for asyncpg
DB_DSN = DB_URL.replace("postgresql+asyncpg://", "postgresql://")


async def consume_batch(batch_size: int = 100):
    consumer = KafkaConsumer(
        "raw-attacks",
        bootstrap_servers=KAFKA_SERVERS,
        group_id="ingestion-group",
        auto_offset_reset="earliest",
        enable_auto_commit=False,
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
        max_poll_records=batch_size,
    )

    conn = await asyncpg.connect(dsn=DB_DSN)
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS attacks (
            id SERIAL PRIMARY KEY,
            timestamp TIMESTAMPTZ DEFAULT NOW(),
            source_ip TEXT,
            source_port INT,
            protocol TEXT,
            attack_type TEXT,
            payload TEXT,
            severity INT,
            geo_country TEXT,
            geo_city TEXT,
            latitude FLOAT,
            longitude FLOAT,
            headers JSONB,
            signatures JSONB
        )
        """
    )

    print("[Ingestion] Consumer started on topic 'raw-attacks'")
    try:
        while True:
            msg_pack = consumer.poll(timeout_ms=2000, max_records=batch_size)
            records = []
            for tp, messages in msg_pack.items():
                for msg in messages:
                    data = msg.value
                    records.append((
                        datetime.fromisoformat(data.get("timestamp", datetime.utcnow().isoformat())),
                        data.get("source_ip", ""),
                        data.get("source_port", 0),
                        data.get("protocol", "UNKNOWN"),
                        data.get("attack_type", "Unknown"),
                        data.get("payload", "")[:4000],
                        data.get("severity", 0),
                        data.get("geo_country"),
                        data.get("geo_city"),
                        data.get("latitude"),
                        data.get("longitude"),
                        json.dumps(data.get("headers")) if data.get("headers") else None,
                        json.dumps(data.get("signatures")) if data.get("signatures") else None,
                    ))

            if records:
                await conn.executemany(
                    """
                    INSERT INTO attacks
                      (timestamp, source_ip, source_port, protocol, attack_type, payload,
                       severity, geo_country, geo_city, latitude, longitude, headers, signatures)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
                    """,
                    records,
                )
                consumer.commit()
                print(f"[Ingestion] Committed {len(records)} records")
    finally:
        await conn.close()
        consumer.close()
