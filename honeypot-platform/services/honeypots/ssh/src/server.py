import asyncio
import json
import os
import sys
from datetime import datetime, timezone

import paramiko
from kafka import KafkaProducer

KAFKA_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
SSH_PORT = int(os.getenv("SSH_PORT", 2222))

# ── Fake RSA host key ─────────────────────────────────────────────────────────
HOST_KEY = paramiko.RSAKey.generate(2048)


class FakeSSHServer(paramiko.ServerInterface):
    """Paramiko server interface that harvests credentials."""

    def __init__(self, producer: KafkaProducer, client_ip: str):
        self.producer = producer
        self.client_ip = client_ip
        self.event = asyncio.Event()

    def check_channel_request(self, kind, chanid):
        if kind == "session":
            return paramiko.OPEN_SUCCEEDED
        return paramiko.OPEN_FAILED_ADMINISTRATIVELY_PROHIBITED

    def check_auth_password(self, username: str, password: str):
        """Log all credentials, always deny real login."""
        event = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source_ip": self.client_ip,
            "source_port": 0,
            "protocol": "SSH",
            "attack_type": "Brute Force / Credential Stuffing",
            "payload": f"username={username} password={password}",
            "severity": 75,
            "credentials": {"username": username, "password": password},
        }
        try:
            self.producer.send("raw-attacks", json.dumps(event).encode())
        except Exception:
            pass
        return paramiko.AUTH_FAILED  # always deny

    def check_channel_shell_request(self, channel):
        self.event.set()
        return True

    def check_channel_pty_request(self, channel, term, width, height, pixelwidth, pixelheight, modes):
        return True


async def handle_ssh_client(reader, writer, producer: KafkaProducer):
    addr = writer.get_extra_info("peername")
    client_ip = addr[0] if addr else "0.0.0.0"

    transport = paramiko.Transport(writer.get_extra_info("socket"))
    transport.add_server_key(HOST_KEY)
    transport.local_version = "SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.6"

    server = FakeSSHServer(producer, client_ip)
    try:
        transport.start_server(server=server)
        chan = transport.accept(20)
        if chan is None:
            return
        # Send a fake shell prompt and wait
        chan.sendall(b"\r\nWelcome to Ubuntu 22.04.4 LTS (GNU/Linux 5.15.0-105-generic x86_64)\r\n")
        chan.sendall(b"Last login: Mon May  6 12:34:56 2024 from 10.0.0.1\r\n")
        chan.sendall(b"ubuntu@prod-server:~$ ")
        await asyncio.sleep(5)
        chan.close()
    except Exception:
        pass
    finally:
        transport.close()
        writer.close()


async def main():
    producer = KafkaProducer(
        bootstrap_servers=KAFKA_SERVERS,
        retries=5,
        retry_backoff_ms=500,
    )

    print(f"[SSH Honeypot] Listening on 0.0.0.0:{SSH_PORT}")
    server = await asyncio.start_server(
        lambda r, w: handle_ssh_client(r, w, producer),
        "0.0.0.0",
        SSH_PORT,
    )
    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())
