"""
GeoIP Enrichment Service (Phase 3)

Responsibilities:
1. Validates and inspects IP addresses using the standard library `ipaddress`.
2. Strictly screens out private, loopback, link-local, multicast, and reserved IPs.
3. Performs local lookup against MaxMind GeoLite2 databases (or test mock providers).
4. Treats missing/unreadable databases as degraded state (UNAVAILABLE), never as a fatal error.
5. Emits normalized GeoMetadata and status.

ATTRIBUTION DISCLAIMER:
IP Geolocation identifies network routing points and BGP allocation records.
It does NOT identify a confirmed human attacker or their physical residence.
Attackers routinely route malicious traffic through compromised proxies, Tor exit nodes,
VPNs, and cloud hosting infrastructure. Geolocation must never be treated as attribution.
"""

import ipaddress
import os
from dataclasses import dataclass
from typing import Optional, Dict, Any
import structlog

from ..models.events import GeoMetadata, ThreatIntelMetadata

logger = structlog.get_logger(__name__)


@dataclass
class GeoEnrichmentResult:
    is_private: bool
    geo: GeoMetadata
    threat_intel: ThreatIntelMetadata
    status: str  # "ENRICHED" | "SKIPPED_PRIVATE" | "UNAVAILABLE" | "INVALID_IP"


class GeoIPService:
    def __init__(
        self,
        database_path: Optional[str] = None,
        enabled: bool = True,
        override_lookup: Optional[Dict[str, Dict[str, Any]]] = None
    ):
        """
        :param database_path: Path to local GeoLite2-City.mmdb file.
        :param enabled: Flag allowing enrichment to be globally toggled.
        :param override_lookup: Optional dictionary mapping IP -> geo data for tests/overrides.
        """
        self.database_path = database_path or "data/GeoLite2-City.mmdb"
        self.enabled = enabled
        self.override_lookup = override_lookup or {}
        self._reader = None
        self._db_available = False

        if self.enabled:
            self._init_reader()

    def _init_reader(self) -> None:
        """Attempt to initialize local MaxMind reader if database file exists."""
        if not os.path.exists(self.database_path):
            logger.info(
                "geoip_database_not_found",
                path=self.database_path,
                msg="GeoIP enrichment operating in degraded state (UNAVAILABLE)"
            )
            self._db_available = False
            return

        try:
            # Lazy import geoip2 to avoid hard crash if not installed
            import geoip2.database
            self._reader = geoip2.database.Reader(self.database_path)
            self._db_available = True
            logger.info("geoip_database_loaded", path=self.database_path)
        except ImportError:
            logger.warning(
                "geoip2_library_missing",
                msg="geoip2 package not installed; falling back to degraded state"
            )
            self._db_available = False
        except Exception as exc:
            logger.error("geoip_database_init_failed", error=str(exc))
            self._db_available = False

    def is_eligible_ip(self, ip_str: str) -> tuple[bool, bool]:
        """
        Evaluates whether an IP address is valid and eligible for GeoIP enrichment.
        Returns (is_valid, is_private_or_reserved).
        Only globally reachable public IPs are eligible.
        """
        try:
            ip_obj = ipaddress.ip_address(ip_str.strip())
        except ValueError:
            return False, False

        # Check for loopback, private RFC-1918, link-local, multicast, reserved
        is_private_or_reserved = (
            ip_obj.is_private
            or ip_obj.is_loopback
            or ip_obj.is_link_local
            or ip_obj.is_multicast
            or ip_obj.is_reserved
            or ip_obj.is_unspecified
        )

        return True, is_private_or_reserved

    def enrich(self, ip_str: str) -> GeoEnrichmentResult:
        """
        Enriches an incoming IP address.
        Guarantees that no private/reserved IP is ever sent to external providers or resolved.
        """
        if not self.enabled:
            return GeoEnrichmentResult(
                is_private=False,
                geo=GeoMetadata(),
                threat_intel=ThreatIntelMetadata(status="UNAVAILABLE", provider="Disabled"),
                status="UNAVAILABLE"
            )

        is_valid, is_private_or_reserved = self.is_eligible_ip(ip_str)

        if not is_valid:
            logger.warning("invalid_ip_format", ip=ip_str)
            return GeoEnrichmentResult(
                is_private=False,
                geo=GeoMetadata(country="Unknown", country_code="XX", city="Unknown"),
                threat_intel=ThreatIntelMetadata(status="UNAVAILABLE", provider="ValidationFailed"),
                status="INVALID_IP"
            )

        if is_private_or_reserved:
            # Private, loopback, or reserved IP - NEVER attempt external lookup
            return GeoEnrichmentResult(
                is_private=True,
                geo=GeoMetadata(country="Private Network", country_code="XX", city="Private Network"),
                threat_intel=ThreatIntelMetadata(status="SKIPPED_PRIVATE", provider="InternalFilter"),
                status="SKIPPED_PRIVATE"
            )

        # ── Test / Static Override Lookup ─────────────────────────────────────
        if ip_str in self.override_lookup:
            data = self.override_lookup[ip_str]
            geo = GeoMetadata(
                country=data.get("country", "Unknown"),
                country_code=data.get("country_code", "XX"),
                city=data.get("city", "Unknown"),
                latitude=data.get("latitude"),
                longitude=data.get("longitude")
            )
            return GeoEnrichmentResult(
                is_private=False,
                geo=geo,
                threat_intel=ThreatIntelMetadata(
                    status="ENRICHED",
                    provider="StaticOverride",
                    threat_score=data.get("threat_score")
                ),
                status="ENRICHED"
            )

        # ── MaxMind MMDB Reader Lookup ────────────────────────────────────────
        if self._db_available and self._reader:
            try:
                response = self._reader.city(ip_str)
                country = response.country.name or "Unknown"
                country_code = response.country.iso_code or "XX"
                city = response.city.name or "Unknown"
                lat = float(response.location.latitude) if response.location.latitude else None
                lon = float(response.location.longitude) if response.location.longitude else None

                geo = GeoMetadata(
                    country=country,
                    country_code=country_code,
                    city=city,
                    latitude=lat,
                    longitude=lon
                )
                return GeoEnrichmentResult(
                    is_private=False,
                    geo=geo,
                    threat_intel=ThreatIntelMetadata(
                        status="ENRICHED",
                        provider=f"MaxMind-GeoLite2 ({os.path.basename(self.database_path)})"
                    ),
                    status="ENRICHED"
                )
            except Exception as exc:
                logger.warning("geoip_lookup_error", ip=ip_str, error=str(exc))
                return GeoEnrichmentResult(
                    is_private=False,
                    geo=GeoMetadata(),
                    threat_intel=ThreatIntelMetadata(status="UNAVAILABLE", provider="MaxMindLookupError"),
                    status="UNAVAILABLE"
                )

        # Degraded state: database unavailable
        return GeoEnrichmentResult(
            is_private=False,
            geo=GeoMetadata(),
            threat_intel=ThreatIntelMetadata(status="UNAVAILABLE", provider="LocalMaxMind (Unavailable)"),
            status="UNAVAILABLE"
        )

    def close(self) -> None:
        if self._reader:
            try:
                self._reader.close()
            except Exception:
                pass
