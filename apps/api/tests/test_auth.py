"""Tests for admin authentication and the RBAC probe endpoint."""

import uuid
from datetime import UTC, datetime, timedelta

from httpx import AsyncClient
from jose import jwt as jose_jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_refresh_token, hash_password
from app.models import Admin
from tests.conftest import TEST_JWT_SECRET

# Mirrors the bootstrap credentials configured in conftest.py.
BOOTSTRAP_EMAIL = "bootstrap-admin@example.com"
BOOTSTRAP_PASSWORD = "test-bootstrap-password"

NEW_EXAM_BODY = {"code": "AUTH_PROBE", "name": "Auth Probe Exam", "system": "FR"}


async def _login(client: AsyncClient, email: str, password: str) -> dict:
    response = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()


async def test_login_with_bootstrap_credentials_returns_tokens(
    client: AsyncClient,
) -> None:
    tokens = await _login(client, BOOTSTRAP_EMAIL, BOOTSTRAP_PASSWORD)

    assert tokens["token_type"] == "bearer"
    assert tokens["access_token"]
    assert tokens["refresh_token"]


async def test_login_with_wrong_password_returns_401(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": BOOTSTRAP_EMAIL, "password": "wrong-password"},
    )

    assert response.status_code == 401


async def test_me_returns_bootstrap_admin_and_scopes(client: AsyncClient) -> None:
    tokens = await _login(client, BOOTSTRAP_EMAIL, BOOTSTRAP_PASSWORD)

    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["email"] == BOOTSTRAP_EMAIL
    roles = {role["code"]: role for role in body["roles"]}
    assert roles["super_admin"]["system_scope"] == "BOTH"


async def test_protected_write_without_token_returns_401(client: AsyncClient) -> None:
    response = await client.post("/api/v1/admin/exams", json=NEW_EXAM_BODY)

    assert response.status_code == 401


async def test_protected_write_with_permission_succeeds(client: AsyncClient) -> None:
    tokens = await _login(client, BOOTSTRAP_EMAIL, BOOTSTRAP_PASSWORD)

    response = await client.post(
        "/api/v1/admin/exams",
        json=NEW_EXAM_BODY,
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )

    assert response.status_code == 201


async def test_protected_write_without_permission_returns_403(
    client: AsyncClient, session: AsyncSession
) -> None:
    # A second admin with no roles assigned holds no permissions at all.
    roleless = Admin(email="roleless@example.com", password_hash=hash_password("pw"))
    session.add(roleless)
    await session.commit()

    tokens = await _login(client, "roleless@example.com", "pw")
    response = await client.post(
        "/api/v1/admin/exams",
        json=NEW_EXAM_BODY,
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )

    assert response.status_code == 403


async def test_refresh_returns_new_working_access_token(client: AsyncClient) -> None:
    tokens = await _login(client, BOOTSTRAP_EMAIL, BOOTSTRAP_PASSWORD)

    refreshed = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    )
    assert refreshed.status_code == 200
    new_access = refreshed.json()["access_token"]
    assert new_access

    probe = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {new_access}"}
    )
    assert probe.status_code == 200


async def test_refresh_with_access_token_rejected(client: AsyncClient) -> None:
    tokens = await _login(client, BOOTSTRAP_EMAIL, BOOTSTRAP_PASSWORD)

    rejected = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": tokens["access_token"]}
    )

    assert rejected.status_code == 401


async def test_login_rejects_inactive_admin(
    client: AsyncClient, session: AsyncSession
) -> None:
    inactive = Admin(
        email="inactive@example.com",
        password_hash=hash_password("pw"),
        is_active=False,
    )
    session.add(inactive)
    await session.commit()

    response = await client.post(
        "/api/v1/auth/login", json={"email": "inactive@example.com", "password": "pw"}
    )

    assert response.status_code == 401


async def test_refresh_for_nonexistent_admin_rejected(
    client: AsyncClient, session: AsyncSession
) -> None:
    bogus = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": create_refresh_token(uuid.uuid4())},
    )
    assert bogus.status_code == 401


async def test_refresh_for_inactive_admin_rejected(
    client: AsyncClient, session: AsyncSession
) -> None:
    tokens = await _login(client, BOOTSTRAP_EMAIL, BOOTSTRAP_PASSWORD)
    bootstrap = (
        await session.execute(select(Admin).where(Admin.email == BOOTSTRAP_EMAIL))
    ).scalar()
    bootstrap.is_active = False
    await session.commit()

    rejected = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    )
    assert rejected.status_code == 401


async def test_refresh_with_malformed_token_rejected(client: AsyncClient) -> None:
    rejected = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": "not-a-jwt"}
    )
    assert rejected.status_code == 401


async def test_refresh_with_expired_token_rejected(
    client: AsyncClient, session: AsyncSession
) -> None:
    bootstrap = (
        await session.execute(select(Admin).where(Admin.email == BOOTSTRAP_EMAIL))
    ).scalar()
    now = datetime.now(UTC)
    expired = jose_jwt.encode(
        {
            "sub": str(bootstrap.id),
            "type": "refresh",
            "actor_type": "admin",
            "iat": now - timedelta(days=10),
            "exp": now - timedelta(days=3),
        },
        TEST_JWT_SECRET,
        algorithm="HS256",
    )

    rejected = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": expired}
    )
    assert rejected.status_code == 401
