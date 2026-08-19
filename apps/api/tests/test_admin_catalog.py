"""Tests for the admin catalog write endpoints (permission + system_scope)."""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models import Admin, AdminRole, Role

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


async def _bootstrap_token(client: AsyncClient) -> str:
    return await _login(client, BOOTSTRAP_EMAIL, BOOTSTRAP_PASSWORD)


async def _make_scoped_admin(
    session: AsyncSession, email: str, scope: str
) -> None:
    """Create an admin holding the seeded super_admin role with one scope."""
    role = (
        await session.execute(select(Role).where(Role.code == "super_admin"))
    ).scalar()
    admin = Admin(email=email, password_hash=hash_password("pw"))
    session.add(admin)
    await session.flush()
    session.add(AdminRole(admin_id=admin.id, role_id=role.id, system_scope=scope))
    await session.commit()


async def _exam_id(client: AsyncClient, code: str) -> uuid.UUID:
    exams = (await client.get("/api/v1/exams")).json()
    return uuid.UUID(next(e["id"] for e in exams if e["code"] == code))


async def _series_id(client: AsyncClient, exam_id: uuid.UUID, code: str) -> uuid.UUID:
    series = (await client.get(f"/api/v1/exams/{exam_id}/series")).json()
    return uuid.UUID(next(s["id"] for s in series if s["code"] == code))


NE_NO_WRITE_ENDPOINTS = [
    ("post", "/api/v1/admin/exams"),
    ("patch", "/api/v1/admin/exams/11111111-1111-1111-1111-111111111111"),
    ("delete", "/api/v1/admin/exams/11111111-1111-1111-1111-111111111111"),
    ("post", "/api/v1/admin/series"),
    ("patch", "/api/v1/admin/series/11111111-1111-1111-1111-111111111111"),
    ("delete", "/api/v1/admin/series/11111111-1111-1111-1111-111111111111"),
    ("post", "/api/v1/admin/subjects"),
    ("patch", "/api/v1/admin/subjects/11111111-1111-1111-1111-111111111111"),
    ("delete", "/api/v1/admin/subjects/11111111-1111-1111-1111-111111111111"),
    ("post", "/api/v1/admin/series/11111111-1111-1111-1111-111111111111/subjects"),
    (
        "patch",
        "/api/v1/admin/series/11111111-1111-1111-1111-111111111111/subjects/11111111-1111-1111-1111-111111111111",
    ),
    (
        "delete",
        "/api/v1/admin/series/11111111-1111-1111-1111-111111111111/subjects/11111111-1111-1111-1111-111111111111",
    ),
    ("post", "/api/v1/admin/chapters"),
    ("patch", "/api/v1/admin/chapters/11111111-1111-1111-1111-111111111111"),
    ("delete", "/api/v1/admin/chapters/11111111-1111-1111-1111-111111111111"),
]


async def test_fr_scoped_admin_can_create_fr_exam(
    client: AsyncClient, session: AsyncSession
) -> None:
    await _make_scoped_admin(session, "fr-admin@example.com", "FR")
    token = await _login(client, "fr-admin@example.com", "pw")

    response = await client.post(
        "/api/v1/admin/exams",
        json={"code": "PROBA", "name": "Probatoire", "system": "FR"},
        headers=_auth(token),
    )

    assert response.status_code == 201
    assert response.json()["system"] == "FR"


async def test_fr_scoped_admin_cannot_create_en_exam(
    client: AsyncClient, session: AsyncSession
) -> None:
    await _make_scoped_admin(session, "fr-admin@example.com", "FR")
    token = await _login(client, "fr-admin@example.com", "pw")

    response = await client.post(
        "/api/v1/admin/exams",
        json={"code": "GCE_OL_PROBE", "name": "GCE Ordinary Level", "system": "EN"},
        headers=_auth(token),
    )

    assert response.status_code == 403


async def test_both_scoped_admin_can_create_either_system(
    client: AsyncClient, session: AsyncSession
) -> None:
    await _make_scoped_admin(session, "both-admin@example.com", "BOTH")
    token = await _login(client, "both-admin@example.com", "pw")

    for system in ("FR", "EN"):
        response = await client.post(
            "/api/v1/admin/exams",
            json={"code": f"TVE_{system}", "name": f"TVE {system}", "system": system},
            headers=_auth(token),
        )
        assert response.status_code == 201
        assert response.json()["system"] == system


