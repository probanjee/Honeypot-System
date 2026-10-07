import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../services/ingestion"))

from processors.attack_processor import sanitize_payload, extract_ips, enrich_with_geoip


class TestSanitizePayload:
    def test_strips_binary_from_bytes(self):
        raw = b"GET /path HTTP/1.1\x00\x01\x02\r\nHost: example.com"
        result = sanitize_payload(raw)
        assert "\x00" not in result
        assert "GET /path" in result

    def test_passthrough_string(self):
        text = "normal ascii text"
        assert sanitize_payload(text) == text

    def test_handles_null_bytes(self):
        raw = b"shell\x00command\x01injection"
        result = sanitize_payload(raw)
        assert "\x00" not in result
        assert "\x01" not in result


class TestExtractIPs:
    def test_extracts_single_ip(self):
        text = "Attack from 192.168.1.1 detected"
        ips = extract_ips(text)
        assert "192.168.1.1" in ips

    def test_extracts_multiple_ips(self):
        text = "Hop 1: 10.0.0.1, Hop 2: 192.168.1.1, Hop 3: 8.8.8.8"
        ips = extract_ips(text)
        assert len(ips) >= 3

    def test_deduplicates_ips(self):
        text = "10.0.0.1 tried 10.0.0.1 again"
        ips = extract_ips(text)
        assert ips.count("10.0.0.1") == 1

    def test_returns_empty_for_no_ips(self):
        text = "no ip addresses here"
        assert extract_ips(text) == []


class TestEnrichWithGeoip:
    def test_returns_dict(self):
        result = enrich_with_geoip("45.33.12.9")
        assert isinstance(result, dict)
        assert "geo_country" in result

    def test_private_ip_mock(self):
        result = enrich_with_geoip("192.168.1.1")
        assert result["geo_country"] == "Private"

    def test_unknown_ip_fallback(self):
        result = enrich_with_geoip("1.2.3.4")
        assert result.get("geo_country") is not None
