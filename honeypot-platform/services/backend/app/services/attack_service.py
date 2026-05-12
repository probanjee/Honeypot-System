import re
import yaml
import os
from datetime import datetime
from typing import List, Optional
from app.models.schemas import AttackCreate

# ── Load honeypot rules once at startup ──────────────────────────────────────

_RULES_PATH = os.path.join(
    os.path.dirname(__file__), "../../../../configs/honeypot-rules.yaml"
)

def _load_rules() -> dict:
    try:
        with open(_RULES_PATH) as f:
            return yaml.safe_load(f)
    except FileNotFoundError:
        return {"attack_signatures": []}

_rules = _load_rules()
_signatures: List[dict] = _rules.get("attack_signatures", [])


# ── Pattern detection ─────────────────────────────────────────────────────────

def _detect_attack_pattern(payload: str) -> tuple[List[str], int]:
    """
    Match payload against all known signatures.
    Returns a list of matched signature names and a cumulative score (0–100).
    """
    matched: List[str] = []
    total_score = 0

    for sig in _signatures:
        pattern = sig.get("pattern", "")
        name = sig.get("name", "unknown")
        weight = int(sig.get("weight", 10))
        try:
            if re.search(pattern, payload, re.IGNORECASE):
                matched.append(name)
                total_score += weight
        except re.error:
            continue

    # Clamp to 0–100
    return matched, min(total_score, 100)


# ── Severity classification ───────────────────────────────────────────────────

def _calculate_severity(score: int, protocol: str, payload: str) -> int:
    """
    Combine signature score with heuristics for final 0–100 severity.
    """
    severity = score

    # Protocol-based bonus
    if protocol.upper() == "SSH":
        severity = min(severity + 15, 100)

    # Payload length heuristic — very long payloads are suspicious
    if len(payload) > 2000:
        severity = min(severity + 10, 100)

    # Known dangerous keywords beyond signatures
    danger_keywords = ["exec", "eval", "base64_decode", "/etc/passwd", "cmd.exe", "powershell"]
    for kw in danger_keywords:
        if kw.lower() in payload.lower():
            severity = min(severity + 5, 100)
            break

    return severity


# ── Main service entry point ──────────────────────────────────────────────────

def process_raw_attack(raw: dict) -> Optional[AttackCreate]:
    """
    Enrich a raw attack event dict and return an AttackCreate ready for DB.
    Returns None if the event lacks mandatory fields.
    """
    payload = raw.get("payload", "")
    protocol = raw.get("protocol", "UNKNOWN")
    source_ip = raw.get("source_ip", "0.0.0.0")
    source_port = int(raw.get("source_port", 0))

    if not source_ip or source_ip == "0.0.0.0":
        return None

    signatures, score = _detect_attack_pattern(payload)
    severity = _calculate_severity(score, protocol, payload)

    # Derive attack_type from first matched signature, or use protocol default
    if signatures:
        attack_type = signatures[0]
    else:
        attack_type = raw.get("attack_type", f"{protocol} probe")

    return AttackCreate(
        source_ip=source_ip,
        source_port=source_port,
        protocol=protocol,
        attack_type=attack_type,
        payload=payload[:4000],          # trim to avoid DB bloat
        severity=severity,
        geo_country=raw.get("geo_country"),
        geo_city=raw.get("geo_city"),
        latitude=raw.get("latitude"),
        longitude=raw.get("longitude"),
        headers=raw.get("headers"),
        signatures=signatures,
        timestamp=datetime.fromisoformat(raw["timestamp"]) if "timestamp" in raw else datetime.utcnow(),
    )