async def test_fr_scoped_admin_blocked_from_en_resources_everywhere(
    client: AsyncClient, session: AsyncSession
) -> None:
    """Scope must reject EN-targeting writes on every endpoint family."""
    await _make_scoped_admin(session, "fr-admin@example.com", "FR")
    token = await _login(client, "fr-admin@example.com", "pw")
    gce_id = await _exam_id(client, "GCE_AL")
    gce_series = await _series_id(client, gce_id, "S1")
    gce_subjects = (
        await client.get(f"/api/v1/series/{gce_series}/subjects")
    ).json()
    gce_subject_id = uuid.UUID(gce_subjects[0]["subject_id"])

    # A real EN chapter to target with PATCH/DELETE (created by bootstrap).
    bootstrap = await _bootstrap_token(client)
    chapter = await client.post(
        "/api/v1/admin/chapters",
        json={"subject_id": str(gce_subject_id), "title": "EN Chapter"},
        headers=_auth(bootstrap),
    )
    assert chapter.status_code == 201
    chapter_id = chapter.json()["id"]

    checks = [
        client.patch(
            f"/api/v1/admin/exams/{gce_id}", json={"name": "x"}, headers=_auth(token)
        ),
        client.delete(f"/api/v1/admin/exams/{gce_id}", headers=_auth(token)),
        client.post(
            "/api/v1/admin/series",
            json={"exam_id": str(gce_id), "code": "X", "label": "x"},
            headers=_auth(token),
        ),
        client.patch(
            f"/api/v1/admin/series/{gce_series}", json={"label": "x"}, headers=_auth(token)
        ),
        client.delete(f"/api/v1/admin/series/{gce_series}", headers=_auth(token)),
        client.post(
            "/api/v1/admin/subjects",
            json={"exam_id": str(gce_id), "name": "x"},
            headers=_auth(token),
        ),
        client.patch(
            f"/api/v1/admin/subjects/{gce_subject_id}",
            json={"name": "x"},
            headers=_auth(token),
        ),
        client.delete(f"/api/v1/admin/subjects/{gce_subject_id}", headers=_auth(token)),
        client.post(
            f"/api/v1/admin/series/{gce_series}/subjects",
            json={"subject_id": str(gce_subject_id)},
            headers=_auth(token),
        ),
        client.patch(
            f"/api/v1/admin/series/{gce_series}/subjects/{gce_subject_id}",
            json={"is_compulsory": False},
            headers=_auth(token),
        ),
        client.delete(
            f"/api/v1/admin/series/{gce_series}/subjects/{gce_subject_id}",
            headers=_auth(token),
        ),
        client.post(
            "/api/v1/admin/chapters",
            json={"subject_id": str(gce_subject_id), "title": "x"},
            headers=_auth(token),
        ),
        client.patch(
            f"/api/v1/admin/chapters/{chapter_id}",
            json={"title": "x"},
            headers=_auth(token),
        ),
        client.delete(
            f"/api/v1/admin/chapters/{chapter_id}",
            headers=_auth(token),
        ),
    ]
    for check in checks:
        response = await check
        assert response.status_code == 403, response.text


async def test_series_hierarchy_created_via_admin_endpoints(
    client: AsyncClient,
) -> None:
    token = await _bootstrap_token(client)
    exam = await client.post(
        "/api/v1/admin/exams",
        json={"code": "TREE", "name": "Tree Exam", "system": "EN"},
        headers=_auth(token),
    )
    assert exam.status_code == 201
    exam_id = exam.json()["id"]

    parent = await client.post(
        "/api/v1/admin/series",
        json={"exam_id": exam_id, "code": "SCI", "label": "Science grouping"},
        headers=_auth(token),
    )
    assert parent.status_code == 201
    parent_id = parent.json()["id"]
    assert parent.json()["is_binding"] is True

    child = await client.post(
        "/api/v1/admin/series",
        json={
            "exam_id": exam_id,
            "parent_series_id": parent_id,
            "code": "S2",
            "label": "Upper Science 2",
            "is_binding": False,
        },
        headers=_auth(token),
    )
    assert child.status_code == 201
    assert child.json()["is_binding"] is False

    # Retrievable through the Phase 1 read endpoint, hierarchy included.
    series = (await client.get(f"/api/v1/exams/{exam_id}/series")).json()
    by_code = {s["code"]: s for s in series}
    assert by_code["SCI"]["parent_series_id"] is None
    assert uuid.UUID(by_code["S2"]["parent_series_id"]) == uuid.UUID(parent_id)


async def test_attach_subject_stores_and_exposes_link_attributes(
    client: AsyncClient,
) -> None:
    token = await _bootstrap_token(client)
    exam = (await client.post(
        "/api/v1/admin/exams",
        json={"code": "TVEL", "name": "TVE Level", "system": "EN"},
        headers=_auth(token),
    )).json()
    series = (await client.post(
        "/api/v1/admin/series",
        json={"exam_id": exam["id"], "code": "T1", "label": "TVE 1"},
        headers=_auth(token),
    )).json()
    subject = (await client.post(
        "/api/v1/admin/subjects",
        json={"exam_id": exam["id"], "name": "Food Technology"},
        headers=_auth(token),
    )).json()

    attached = await client.post(
        f"/api/v1/admin/series/{series['id']}/subjects",
        json={
            "subject_id": subject["id"],
            "coefficient": "4.50",
            "is_compulsory": True,
            "subject_category": "professional",
        },
        headers=_auth(token),
    )
    assert attached.status_code == 201

    pool = (await client.get(f"/api/v1/series/{series['id']}/subjects")).json()
    (link,) = pool
    assert link["subject_id"] == subject["id"]
    assert float(link["coefficient"]) == 4.5
    assert link["is_compulsory"] is True
    assert link["subject_category"] == "professional"


