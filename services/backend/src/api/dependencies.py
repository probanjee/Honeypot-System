"""
FastAPI Route Dependencies
Provides dependency injection for database sessions, services, and the event broadcaster.
"""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..services.attack_service import AttackService
from ..services.sse_broadcaster import SSEBroadcaster, broadcaster


def get_attack_service(session: AsyncSession = Depends(get_db)) -> AttackService:
    """Provides a request-scoped AttackService instance."""
    return AttackService(session)


def get_event_broadcaster() -> SSEBroadcaster:
    """Provides the singleton SSE broadcaster."""
    return broadcaster
