import json
import logging
import sys
from datetime import datetime


class HoneypotLogger:
    """Structured JSON logger for honeypot events."""

    def __init__(self, component: str):
        self.component = component
        self._log = logging.getLogger(component)
        if not self._log.handlers:
            handler = logging.StreamHandler(sys.stdout)
            handler.setFormatter(logging.Formatter("%(message)s"))
            self._log.addHandler(handler)
            self._log.setLevel(logging.DEBUG)

    def _emit(self, level: str, message: str, extra: dict = None):
        record = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": level,
            "component": self.component,
            "message": message,
        }
        if extra:
            record.update(extra)
        line = json.dumps(record)
        if level == "ERROR":
            self._log.error(line)
        elif level == "WARNING":
            self._log.warning(line)
        elif level == "DEBUG":
            self._log.debug(line)
        else:
            self._log.info(line)

    def info(self, message: str, **kwargs):
        self._emit("INFO", message, kwargs or None)

    def warning(self, message: str, **kwargs):
        self._emit("WARNING", message, kwargs or None)

    def error(self, message: str, **kwargs):
        self._emit("ERROR", message, kwargs or None)

    def debug(self, message: str, **kwargs):
        self._emit("DEBUG", message, kwargs or None)
