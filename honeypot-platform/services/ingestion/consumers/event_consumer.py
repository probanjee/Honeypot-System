import json
import os
import asyncpg
from kafka import KafkaConsumer, KafkaProducer
from datetime import datetime, timezone
try:
    from processors.attack_processor import sanitize_payload, enrich_with_geoip
except ImportError:
    from services.ingestion.processors.attack_processor import sanitize_payload, enrich_with_geoip

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

    producer = None
    try:
        producer = KafkaProducer(
            bootstrap_servers=KAFKA_SERVERS,
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        )
    except Exception as e:
        print(f"[Ingestion] Warning: Kafka producer for enriched-attacks not ready: {e}")

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
            signatures JSONB,
            blocked BOOLEAN DEFAULT FALSE
        )
        """
    )

    print("[Ingestion] Consumer started on topic 'raw-attacks'")
    try:
        while True:
            msg_pack = consumer.poll(timeout_ms=2000, max_records=batch_size)
            records = []
            enriched_events = []

            for tp, messages in msg_pack.items():
                for msg in messages:
                    data = msg.value
                    ip = data.get("source_ip", "")
                    raw_payload = data.get("payload", "")
                    cleaned_payload = sanitize_payload(raw_payload)[:4000]

                    # Enrich with GeoIP if missing
                    geo_country = data.get("geo_country")
                    geo_city = data.get("geo_city")
                    lat = data.get("latitude") or data.get("geo_lat")
                    lon = data.get("longitude") or data.get("geo_lon")

                    if not geo_country or geo_country == "Unknown":
                        geo_info = enrich_with_geoip(ip)
                        geo_country = geo_info.get("geo_country", "Unknown")
                        geo_city = geo_info.get("geo_city", "Unknown")
                        lat = geo_info.get("latitude", 0.0)
                        lon = geo_info.get("longitude", 0.0)

                    # Normalize timestamp
                    ts_str = data.get("timestamp")
                    if ts_str:
                        try:
                            ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                        except Exception:
                            ts = datetime.now(timezone.utc)
                    else:
                        ts = datetime.now(timezone.utc)

                    records.append((
                        ts,
                        ip,
                        data.get("source_port", 0),
                        data.get("protocol", "UNKNOWN"),
                        data.get("attack_type", "Unknown"),
                        cleaned_payload,
                        data.get("severity", 0),
                        geo_country,
                        geo_city,
                        lat,
                        lon,
                        json.dumps(data.get("headers")) if data.get("headers") else None,
                        json.dumps(data.get("signatures")) if data.get("signatures") else None,
                        data.get("blocked", False),
                    ))

                    enriched_event = {
                        **data,
                        "payload": cleaned_payload,
                        "geo_country": geo_country,
                        "geo_city": geo_city,
                        "latitude": lat,
                        "longitude": lon,
                        "timestamp": ts.isoformat(),
                    }
                    enriched_events.append(enriched_event)

            if records:
                await conn.executemany(
                    """
                    INSERT INTO attacks
                      (timestamp, source_ip, source_port, protocol, attack_type, payload,
                       severity, geo_country, geo_city, latitude, longitude, headers, signatures, blocked)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
                    """,
                    records,
                )
                consumer.commit()
                print(f"[Ingestion] Committed {len(records)} records to PostgreSQL")

                # Forward enriched attacks to 'enriched-attacks' topic
                if producer:
                    for ev in enriched_events:
                        try:
                            producer.send("enriched-attacks", ev)
                        except Exception as pe:
                            print(f"[Ingestion] Error sending to enriched-attacks: {pe}")
                    producer.flush()
    finally:
        await conn.close()
        consumer.close()
        if producer:
            producer.close()
