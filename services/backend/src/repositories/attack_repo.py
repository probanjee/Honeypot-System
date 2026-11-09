"""
Repository for PostgreSQL Attack and Signature Queries
Implements Keyset (Cursor) Pagination, Filter Construction, and Database-side Aggregations.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy import select, func, and_, or_, distinct
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.attack import Attack, AttackSignature


class AttackRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, attack_id: uuid.UUID) -> Optional[Attack]:
        """Fetch a single attack by its UUID with associated signatures eagerly loaded."""
        stmt = (
            select(Attack)
            .where(Attack.id == attack_id)
            .options(selectinload(Attack.signatures))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_signatures_by_attack_id(self, attack_id: uuid.UUID) -> List[AttackSignature]:
        """Fetch all matched signatures for a given attack."""
        stmt = (
            select(AttackSignature)
            .where(AttackSignature.attack_id == attack_id)
            .order_by(AttackSignature.weight.desc(), AttackSignature.signature_id.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_attacks(
        self,
        limit: int = 20,
        cursor_data: Optional[Tuple[datetime, uuid.UUID]] = None,
        severity: Optional[str] = None,
        min_score: Optional[int] = None,
        max_score: Optional[int] = None,
        signature: Optional[str] = None,
        source_ip: Optional[str] = None,
        country: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        sort: str = "desc"
    ) -> Tuple[List[Attack], bool]:
        """
        Keyset cursor-based list query.
        Returns (items, has_more).
        Fetches limit + 1 items to determine if a subsequent page exists.
        """
        stmt = select(Attack)

        # Optional join for signature rule filtering
        if signature:
            stmt = stmt.join(Attack.signatures).where(
                or_(
                    AttackSignature.signature_id == signature,
                    AttackSignature.rule_name.ilike(f"%{signature}%"),
                    AttackSignature.category.ilike(f"%{signature}%")
                )
            ).distinct()

        # Build filter conditions
        conditions = []
        if severity:
            conditions.append(Attack.severity_level == severity)
        if min_score is not None:
            conditions.append(Attack.severity_score >= min_score)
        if max_score is not None:
            conditions.append(Attack.severity_score <= max_score)
        if source_ip:
            conditions.append(Attack.source_ip == source_ip)
        if country:
            conditions.append(Attack.geo_country_code == country)
        if start_time:
            conditions.append(Attack.timestamp >= start_time)
        if end_time:
            conditions.append(Attack.timestamp <= end_time)

        # Keyset Cursor Clause
        if cursor_data:
            cursor_ts, cursor_id = cursor_data
            if sort == "desc":
                cursor_clause = or_(
                    Attack.timestamp < cursor_ts,
                    and_(Attack.timestamp == cursor_ts, Attack.id < cursor_id)
                )
            else:
                cursor_clause = or_(
                    Attack.timestamp > cursor_ts,
                    and_(Attack.timestamp == cursor_ts, Attack.id > cursor_id)
                )
            conditions.append(cursor_clause)

        if conditions:
            stmt = stmt.where(and_(*conditions))

        # Stable Sort Order: Primary timestamp, tie-breaker unique id
        if sort == "desc":
            stmt = stmt.order_by(Attack.timestamp.desc(), Attack.id.desc())
        else:
            stmt = stmt.order_by(Attack.timestamp.asc(), Attack.id.asc())

        # Fetch limit + 1 to detect has_more
        stmt = stmt.limit(limit + 1)

        result = await self.session.execute(stmt)
        rows = list(result.scalars().all())

        has_more = len(rows) > limit
        items = rows[:limit] if has_more else rows

        return items, has_more

    async def get_attacks_after(
        self,
        since_timestamp: datetime,
        since_id: uuid.UUID,
        limit: int = 50
    ) -> List[Attack]:
        """
        Replay query for SSE reconnection via Last-Event-ID.
        Retrieves committed attacks strictly newer than the given (timestamp, id).
        """
        stmt = (
            select(Attack)
            .where(
                or_(
                    Attack.timestamp > since_timestamp,
                    and_(Attack.timestamp == since_timestamp, Attack.id > since_id)
                )
            )
            .order_by(Attack.timestamp.asc(), Attack.id.asc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_summary_analytics(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Executes bounded PostgreSQL aggregate queries without loading raw rows into memory.
        """
        filter_clause = []
        if start_time:
            filter_clause.append(Attack.timestamp >= start_time)
        if end_time:
            filter_clause.append(Attack.timestamp <= end_time)
        base_filter = and_(*filter_clause) if filter_clause else True

        # 1. Total attacks & distinct source IPs
        totals_stmt = select(
            func.count(Attack.id).label("total_attacks"),
            func.count(distinct(Attack.source_ip)).label("distinct_sources")
        ).where(base_filter)
        totals_res = (await self.session.execute(totals_stmt)).one()
        total_attacks = totals_res.total_attacks or 0
        distinct_sources = totals_res.distinct_sources or 0

        # 2. Severity breakdown
        sev_stmt = (
            select(Attack.severity_level, func.count(Attack.id))
            .where(base_filter)
            .group_by(Attack.severity_level)
        )
        sev_res = await self.session.execute(sev_stmt)
        severity_breakdown = {row[0]: row[1] for row in sev_res.all()}

        # 3. Top categories (max 10)
        cat_stmt = (
            select(Attack.primary_category, func.count(Attack.id).label("cat_count"))
            .where(base_filter)
            .group_by(Attack.primary_category)
            .order_by(func.count(Attack.id).desc())
            .limit(10)
        )
        cat_res = await self.session.execute(cat_stmt)
        top_categories = [{"category": row[0], "count": row[1]} for row in cat_res.all()]

        # 4. Top source countries (excluding unknown/internal)
        country_stmt = (
            select(
                Attack.geo_country_code,
                Attack.geo_country,
                func.count(Attack.id).label("country_count")
            )
            .where(
                and_(
                    base_filter,
                    Attack.geo_country_code != "XX",
                    Attack.geo_country != "Unknown",
                    Attack.geo_country != "Private Network"
                )
            )
            .group_by(Attack.geo_country_code, Attack.geo_country)
            .order_by(func.count(Attack.id).desc())
            .limit(10)
        )
        country_res = await self.session.execute(country_stmt)
        top_countries = [
            {"country_code": row[0], "country": row[1], "count": row[2]}
            for row in country_res.all()
        ]

        # 5. Top signatures
        sig_stmt = (
            select(
                AttackSignature.signature_id,
                AttackSignature.rule_name,
                AttackSignature.category,
                func.count(AttackSignature.id).label("sig_count")
            )
            .join(Attack, AttackSignature.attack_id == Attack.id)
            .where(base_filter)
            .group_by(
                AttackSignature.signature_id,
                AttackSignature.rule_name,
                AttackSignature.category
            )
            .order_by(func.count(AttackSignature.id).desc())
            .limit(10)
        )
        sig_res = await self.session.execute(sig_stmt)
        top_signatures = [
            {
                "signature_id": row[0],
                "rule_name": row[1],
                "category": row[2],
                "count": row[3]
            }
            for row in sig_res.all()
        ]

        return {
            "total_attacks": total_attacks,
            "distinct_sources_count": distinct_sources,
            "severity_breakdown": severity_breakdown,
            "top_categories": top_categories,
            "top_signatures": top_signatures,
            "top_countries": top_countries
        }
