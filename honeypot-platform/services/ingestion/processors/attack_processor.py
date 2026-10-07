import re
import json
from typing import Dict


_BINARY_RE = re.compile(rb"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\xff]")
_IP_RE = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")


def sanitize_payload(raw: bytes | str) -> str:
    """Remove non-printable / binary characters from raw payload."""
    if isinstance(raw, bytes):
        cleaned = _BINARY_RE.sub(b"", raw)
        return cleaned.decode("utf-8", errors="replace")
    return raw


def extract_ips(text: str) -> list[str]:
    """Extract all IPv4 addresses from a text blob."""
    return list(set(_IP_RE.findall(text)))


def enrich_with_geoip(ip: str) -> dict:
    """
    Attempt GeoIP lookup. Falls back to mock data if MaxMind DB unavailable.
    """
    try:
        import maxminddb
        with maxminddb.open_database("/app/GeoLite2-City.mmdb") as reader:
            record = reader.get(ip)
            if record:
                country = record.get("country", {}).get("names", {}).get("en")
                city = record.get("city", {}).get("names", {}).get("en")
                loc = record.get("location", {})
                return {
                    "geo_country": country,
                    "geo_city": city,
                    "latitude": loc.get("latitude"),
                    "longitude": loc.get("longitude"),
                }
    except Exception:
        pass

    # Mock fallback for prototype
    mock_data = {
        "45.": {"geo_country": "Germany", "geo_city": "Frankfurt", "latitude": 50.11, "longitude": 8.68},
        "104.": {"geo_country": "United States", "geo_city": "San Jose", "latitude": 37.33, "longitude": -121.89},
        "192.168.": {"geo_country": "Private", "geo_city": "LAN", "latitude": 0.0, "longitude": 0.0},
    }
    for prefix, data in mock_data.items():
        if ip.startswith(prefix):
            return data

    return {
        "geo_country": "Unknown",
        "geo_city": "Unknown",
        "latitude": 0.0,
        "longitude": 0.0,
    }
