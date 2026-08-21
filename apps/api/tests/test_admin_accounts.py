"""Tests for the admin account management endpoints."""

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models import Admin, AdminRole, AdminSubjectGrant, Exam, Role, Subject

BOOTSTRAP_EMAIL = "bootstrap-admin@example.com"
BOOTSTRAP_PASSWORD = "test-bootstrap-password"


async def _login(client: AsyncClient, email: str, password: str) -> str:
    response = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": password}
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def test_list_admins_includes_roles_and_grants(
    client: AsyncClient, session: AsyncSession
) -> None:
    # Add a contributor with a grant so the listing exercises that path.
    role = (await session.execute(select(Role).where(Role.code == "contributor"))).scalar()
    admin = Admin(email="listed@example.com", password_hash=hash_password("pw"))
    session.add(admin)
    await session.flush()
    session.add(AdminRole(admin_id=admin.id, role_id=role.id, system_scope="BOTH"))
    exam = (await session.execute(select(Exam).where(Exam.code == "GCE_AL"))).scalar()
    subject = (
        await session.execute(
            select(Subject).where(
                Subject.exam_id == exam.id, Subject.name == "Pure Mathematics"
            )
        )
    ).scalar()
    session.add(AdminSubjectGrant(admin_id=admin.id, subject_id=subject.id))
    await session.commit()

    token = await _login(client, BOOTSTRAP_EMAIL, BOOTSTRAP_PASSWORD)
    response = await client.get("/api/v1/admin/admins", headers=_auth(token))

    assert response.status_code == 200
    listed = {a["email"]: a for a in response.json()}
    assert "listed@example.com" in listed
    assert any(r["role_code"] == "contributor" for r in listed["listed@example.com"]["roles"])
    assert listed["listed@example.com"]["subject_grants"][0]["subject_name"] == "Pure Mathematics"


async def test_content_manager_cannot_list_admins(
    client: AsyncClient, session: AsyncSession
) -> None:
    role = (await session.execute(select(Role).where(Role.code == "content_manager"))).scalar()
    admin = Admin(email="cm@example.com", password_hash=hash_password("pw"))
    session.add(admin)
    await session.flush()
    session.add(AdminRole(admin_id=admin.id, role_id=role.id, system_scope="BOTH"))
    await session.commit()

    token = await _login(client, "cm@example.com", "pw")
    response = await client.get("/api/v1/admin/admins", headers=_auth(token))

    assert response.status_code == 403
