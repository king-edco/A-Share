"""Tests for the admin invitation flow and contributor scoping."""

from datetime import UTC, datetime, timedelta

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models import Admin, AdminInvitation, AdminRole, AdminSubjectGrant, Role

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


async def _role_id(session: AsyncSession, code: str) -> str:
    role = (await session.execute(select(Role).where(Role.code == code))).scalar()
    return str(role.id)


async def _subject_id(session: AsyncSession, exam_code: str, name: str) -> str:
    exams = await session.execute(
        select(Admin).limit(0)
    )  # no-op to keep session warm
    del exams
    from app.models import Exam, Subject

    exam = (
        await session.execute(select(Exam).where(Exam.code == exam_code))
    ).scalar()
    subject = (
        await session.execute(
            select(Subject).where(Subject.exam_id == exam.id, Subject.name == name)
        )
    ).scalar()
    return str(subject.id)


async def _make_admin(session: AsyncSession, email: str, role_code: str, scope: str) -> Admin:
    role = (
        await session.execute(select(Role).where(Role.code == role_code))
    ).scalar()
    admin = Admin(email=email, password_hash=hash_password("pw"))
    session.add(admin)
    await session.flush()
    session.add(AdminRole(admin_id=admin.id, role_id=role.id, system_scope=scope))
    await session.commit()
    return admin


