#!/usr/bin/env python3
"""
init_db.py – Create all tables and seed default rules/admin user.
Usage: python scripts/init_db.py
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://user:password@localhost:5432/honeypot")

from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings
from app.core.database import Base

# Import all models to register them with metadata
from app.models.orm.attack import Attack
from app.models.orm.session import HoneypotSession
from app.models.orm.threat import ThreatIntel


async def init():
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
    print("✅  All tables created successfully.")
    print("   - attacks")
    print("   - honeypot_sessions")
    print("   - threat_intel")


if __name__ == "__main__":
    asyncio.run(init())
