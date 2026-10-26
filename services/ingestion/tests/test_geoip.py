"""
Unit tests for GeoIP Enrichment, IP screening, and graceful degradation
"""

import pytest
from src.geoip.service import GeoIPService


def test_private_rfc1918_ips_are_skipped():
    svc = GeoIPService(enabled=True)
    private_ips = [
        "10.0.0.1",
        "10.254.1.50",
        "172.16.0.1",
        "172.31.255.255",
        "192.168.1.1",
        "192.168.100.200"
    ]

    for ip in private_ips:
        res = svc.enrich(ip)
        assert res.is_private is True
        assert res.status == "SKIPPED_PRIVATE"
        assert res.geo.country == "Private Network"
        assert res.geo.country_code == "XX"
        assert res.threat_intel.status == "SKIPPED_PRIVATE"


def test_loopback_and_special_ranges_are_skipped():
    svc = GeoIPService(enabled=True)
    special_ips = [
        "127.0.0.1",       # Loopback IPv4
        "::1",             # Loopback IPv6
        "169.254.1.1",     # Link-local
        "224.0.0.1",       # Multicast
        "0.0.0.0",         # Unspecified
        "240.0.0.1"        # Reserved
    ]

    for ip in special_ips:
        res = svc.enrich(ip)
        assert res.is_private is True
        assert res.status == "SKIPPED_PRIVATE"


def test_invalid_ip_format():
    svc = GeoIPService(enabled=True)
    invalid_ips = ["999.999.999.999", "localhost", "foo.bar", "1.2.3.4.5"]

    for ip in invalid_ips:
        res = svc.enrich(ip)
        assert res.is_private is False
        assert res.status == "INVALID_IP"
        assert res.geo.country == "Unknown"
        assert res.geo.country_code == "XX"


def test_public_ip_degraded_when_database_unavailable():
    # Database path does not exist
    svc = GeoIPService(database_path="nonexistent/path/GeoLite2-City.mmdb", enabled=True)
    res = svc.enrich("93.184.216.34")  # example.com public IP

    assert res.is_private is False
    assert res.status == "UNAVAILABLE"
    assert res.geo.country == "Unknown"
    assert res.geo.country_code == "XX"
    assert res.geo.latitude is None
    assert res.threat_intel.status == "UNAVAILABLE"


def test_public_ip_enriched_when_data_available():
    override = {
        "142.250.190.46": {
            "country": "Germany",
            "country_code": "DE",
            "city": "Frankfurt",
            "latitude": 50.1109,
            "longitude": 8.6821,
            "threat_score": 45
        }
    }
    svc = GeoIPService(enabled=True, override_lookup=override)
    res = svc.enrich("142.250.190.46")

    assert res.is_private is False
    assert res.status == "ENRICHED"
    assert res.geo.country == "Germany"
    assert res.geo.country_code == "DE"
    assert res.geo.city == "Frankfurt"
    assert res.geo.latitude == 50.1109
    assert res.geo.longitude == 8.6821
    assert res.threat_intel.status == "ENRICHED"


def test_geoip_service_disabled():
    svc = GeoIPService(enabled=False)
    res = svc.enrich("8.8.8.8")
    assert res.status == "UNAVAILABLE"
    assert res.threat_intel.provider == "Disabled"