async def test_super_admin_creates_contributor_invitation(
    client: AsyncClient, session: AsyncSession
) -> None:
    token = await _login(client, BOOTSTRAP_EMAIL, BOOTSTRAP_PASSWORD)
    subject_id = await _subject_id(session, "GCE_AL", "Pure Mathematics")

    response = await client.post(
        "/api/v1/admin/invitations",
        json={
            "email": "contributor@example.com",
            "role_code": "contributor",
            "subject_ids": [subject_id],
        },
        headers=_auth(token),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["raw_token"]
    assert body["invite_url"].endswith(f"/invite/{body['raw_token']}")
    assert body["invitation"]["role_code"] == "contributor"
    assert body["invitation"]["subject_ids"] == [subject_id]
    assert body["invitation"]["status"] == "pending"


async def test_content_manager_cannot_create_invitation(
    client: AsyncClient, session: AsyncSession
) -> None:
    await _make_admin(session, "content@example.com", "content_manager", "BOTH")
    token = await _login(client, "content@example.com", "pw")

    response = await client.post(
        "/api/v1/admin/invitations",
        json={
            "email": "x@example.com",
            "role_code": "contributor",
            "subject_ids": ["11111111-1111-1111-1111-111111111111"],
        },
        headers=_auth(token),
    )

    assert response.status_code == 403


async def test_mismatched_invitation_fields_rejected(
    client: AsyncClient,
) -> None:
    token = await _login(client, BOOTSTRAP_EMAIL, BOOTSTRAP_PASSWORD)

    contributor_with_scope = await client.post(
        "/api/v1/admin/invitations",
        json={
            "email": "x@example.com",
            "role_code": "contributor",
            "system_scope": "BOTH",
            "subject_ids": ["11111111-1111-1111-1111-111111111111"],
        },
        headers=_auth(token),
    )
    assert contributor_with_scope.status_code == 400

    admin_without_scope = await client.post(
        "/api/v1/admin/invitations",
        json={"email": "x@example.com", "role_code": "content_manager"},
        headers=_auth(token),
    )
    assert admin_without_scope.status_code == 400


async def test_public_invitation_lookup_and_expiration(
    client: AsyncClient, session: AsyncSession
) -> None:
    token = await _login(client, BOOTSTRAP_EMAIL, BOOTSTRAP_PASSWORD)
    subject_id = await _subject_id(session, "GCE_AL", "Pure Mathematics")

    created = (
        await client.post(
            "/api/v1/admin/invitations",
            json={
                "email": "lookup@example.com",
                "role_code": "contributor",
                "subject_ids": [subject_id],
            },
            headers=_auth(token),
        )
    ).json()
    raw_token = created["raw_token"]

    valid = await client.get(f"/api/v1/invitations/{raw_token}")
    assert valid.status_code == 200
    assert valid.json()["email"] == "lookup@example.com"
    assert valid.json()["role_code"] == "contributor"

    unknown = await client.get("/api/v1/invitations/does-not-exist")
    assert unknown.status_code == 404

    # Expire the invitation in the DB and confirm 410.
    invitation = (
        await session.execute(
            select(AdminInvitation).where(AdminInvitation.email == "lookup@example.com")
        )
    ).scalar()
    invitation.expires_at = datetime.now(UTC) - timedelta(days=1)
    await session.commit()

    expired = await client.get(f"/api/v1/invitations/{raw_token}")
    assert expired.status_code == 410


async def test_accept_invitation_creates_contributor_account(
    client: AsyncClient, session: AsyncSession
) -> None:
    token = await _login(client, BOOTSTRAP_EMAIL, BOOTSTRAP_PASSWORD)
    subject_id = await _subject_id(session, "GCE_AL", "Pure Mathematics")

    created = (
        await client.post(
            "/api/v1/admin/invitations",
            json={
                "email": "newcontrib@example.com",
                "role_code": "contributor",
                "subject_ids": [subject_id],
            },
            headers=_auth(token),
        )
    ).json()

    accepted = await client.post(
        f"/api/v1/invitations/{created['raw_token']}/accept",
        json={"password": "new-password-123"},
    )
    assert accepted.status_code == 200
    assert accepted.json()["access_token"]
    assert accepted.json()["refresh_token"]

    # Second accept on the same token -> 410.
    second = await client.post(
        f"/api/v1/invitations/{created['raw_token']}/accept",
        json={"password": "again"},
    )
    assert second.status_code == 410

    # The new admin has the contributor role and the subject grant.
    admin = (
        await session.execute(
            select(Admin).where(Admin.email == "newcontrib@example.com")
        )
    ).scalar()
    assert admin is not None
    grant = (
        await session.execute(
            select(AdminSubjectGrant).where(
                AdminSubjectGrant.admin_id == admin.id
            )
        )
    ).scalar()
    assert grant is not None
    assert str(grant.subject_id) == subject_id


async def test_contributor_can_manage_only_granted_subject(
    client: AsyncClient, session: AsyncSession
) -> None:
    token = await _login(client, BOOTSTRAP_EMAIL, BOOTSTRAP_PASSWORD)
    math_id = await _subject_id(session, "GCE_AL", "Pure Mathematics")
    physics_id = await _subject_id(session, "GCE_AL", "Physics")

    created = (
        await client.post(
            "/api/v1/admin/invitations",
            json={
                "email": "scopedcontrib@example.com",
                "role_code": "contributor",
                "subject_ids": [math_id],
            },
            headers=_auth(token),
        )
    ).json()
    await client.post(
        f"/api/v1/invitations/{created['raw_token']}/accept",
        json={"password": "pw"},
    )
    contrib_token = await _login(client, "scopedcontrib@example.com", "pw")

    # Granted subject: allowed.
    ok = await client.post(
        "/api/v1/admin/chapters",
        json={"subject_id": math_id, "title": "Functions"},
        headers=_auth(contrib_token),
    )
    assert ok.status_code == 201
    chapter_id = ok.json()["id"]

    patch_ok = await client.patch(
        f"/api/v1/admin/chapters/{chapter_id}",
        json={"title": "Functions (revised)"},
        headers=_auth(contrib_token),
    )
    assert patch_ok.status_code == 200

    delete_ok = await client.delete(
        f"/api/v1/admin/chapters/{chapter_id}", headers=_auth(contrib_token)
    )
    assert delete_ok.status_code == 204

    # Other subject: forbidden.
    forbidden = await client.post(
        "/api/v1/admin/chapters",
        json={"subject_id": physics_id, "title": "Nope"},
        headers=_auth(contrib_token),
    )
    assert forbidden.status_code == 403


async def test_broad_fr_admin_still_manages_fr_chapters_without_grants(
    client: AsyncClient, session: AsyncSession
) -> None:
    """The content_manager system_scope path must not regress."""
    await _make_admin(session, "fr-content@example.com", "content_manager", "FR")
    token = await _login(client, "fr-content@example.com", "pw")
    math_bac_id = await _subject_id(session, "BAC", "Mathématiques")

    response = await client.post(
        "/api/v1/admin/chapters",
        json={"subject_id": math_bac_id, "title": "Analyse"},
        headers=_auth(token),
    )
    assert response.status_code == 201


async def test_admin_cannot_deactivate_self(client: AsyncClient) -> None:
    token = await _login(client, BOOTSTRAP_EMAIL, BOOTSTRAP_PASSWORD)
    me = (
        await client.get("/api/v1/auth/me", headers=_auth(token))
    ).json()

    response = await client.patch(
        f"/api/v1/admin/admins/{me['id']}",
        json={"is_active": False},
        headers=_auth(token),
    )
    assert response.status_code == 400


async def test_cannot_deactivate_last_super_admin(
    client: AsyncClient, session: AsyncSession
) -> None:
    token = await _login(client, BOOTSTRAP_EMAIL, BOOTSTRAP_PASSWORD)
    me = (await client.get("/api/v1/auth/me", headers=_auth(token))).json()

    response = await client.patch(
        f"/api/v1/admin/admins/{me['id']}",
        json={"is_active": False},
        headers=_auth(token),
    )
    assert response.status_code == 400  # self-deactivation guardrail

    # Now a second super_admin exists; deactivating one is allowed.
    second = await _make_admin(session, "super2@example.com", "super_admin", "BOTH")
    response2 = await client.patch(
        f"/api/v1/admin/admins/{second.id}",
        json={"is_active": False},
        headers=_auth(token),
    )
    assert response2.status_code == 200
