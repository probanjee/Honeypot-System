import asyncio
from abc import ABC, abstractmethod
from typing import Optional
from honeypots.base.logger import HoneypotLogger


class BaseHoneypot(ABC):
    """Abstract base class for all honeypot engines."""

    def __init__(self, host: str = "0.0.0.0", port: int = 9999, protocol: str = "TCP"):
        self.host = host
        self.port = port
        self.protocol = protocol
        self.logger = HoneypotLogger(protocol)
        self._server: Optional[asyncio.AbstractServer] = None
        self._running = False

    async def start(self):
        """Start the honeypot server."""
        self._running = True
        self._server = await asyncio.start_server(
            self.handle_client, self.host, self.port
        )
        self.logger.info(f"{self.protocol} honeypot listening on {self.host}:{self.port}")
        async with self._server:
            await self._server.serve_forever()

    async def stop(self):
        """Gracefully stop the honeypot server."""
        self._running = False
        if self._server:
            self._server.close()
            await self._server.wait_closed()
        self.logger.info(f"{self.protocol} honeypot stopped")

    @abstractmethod
    async def handle_client(
        self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter
    ):
        """Handle an incoming client connection."""
        ...
