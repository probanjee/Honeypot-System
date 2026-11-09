"""
Database Connection & Session Management for VIGILANCE Backend (Phase 4)
Asynchronous SQLAlchemy 2.0 with asyncpg (PostgreSQL) and aiosqlite (isolated testing).
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
    AsyncEngine
)
from sqlalchemy.pool import StaticPool
import structlog

from .config import settings

logger = structlog.get_logger(__name__)


def create_engine_from_url(url: str) -> AsyncEngine:
    """
    Creates an AsyncEngine configured for production (PostgreSQL) or testing (SQLite).
    """
    if "sqlite" in url:
        return create_async_engine(
            url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool if ":memory:" in url else None,
            echo=False
        )

    return create_async_engine(
        url,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_pre_ping=True,
        pool_recycle=3600,
        echo=False
    )


engine: AsyncEngine = create_engine_from_url(settings.database_url)

async_session_factory = async_sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=AsyncSession
)


def get_session_factory():
    """Dependency providing the async sessionmaker factory."""
    return async_session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that yields an asynchronous database session per request.
    Rolls back automatically on unhandled exceptions and guarantees session closure.
    """
    async with async_session_factory() as session:
        try:
            yield session
        except Exception as exc:
            await session.rollback()
            logger.error("database_session_rollback", error=str(exc))
            raise
        finally:
            await session.close()


async def check_db_health(session: AsyncSession) -> bool:
    """Probes database connectivity by running a lightweight ping query."""
    try:
        result = await session.execute(text("SELECT 1"))
        return result.scalar() == 1
    except Exception as exc:
        logger.warning("database_healthcheck_failed", error=str(exc))
        return False
