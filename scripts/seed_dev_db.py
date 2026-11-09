import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone, timedelta
import random

# Add project root to sys.path
repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_root = os.path.join(repo_root, "services", "backend")
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from src.models.base import Base
from src.models.attack import Attack, AttackSignature

DB_PATH = os.path.join(backend_root, "vigilance_dev.db")
SQLITE_URL = f"sqlite+aiosqlite:///{DB_PATH.replace(os.sep, '/')}"
POSTGRES_URL = "postgresql+asyncpg://vigilance_user:vigilance_password@127.0.0.1:5432/vigilance_db"
DB_URL = os.getenv("DATABASE_URL", POSTGRES_URL)

ATTACK_PRESETS = [
    {
        "category": "SQL_INJECTION",
        "method": "POST",
        "path": "/api/v1/auth/login",
        "severity": "CRITICAL",
        "score": 95,
        "user_agent": "sqlmap/1.7.2#stable",
        "country": "Germany",
        "code": "DE",
        "city": "Frankfurt",
        "lat": 50.1109,
        "lon": 8.6821,
        "rules": [
            ("SIG-SQLI-001", "SQL Injection - UNION SELECT Attack", 90),
            ("SIG-SQLI-003", "SQL Injection - OR 1=1 Authentication Bypass", 85)
        ]
    },
    {
        "category": "PATH_TRAVERSAL",
        "method": "GET",
        "path": "/public/download?file=../../../../etc/passwd",
        "severity": "HIGH",
        "score": 82,
        "user_agent": "Mozilla/5.0 (compatible; Nessus/8.15.1)",
        "country": "Netherlands",
        "code": "NL",
        "city": "Amsterdam",
        "lat": 52.3676,
        "lon": 4.9041,
        "rules": [
            ("SIG-TRAV-001", "Path Traversal Directory Escape /etc/passwd", 80)
        ]
    },
    {
        "category": "COMMAND_INJECTION",
        "method": "POST",
        "path": "/api/v1/system/ping",
        "severity": "CRITICAL",
        "score": 98,
        "user_agent": "Python-urllib/3.10",
        "country": "United States",
        "code": "US",
        "city": "Ashburn",
        "lat": 39.0438,
        "lon": -77.4874,
        "rules": [
            ("SIG-CMDI-001", "OS Command Injection via Shell Metacharacters", 95),
            ("SIG-CMDI-002", "Suspicious Reverse Shell Command Detected", 90)
        ]
    },
    {
        "category": "AUTH_BYPASS",
        "method": "GET",
        "path": "/admin/config.php",
        "severity": "HIGH",
        "score": 78,
        "user_agent": "curl/7.88.1",
        "country": "United Kingdom",
        "code": "GB",
        "city": "London",
        "lat": 51.5074,
        "lon": -0.1278,
        "rules": [
            ("SIG-AUTH-002", "Privileged Administrative Endpoint Probe", 75)
        ]
    },
    {
        "category": "REMOTE_CODE_EXECUTION",
        "method": "POST",
        "path": "/api/v1/tournaments/submit",
        "severity": "CRITICAL",
        "score": 96,
        "user_agent": "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0",
        "country": "France",
        "code": "FR",
        "city": "Paris",
        "lat": 48.8566,
        "lon": 2.3522,
        "rules": [
            ("SIG-RCE-001", "Log4Shell JNDI LDAP Injection Pattern", 95)
        ]
    },
    {
        "category": "PROBING",
        "method": "GET",
        "path": "/.env",
        "severity": "MEDIUM",
        "score": 58,
        "user_agent": "Go-http-client/1.1",
        "country": "Japan",
        "code": "JP",
        "city": "Tokyo",
        "lat": 35.6762,
        "lon": 139.6503,
        "rules": [
            ("SIG-PROBE-001", "Environment Secrets (.env) Scan", 60)
        ]
    },
    {
        "category": "BRUTE_FORCE",
        "method": "POST",
        "path": "/admin/login",
        "severity": "HIGH",
        "score": 74,
        "user_agent": "Hydra/9.5",
        "country": "Singapore",
        "code": "SG",
        "city": "Singapore",
        "lat": 1.3521,
        "lon": 103.8198,
        "rules": [
            ("SIG-BRUTE-001", "Credential Stuffing Burst Pattern", 70)
        ]
    },
    {
        "category": "SSRF",
        "method": "GET",
        "path": "/api/v1/fetch?url=http://169.254.169.254/latest/meta-data/",
        "severity": "CRITICAL",
        "score": 92,
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "country": "Canada",
        "code": "CA",
        "city": "Montreal",
        "lat": 45.5017,
        "lon": -73.5673,
        "rules": [
            ("SIG-SSRF-001", "AWS Cloud Metadata Endpoint SSRF Probe", 90)
        ]
    },
    {
        "category": "SCANNING",
        "method": "GET",
        "path": "/actuator/health",
        "severity": "LOW",
        "score": 35,
        "user_agent": "Mozilla/5.0 (compatible; censys/1.0)",
        "country": "Australia",
        "code": "AU",
        "city": "Sydney",
        "lat": -33.8688,
        "lon": 151.2093,
        "rules": [
            ("SIG-SCAN-001", "Spring Boot Actuator Information Disclosure Probe", 35)
        ]
    },
    {
        "category": "PROBING",
        "method": "GET",
        "path": "/internal/test",
        "severity": "INFORMATIONAL",
        "score": 15,
        "user_agent": "Internal-Monitoring-Agent/2.4",
        "country": "Private Network",
        "code": "XX",
        "city": "Local Subnet",
        "lat": None,
        "lon": None,
        "is_private": True,
        "source_ip": "192.168.1.105",
        "rules": [
            ("SIG-INFO-001", "Routine Internal Decoy Health Probe", 10)
        ]
    }
]


