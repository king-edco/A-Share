"""Shared pytest fixtures: an isolated SQLite test database with seeded data.

SQLite keeps the tests hermetic (CI has no database service), while the
endpoints under test use the exact same seed routine as the standalone
seed script.
"""

import os
from collections.abc import AsyncGenerator
from typing import Any

import httpx
import pytest
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import StaticPool

from app.db.seed import seed
from app.db.session import get_async_session
from app.main import app
from app.models import Base

BOOTSTRAP_EMAIL = "bootstrap-admin@example.com"
BOOTSTRAP_PASSWORD = "test-bootstrap-password"


@pytest.fixture(autouse=True)
def _auth_env() -> None:
    """Force auth-related env vars so tests stay hermetic regardless of the
    developer's shell; the app reads them lazily at call time."""
    os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-key"
    os.environ["ADMIN_BOOTSTRAP_EMAIL"] = BOOTSTRAP_EMAIL
    os.environ["ADMIN_BOOTSTRAP_PASSWORD"] = BOOTSTRAP_PASSWORD


@pytest.fixture
async def session() -> AsyncGenerator[AsyncSession, Any]:
    engine: AsyncEngine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)

    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as test_session:
        await seed(test_session)
        yield test_session
    await engine.dispose()


@pytest.fixture
async def client(session: AsyncSession) -> AsyncGenerator[httpx.AsyncClient, Any]:
    async def override_session() -> AsyncGenerator[AsyncSession, Any]:
        yield session

    app.dependency_overrides[get_async_session] = override_session
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as test_client:
        yield test_client
    app.dependency_overrides.clear()
