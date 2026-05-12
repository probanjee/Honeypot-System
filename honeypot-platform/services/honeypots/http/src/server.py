import asyncio
import os
import sys
from kafka import KafkaProducer

sys.path.insert(0, "/app")

from src.handlers import HTTPHoneypotHandler

KAFKA_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
HTTP_PORT = int(os.getenv("HTTP_PORT", 8080))


async def main():
    producer = KafkaProducer(
        bootstrap_servers=KAFKA_SERVERS,
        retries=5,
        retry_backoff_ms=500,
    )

    handler = HTTPHoneypotHandler(producer=producer, session_manager=None)

    server = await asyncio.start_server(
        handler.handle, "0.0.0.0", HTTP_PORT
    )
    print(f"[HTTP Honeypot] Listening on 0.0.0.0:{HTTP_PORT}")
    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())
