"""
Attack Service: Application Business Logic, Pagination Cursor Management, and Validation
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..core.security import encode_cursor, decode_cursor, InvalidCursorException
from ..repositories.attack_repo import AttackRepository
from ..schemas.attacks import (
    AttackListItemResponse,
    AttackDetailResponse,
    AttackSignatureResponse,
    AttackFilterParams
)
from ..schemas.pagination import PaginatedResponse
from ..schemas.analytics import (
    SummaryAnalyticsResponse,
    TimeWindow,
    CategoryCount,
    SignatureCount,
    CountryCount
)


class AttackService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = AttackRepository(session)

    async def list_attacks(
        self,
        filters: AttackFilterParams
    ) -> PaginatedResponse[AttackListItemResponse]:
        """
        Processes validated query filters, handles HMAC keyset cursor decoding,
        queries repository, and produces next_cursor on has_more.
        """
        cursor_data = None
        if filters.cursor:
            try:
                cursor_data = decode_cursor(filters.cursor, settings.cursor_signing_secret)
            except InvalidCursorException as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid pagination cursor: {str(exc)}"
                )

        items, has_more = await self.repo.list_attacks(
            limit=filters.limit,
            cursor_data=cursor_data,
            severity=filters.severity,
            min_score=filters.min_score,
            max_score=filters.max_score,
            signature=filters.signature,
            source_ip=filters.source_ip,
            country=filters.country,
            start_time=filters.start_time,
            end_time=filters.end_time,
            sort=filters.sort
        )

        next_cursor = None
        if has_more and items:
            last_record = items[-1]
            next_cursor = encode_cursor(
                timestamp=last_record.timestamp,
                record_id=last_record.id,
                secret=settings.cursor_signing_secret
            )

        response_items = [AttackListItemResponse.model_validate(item) for item in items]

        return PaginatedResponse[AttackListItemResponse](
            items=response_items,
            next_cursor=next_cursor,
            has_more=has_more,
            limit=filters.limit
        )

    async def get_attack_by_id(self, attack_id: uuid.UUID) -> AttackDetailResponse:
        """Fetch attack details or raise 404."""
        attack = await self.repo.get_by_id(attack_id)
        if not attack:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Attack incident with ID '{attack_id}' not found"
            )

        return AttackDetailResponse.model_validate(attack)

    async def get_attack_signatures(self, attack_id: uuid.UUID) -> List[AttackSignatureResponse]:
        """Fetch signatures associated with an attack or raise 404 if attack does not exist."""
        attack = await self.repo.get_by_id(attack_id)
        if not attack:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Attack incident with ID '{attack_id}' not found"
            )

        signatures = await self.repo.get_signatures_by_attack_id(attack_id)
        return [AttackSignatureResponse.model_validate(s) for s in signatures]

    async def get_analytics_summary(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        window: str = "24h"
    ) -> SummaryAnalyticsResponse:
        """
        Computes summary statistics over the specified time range.
        If start_time is omitted, resolves relative window (e.g. '1h', '24h', '7d').
        """
        now = datetime.now(timezone.utc)
        resolved_end = end_time or now

        if start_time is None:
            if window == "1h":
                resolved_start = resolved_end - timedelta(hours=1)
            elif window == "7d":
                resolved_start = resolved_end - timedelta(days=7)
            else:  # default 24h
                resolved_start = resolved_end - timedelta(hours=24)
            window_label = window
        else:
            resolved_start = start_time
            window_label = "custom"

        stats = await self.repo.get_summary_analytics(
            start_time=resolved_start,
            end_time=resolved_end
        )

        return SummaryAnalyticsResponse(
            total_attacks=stats["total_attacks"],
            distinct_sources_count=stats["distinct_sources_count"],
            severity_breakdown=stats["severity_breakdown"],
            top_categories=[CategoryCount(**c) for c in stats["top_categories"]],
            top_signatures=[SignatureCount(**s) for s in stats["top_signatures"]],
            top_countries=[CountryCount(**k) for k in stats["top_countries"]],
            time_window=TimeWindow(
                start_time=resolved_start,
                end_time=resolved_end,
                window_label=window_label
            )
        )
