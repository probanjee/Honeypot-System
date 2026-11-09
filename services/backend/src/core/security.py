"""
Security Utilities: HMAC Cursor Signing, Verification, and Sanitization
Prevents client tampering with keyset pagination parameters.
"""

import base64
import hashlib
import hmac
import json
import uuid
from datetime import datetime, timezone
from typing import Tuple, Optional


class InvalidCursorException(Exception):
    """Raised when pagination cursor is malformed, expired, or tampered with."""
    pass


def encode_cursor(timestamp: datetime, record_id: uuid.UUID, secret: str) -> str:
    """
    Serializes (timestamp, record_id) into a tamper-evident HMAC-signed base64url string.
    Format: <base64url_payload>.<base64url_hmac_signature>
    """
    # Ensure UTC timezone
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)
    else:
        timestamp = timestamp.astimezone(timezone.utc)

    payload_dict = {
        "ts": timestamp.isoformat(),
        "id": str(record_id)
    }
    raw_json = json.dumps(payload_dict, separators=(',', ':')).encode("utf-8")
    b64_payload = base64.urlsafe_b64encode(raw_json).decode("utf-8").rstrip("=")

    # Generate HMAC-SHA256 signature
    sig = hmac.new(
        secret.encode("utf-8"),
        b64_payload.encode("utf-8"),
        hashlib.sha256
    ).digest()
    b64_sig = base64.urlsafe_b64encode(sig).decode("utf-8").rstrip("=")

    return f"{b64_payload}.{b64_sig}"


def decode_cursor(cursor_str: str, secret: str) -> Tuple[datetime, uuid.UUID]:
    """
    Decodes and validates HMAC signature of a cursor token.
    Returns (datetime, UUID) or raises InvalidCursorException.
    """
    if not cursor_str or not isinstance(cursor_str, str):
        raise InvalidCursorException("Cursor must be a non-empty string")

    parts = cursor_str.split(".")
    if len(parts) != 2:
        raise InvalidCursorException("Cursor structure is invalid (missing signature separator)")

    b64_payload, b64_sig = parts[0], parts[1]

    # Re-calculate and verify HMAC using constant-time comparison
    expected_sig = hmac.new(
        secret.encode("utf-8"),
        b64_payload.encode("utf-8"),
        hashlib.sha256
    ).digest()
    expected_b64_sig = base64.urlsafe_b64encode(expected_sig).decode("utf-8").rstrip("=")

    if not hmac.compare_digest(b64_sig, expected_b64_sig):
        raise InvalidCursorException("Cursor signature verification failed: token has been tampered with")

    # Decode base64 payload with padding recovery
    padding = '=' * (4 - (len(b64_payload) % 4)) if len(b64_payload) % 4 != 0 else ''
    try:
        raw_json = base64.urlsafe_b64decode(b64_payload + padding)
        data = json.loads(raw_json)
    except Exception as exc:
        raise InvalidCursorException(f"Cursor payload could not be decoded: {str(exc)}")

    if not isinstance(data, dict) or "ts" not in data or "id" not in data:
        raise InvalidCursorException("Cursor payload missing required 'ts' or 'id' fields")

    try:
        ts = datetime.fromisoformat(data["ts"])
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        record_id = uuid.UUID(data["id"])
    except Exception as exc:
        raise InvalidCursorException(f"Cursor timestamp or UUID format invalid: {str(exc)}")

    return ts, record_id
