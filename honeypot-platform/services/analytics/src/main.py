import json
import os
import time
from collections import deque
from kafka import KafkaConsumer, KafkaProducer
import numpy as np

KAFKA_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
WINDOW_SECONDS = 300  # 5-minute sliding window


def detect_spike_mad(window: list[int]) -> bool:
    """
    Spike detection using Median Absolute Deviation (MAD).
    Returns True if the latest value is an outlier (>3 MAD above median).
    """
    if len(window) < 10:
        return False
    arr = np.array(window, dtype=float)
    median = np.median(arr)
    mad = np.median(np.abs(arr - median))
    if mad == 0:
        return False
    modified_z = 0.6745 * (arr[-1] - median) / mad
    return abs(modified_z) > 3.5


def main():
    consumer = KafkaConsumer(
        "enriched-attacks",
        bootstrap_servers=KAFKA_SERVERS,
        group_id="analytics-group",
        auto_offset_reset="earliest",
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
    )
    producer = KafkaProducer(
        bootstrap_servers=KAFKA_SERVERS,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    )

    # Sliding window: [(timestamp, severity), ...]
    window: deque = deque()
    severity_per_minute: list[int] = []
    last_bucket = int(time.time()) // 60

    print("[Analytics] Anomaly detection engine started")

    for msg in consumer:
        data = msg.value
        now = time.time()

        # Purge old events outside window
        while window and (now - window[0][0]) > WINDOW_SECONDS:
            window.popleft()

        window.append((now, data.get("severity", 0)))

        # Per-minute bucket aggregation
        current_bucket = int(now) // 60
        if current_bucket != last_bucket:
            bucket_severities = [s for t, s in window if int(t) // 60 == last_bucket]
            if bucket_severities:
                severity_per_minute.append(max(bucket_severities))
                if len(severity_per_minute) > 60:
                    severity_per_minute.pop(0)

            # Check for spike
            if detect_spike_mad(severity_per_minute):
                alert = {
                    "event": "ANOMALY_DETECTED",
                    "window_size": len(window),
                    "current_max_severity": max(s for _, s in window),
                    "attack_rate_per_min": len([t for t, _ in window if now - t < 60]),
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                }
                producer.send("alerts", value=alert)
                print(f"[Analytics] SPIKE ALERT: {alert}")

            last_bucket = current_bucket


if __name__ == "__main__":
    main()
