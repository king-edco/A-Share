"""Async SQLAlchemy engine/session factory and the FastAPI session dependency.

The engine is created lazily on first use: settings come from the environment,
and tests may run without DATABASE_URL set as they override the dependency.
"""

from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

_engine: AsyncEngine | None = None


def _get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        if not settings.database_url:
            raise RuntimeError(
                "DATABASE_URL is not set; cannot create the database engine."
            )
        _engine = create_async_engine(settings.database_url)
    return _engine


async def get_async_session() -> AsyncGenerator[AsyncSession, Any]:
    """Yield one AsyncSession per request (FastAPI dependency)."""
    factory = async_sessionmaker(_get_engine(), expire_on_commit=False)
    async with factory() as session:
        yield session