async def seed():
    print(f"Connecting to database at {DB_URL}...")
    engine = create_async_engine(DB_URL, echo=False)

    async with engine.begin() as conn:
        print("Creating tables if not exists...")
        await conn.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    now = datetime.now(timezone.utc)

    async with session_maker() as session:
        print("Seeding sample attacks...")
        # Create 30 attacks spread over the last 12 hours
        for i in range(30):
            preset = ATTACK_PRESETS[i % len(ATTACK_PRESETS)]
            event_id = uuid.uuid4()
            # Stagger timestamps across the last 12 hours
            ts = now - timedelta(minutes=(30 - i) * 20 + random.randint(0, 10))

            is_priv = preset.get("is_private", False)
            if is_priv:
                ip = preset.get("source_ip", "10.0.0.45")
            else:
                ip = f"{random.randint(40, 200)}.{random.randint(10, 250)}.{random.randint(1, 250)}.{random.randint(1, 250)}"

            attack = Attack(
                id=event_id,
                mongo_raw_id=f"mongo_{uuid.uuid4().hex[:16]}",
                timestamp=ts,
                ingested_at=ts + timedelta(seconds=1),
                source_ip=ip,
                source_port=random.randint(1024, 65535),
                is_private_ip=is_priv,
                http_method=preset["method"],
                request_path=preset["path"],
                protocol="HTTP/1.1",
                primary_category=preset["category"],
                severity_score=preset["score"],
                severity_level=preset["severity"],
                user_agent=preset["user_agent"],
                detection_summary={
                    "rule_count": len(preset["rules"]),
                    "max_weight": preset["score"]
                },
                processing_metadata={"seed": True, "env": "dev"},
                geo_country=preset["country"],
                geo_country_code=preset["code"],
                geo_city=preset["city"],
                geo_latitude=preset["lat"],
                geo_longitude=preset["lon"],
                geoip_status="SKIPPED_PRIVATE" if is_priv else "ENRICHED",
                schema_version="1.0.0"
            )
            session.add(attack)

            # Add signatures
            for sig_id, sig_name, sig_weight in preset["rules"]:
                sig = AttackSignature(
                    id=uuid.uuid4(),
                    attack_id=event_id,
                    signature_id=sig_id,
                    rule_name=sig_name,
                    category=preset["category"],
                    weight=sig_weight
                )
                session.add(sig)

        await session.commit()
        print(f"Successfully seeded 30 attack events and their matched signatures.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