async def test_delete_series_with_active_child_returns_409(
    client: AsyncClient,
) -> None:
    token = await _bootstrap_token(client)
    exam = (await client.post(
        "/api/v1/admin/exams",
        json={"code": "TREE2", "name": "Tree Exam 2", "system": "FR"},
        headers=_auth(token),
    )).json()
    parent = (await client.post(
        "/api/v1/admin/series",
        json={"exam_id": exam["id"], "code": "P", "label": "Parent"},
        headers=_auth(token),
    )).json()
    await client.post(
        "/api/v1/admin/series",
        json={
            "exam_id": exam["id"],
            "parent_series_id": parent["id"],
            "code": "C",
            "label": "Child",
        },
        headers=_auth(token),
    )

    blocked = await client.delete(f"/api/v1/admin/series/{parent['id']}", headers=_auth(token))
    assert blocked.status_code == 409

    still_listed = (await client.get(f"/api/v1/exams/{exam['id']}/series")).json()
    assert any(s["id"] == parent["id"] for s in still_listed)

    # Once the child is gone (soft), the parent can be deleted too.
    child_id = next(s["id"] for s in still_listed if s["code"] == "C")
    assert (
        await client.delete(f"/api/v1/admin/series/{child_id}", headers=_auth(token))
    ).status_code == 204
    assert (
        await client.delete(f"/api/v1/admin/series/{parent['id']}", headers=_auth(token))
    ).status_code == 204


async def test_soft_deleted_subject_disappears_from_reads(
    client: AsyncClient,
) -> None:
    token = await _bootstrap_token(client)
    bac_id = await _exam_id(client, "BAC")
    series_d = await _series_id(client, bac_id, "D")
    before = (await client.get(f"/api/v1/series/{series_d}/subjects")).json()
    victim = next(s for s in before if s["name"] == "Physique-Chimie")

    assert (
        await client.delete(
            f"/api/v1/admin/subjects/{victim['subject_id']}", headers=_auth(token)
        )
    ).status_code == 204

    after = (await client.get(f"/api/v1/series/{series_d}/subjects")).json()
    assert not any(s["name"] == "Physique-Chimie" for s in after)


async def test_roleless_admin_gets_403_on_every_write_endpoint(
    client: AsyncClient, session: AsyncSession
) -> None:
    session.add(
        Admin(email="roleless@example.com", password_hash=hash_password("pw"))
    )
    await session.commit()
    token = await _login(client, "roleless@example.com", "pw")

    for method, url in NE_NO_WRITE_ENDPOINTS:
        response = await client.request(method, url, json={}, headers=_auth(token))
        assert response.status_code == 403, f"{method} {url} -> {response.status_code}"


async def test_duplicate_exam_code_returns_409(client: AsyncClient) -> None:
    token = await _bootstrap_token(client)
    response = await client.post(
        "/api/v1/admin/exams",
        json={"code": "BAC", "name": "Duplicate", "system": "FR"},
        headers=_auth(token),
    )
    assert response.status_code == 409


async def test_cross_exam_link_returns_400(client: AsyncClient) -> None:
    token = await _bootstrap_token(client)
    bac_id = await _exam_id(client, "BAC")
    gce_id = await _exam_id(client, "GCE_AL")
    bac_series = await _series_id(client, bac_id, "D")
    gce_series = await _series_id(client, gce_id, "S1")
    gce_subject_id = (
        (await client.get(f"/api/v1/series/{gce_series}/subjects")).json()[0]["subject_id"]
    )

    response = await client.post(
        f"/api/v1/admin/series/{bac_series}/subjects",
        json={"subject_id": gce_subject_id},
        headers=_auth(token),
    )
    assert response.status_code == 400


async def test_fr_scoped_admin_cannot_rename_en_exam_with_system_change(
    client: AsyncClient, session: AsyncSession
) -> None:
    """Changing an exam's system requires scope for BOTH old and new values."""
    await _make_scoped_admin(session, "fr-admin@example.com", "FR")
    token = await _login(client, "fr-admin@example.com", "pw")
    gce_id = await _exam_id(client, "GCE_AL")

    response = await client.patch(
        f"/api/v1/admin/exams/{gce_id}",
        json={"system": "FR"},
        headers=_auth(token),
    )
    assert response.status_code == 403


@pytest.mark.parametrize("method,url", NE_NO_WRITE_ENDPOINTS)
async def test_write_endpoints_require_token(
    client: AsyncClient, method: str, url: str
) -> None:
    response = await client.request(method, url, json={})

    assert response.status_code == 401
