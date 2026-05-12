import asyncio
import json
import os
import sys
import re
from datetime import datetime, timezone

sys.path.insert(0, "/app")

from kafka import KafkaProducer

KAFKA_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
TOPIC = "raw-attacks"

# ── HTTP Attack signatures (subset of rules) ─────────────────────────────────
SQL_INJECTION = re.compile(
    r"(union.*select|select.*from|insert\s+into|drop\s+table|'.*or.*'|--|;--)",
    re.IGNORECASE,
)
XSS = re.compile(r"(<script|javascript:|onerror=|onload=|alert\()", re.IGNORECASE)
PATH_TRAVERSAL = re.compile(r"(\.\./|\.\./|%2e%2e%2f|%252e%252e%252f)", re.IGNORECASE)
CMD_INJECTION = re.compile(r"(;ls|;cat|;id|;whoami|\|\||\&\&|`[^`]+`)", re.IGNORECASE)


def _detect_attack_type(path: str, headers: str, body: str) -> str:
    combined = f"{path} {headers} {body}"
    if SQL_INJECTION.search(combined):
        return "SQL Injection"
    if XSS.search(combined):
        return "XSS"
    if PATH_TRAVERSAL.search(combined):
        return "Path Traversal"
    if CMD_INJECTION.search(combined):
        return "Command Injection"
    return "HTTP Probe"


def _score(attack_type: str) -> int:
    scores = {
        "SQL Injection": 90,
        "Command Injection": 95,
        "Path Traversal": 70,
        "XSS": 65,
        "HTTP Probe": 20,
    }
    return scores.get(attack_type, 20)


class HTTPHoneypotHandler:
    def __init__(self, producer: KafkaProducer, session_manager):
        self.producer = producer
        self.session_manager = session_manager

    async def handle(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        addr = writer.get_extra_info("peername")
        source_ip = addr[0] if addr else "0.0.0.0"
        source_port = addr[1] if addr else 0

        try:
            raw = await asyncio.wait_for(reader.read(8192), timeout=10.0)
        except asyncio.TimeoutError:
            writer.close()
            return

        try:
            decoded = raw.decode("utf-8", errors="replace")
        except Exception:
            decoded = ""

        lines = decoded.split("\r\n")
        request_line = lines[0] if lines else ""
        headers = "\r\n".join(lines[1:30])
        body = "\r\n".join(lines[30:]) if len(lines) > 30 else ""

        path = request_line.split(" ")[1] if len(request_line.split(" ")) > 1 else "/"
        attack_type = _detect_attack_type(path, headers, body)

        event = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source_ip": source_ip,
            "source_port": source_port,
            "protocol": "HTTP",
            "attack_type": attack_type,
            "payload": decoded[:4000],
            "severity": _score(attack_type),
            "headers": dict(
                line.split(": ", 1) for line in lines[1:] if ": " in line
            ),
        }

        try:
            self.producer.send(TOPIC, json.dumps(event).encode())
        except Exception as e:
            print(f"[HTTP Honeypot] Kafka send failed: {e}")

        # Serve a believable fake response
        if attack_type in ("SQL Injection", "Command Injection"):
            body_resp = b"500 Internal Server Error\r\n"
        else:
            body_resp = (
                b"<!DOCTYPE html><html><head><title>Index of /</title></head>"
                b"<body><h1>Index of /</h1><hr><pre>..    </pre><hr></body></html>"
            )

        response = (
            b"HTTP/1.1 200 OK\r\n"
            b"Server: Apache/2.4.41 (Ubuntu)\r\n"
            b"Content-Type: text/html\r\n"
            b"Connection: close\r\n\r\n" + body_resp
        )
        try:
            writer.write(response)
            await writer.drain()
        finally:
            writer.close()
