import uuid
import time
from typing import Dict
from honeypots.base.logger import HoneypotLogger

logger = HoneypotLogger("SessionManager")


class SessionManager:
    """Tracks all active honeypot sessions in memory."""

    def __init__(self):
        self._sessions: Dict[str, dict] = {}

    def generate_session_id(self) -> str:
        return str(uuid.uuid4())

    def track_session(self, session_id: str, ip: str, protocol: str) -> dict:
        session = {
            "session_id": session_id,
            "ip": ip,
            "protocol": protocol,
            "start_time": time.time(),
            "bytes_transferred": 0,
            "commands": [],
        }
        self._sessions[session_id] = session
        logger.info(f"Session {session_id} started from {ip} [{protocol}]")
        return session

    def log_interaction(self, session_id: str, data: bytes, direction: str = "recv"):
        if session_id not in self._sessions:
            return
        sess = self._sessions[session_id]
        sess["bytes_transferred"] += len(data)
        if direction == "recv":
            try:
                decoded = data.decode("utf-8", errors="replace").strip()
            except Exception:
                decoded = repr(data)
            sess["commands"].append(decoded)
            logger.info(f"[{session_id}] CMD: {decoded[:200]}")

    def end_session(self, session_id: str) -> dict:
        sess = self._sessions.pop(session_id, {})
        if sess:
            duration = time.time() - sess["start_time"]
            logger.info(
                f"Session {session_id} ended. Duration={duration:.1f}s "
                f"Bytes={sess['bytes_transferred']} Commands={len(sess['commands'])}"
            )
        return sess

    def get_active_sessions(self) -> list:
        return list(self._sessions.values())
