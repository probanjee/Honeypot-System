from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from app.models.orm.threat import ThreatIntel
from datetime import datetime


class ThreatRepository:
    async def upsert_threat_intel(self, db: AsyncSession, data: dict) -> ThreatIntel:
        stmt = insert(ThreatIntel).values(**data, last_updated=datetime.utcnow())
        stmt = stmt.on_conflict_do_update(
            index_elements=["ip_address"],
            set_={**{k: stmt.excluded[k] for k in data if k != "ip_address"},
                  "last_updated": datetime.utcnow()},
        )
        await db.execute(stmt)
        await db.commit()
        result = await db.execute(
            select(ThreatIntel).where(ThreatIntel.ip_address == data["ip_address"])
        )
        return result.scalar_one_or_none()

    async def get_threat_by_ip(self, db: AsyncSession, ip: str):
        result = await db.execute(
            select(ThreatIntel).where(ThreatIntel.ip_address == ip)
        )
        return result.scalar_one_or_none()
