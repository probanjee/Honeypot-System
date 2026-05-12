from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.models.orm.attack import Attack
from app.models.schemas import AttackCreate
from typing import Optional


class AttackRepository:
    async def save_attack(self, db: AsyncSession, attack_in: AttackCreate):
        db_attack = Attack(**attack_in.model_dump())
        db.add(db_attack)
        await db.commit()
        await db.refresh(db_attack)
        return db_attack

    async def get_attacks_with_filters(
        self,
        db: AsyncSession,
        skip: int,
        limit: int,
        type: Optional[str] = None,
        ip: Optional[str] = None,
    ):
        query = select(Attack)
        if type:
            query = query.filter(Attack.attack_type.ilike(f"%{type}%"))
        if ip:
            query = query.filter(Attack.source_ip == ip)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar()
        result = await db.execute(
            query.offset(skip).limit(limit).order_by(Attack.timestamp.desc())
        )
        return result.scalars().all(), total

    async def get_attack_by_id(self, db: AsyncSession, id: int):
        result = await db.execute(select(Attack).filter(Attack.id == id))
        return result.scalar_one_or_none()

    async def get_attack_stats(self, db: AsyncSession):
        total = (await db.execute(select(func.count(Attack.id)))).scalar()
        by_type = (
            await db.execute(
                select(Attack.attack_type, func.count(Attack.id)).group_by(Attack.attack_type)
            )
        ).all()
        by_severity = (
            await db.execute(
                select(Attack.severity, func.count(Attack.id)).group_by(Attack.severity)
            )
        ).all()
        return {
            "total": total,
            "by_type": {row[0]: row[1] for row in by_type},
            "by_severity": {row[0]: row[1] for row in by_severity},
        }

    async def get_attack_stats_by_hour(self, db: AsyncSession):
        query = (
            select(
                func.date_trunc("hour", Attack.timestamp).label("hour"),
                func.count(Attack.id).label("count"),
            )
            .group_by("hour")
            .order_by("hour")
        )
        result = await db.execute(query)
        return [{"time": str(row[0]), "count": row[1]} for row in result.all()]

    async def search_attacks(
        self,
        db: AsyncSession,
        query_str: str,
        limit: int = 50,
        severity_min: Optional[int] = None,
        attack_type: Optional[str] = None,
    ):
        query = select(Attack).filter(
            or_(
                Attack.payload.ilike(f"%{query_str}%"),
                Attack.source_ip.ilike(f"%{query_str}%"),
                Attack.attack_type.ilike(f"%{query_str}%"),
            )
        )
        if severity_min is not None:
            query = query.filter(Attack.severity >= severity_min)
        if attack_type:
            query = query.filter(Attack.attack_type.ilike(f"%{attack_type}%"))
        result = await db.execute(query.order_by(Attack.timestamp.desc()).limit(limit))
        return result.scalars().all()
