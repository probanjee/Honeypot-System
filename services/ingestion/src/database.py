"""
Database Engine & Session Management for VIGILANCE Ingestion Service (Phase 3)
Supports asynchronous SQLAlchemy 2.0 with asyncpg (PostgreSQL) and aiosqlite (testing).
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator
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
    Creates an AsyncEngine configured for production (PostgreSQL) or tests (SQLite).
    """
    if "sqlite" in url:
        # SQLite in-memory or file-based async engine
        return create_async_engine(
            url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool if ":memory:" in url else None,
            echo=False
        )
    
    # PostgreSQL with asyncpg
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


@asynccontextmanager
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Provide an asynchronous transactional database session scope.
    Guarantees rollback on unhandled exceptions and session closure on exit.
    """
    session: AsyncSession = async_session_factory()
    try:
        yield session
    except Exception as exc:
        await session.rollback()
        logger.error("database_session_rollback", error=str(exc))
        raise
    finally:
        await session.close()
