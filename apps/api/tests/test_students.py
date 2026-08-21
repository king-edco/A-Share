"""Tests for student registration, login, and profile endpoints."""

from httpx import AsyncClient

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


async def _exam_and_series(client: AsyncClient, code: str) -> tuple[str, str]:
    exams = (await client.get("/api/v1/exams")).json()
    exam_id = next(e["id"] for e in exams if e["code"] == code)
    series = (await client.get(f"/api/v1/exams/{exam_id}/series")).json()
    series_id = next(s["id"] for s in series)
    return exam_id, series_id


def _payload(exam_id: str, series_id: str, subject_ids: list[str]) -> dict:
    return {
        "phone_number": "670000000",
        "pin": "1234",
        "full_name": "Test Student",
        "school": "Lycée",
        "city": "Douala",
        "exam_id": exam_id,
        "series_id": series_id,
        "subject_ids": subject_ids,
    }


async def test_register_with_valid_payload_succeeds(client: AsyncClient) -> None:
    exam_id, series_id = await _exam_and_series(client, "BAC")
    subjects = (await client.get(f"/api/v1/series/{series_id}/subjects")).json()
    subject_ids = [s["subject_id"] for s in subjects]

    response = await client.post(
        "/api/v1/students/register", json=_payload(exam_id, series_id, subject_ids)
    )

    assert response.status_code == 201
    body = response.json()
    assert body["access_token"]
    assert body["refresh_token"]


async def test_register_duplicate_phone_returns_409(client: AsyncClient) -> None:
    exam_id, series_id = await _exam_and_series(client, "BAC")
    subjects = (await client.get(f"/api/v1/series/{series_id}/subjects")).json()
    subject_ids = [s["subject_id"] for s in subjects]
    await client.post(
        "/api/v1/students/register", json=_payload(exam_id, series_id, subject_ids)
    )

    duplicate = await client.post(
        "/api/v1/students/register", json=_payload(exam_id, series_id, subject_ids)
    )
    assert duplicate.status_code == 409


async def test_register_out_of_pool_subject_rejected(client: AsyncClient) -> None:
    bac_id, bac_series = await _exam_and_series(client, "BAC")
    gce_id, _ = await _exam_and_series(client, "GCE_AL")
    gce_subjects = (await client.get(f"/api/v1/exams/{gce_id}/subjects")).json()
    wrong_subject = next(s["id"] for s in gce_subjects)

    response = await client.post(
        "/api/v1/students/register",
        json=_payload(bac_id, bac_series, [wrong_subject]),
    )
    assert response.status_code == 400


async def test_register_nonbinding_series_allows_any_exam_subject(
    client: AsyncClient,
) -> None:
    # BAC is binding in the seed; create a non-binding series on GCE_AL via the
    # admin path, then register a subject outside the suggested pool.
    token = await _login(client, BOOTSTRAP_EMAIL, BOOTSTRAP_PASSWORD)
    gce_id, gce_series = await _exam_and_series(client, "GCE_AL")
    subjects = (await client.get(f"/api/v1/exams/{gce_id}/subjects")).json()
    subject_ids = [s["id"] for s in subjects]

    new_series = await client.post(
        "/api/v1/admin/series",
        json={
            "exam_id": gce_id,
            "code": "ARTS",
            "label": "Arts",
            "is_binding": False,
        },
        headers=_auth(token),
    )
    assert new_series.status_code == 201
    arts_series_id = new_series.json()["id"]

    # Register with a subject from the same exam but not in the suggested pool.
    response = await client.post(
        "/api/v1/students/register",
        json=_payload(gce_id, arts_series_id, [subject_ids[0]]),
    )
    assert response.status_code == 201


async def test_register_below_min_subjects_rejected(client: AsyncClient) -> None:
    token = await _login(client, BOOTSTRAP_EMAIL, BOOTSTRAP_PASSWORD)
    bac_id, bac_series = await _exam_and_series(client, "BAC")

    # Require at least 4 subjects, while the seed supplies only 3
    # compulsory subjects — the server must reject an empty selection.
    limited = await client.patch(
        f"/api/v1/admin/series/{bac_series}",
        json={"min_subjects": 4},
        headers=_auth(token),
    )
    assert limited.status_code == 200

    response = await client.post(
        "/api/v1/students/register",
        json={
            **_payload(bac_id, bac_series, []),
            "phone_number": "672000002",
        },
    )
    assert response.status_code == 400


async def test_compulsory_subjects_are_auto_added(client: AsyncClient) -> None:
    exam_id, series_id = await _exam_and_series(client, "BAC")
    # Omit all subjects; the server must auto-add the compulsory ones.
    response = await client.post(
        "/api/v1/students/register",
        json={
            **_payload(exam_id, series_id, []),
            "phone_number": "671000001",
        },
    )
    assert response.status_code == 201

    token = response.json()["access_token"]
    me = (
        await client.get("/api/v1/students/me", headers=_auth(token))
    ).json()
    assert len(me["subjects"]) == 3  # Mathématiques, Physique-Chimie, SVT


async def test_student_login_and_refresh(client: AsyncClient) -> None:
    exam_id, series_id = await _exam_and_series(client, "BAC")
    subjects = (await client.get(f"/api/v1/series/{series_id}/subjects")).json()
    await client.post(
        "/api/v1/students/register",
        json=_payload(exam_id, series_id, [s["subject_id"] for s in subjects]),
    )

    login = await client.post(
        "/api/v1/auth/student/login",
        json={"phone_number": "670000000", "pin": "1234"},
    )
    assert login.status_code == 200

    wrong_pin = await client.post(
        "/api/v1/auth/student/login",
        json={"phone_number": "670000000", "pin": "9999"},
    )
    assert wrong_pin.status_code == 401
    assert "Invalid phone number or PIN" in wrong_pin.text

    unknown = await client.post(
        "/api/v1/auth/student/login",
        json={"phone_number": "671999999", "pin": "1234"},
    )
    assert unknown.status_code == 401
    assert "Invalid phone number or PIN" in unknown.text

    refreshed = await client.post(
        "/api/v1/auth/student/refresh",
        json={"refresh_token": login.json()["refresh_token"]},
    )
    assert refreshed.status_code == 200
    assert refreshed.json()["access_token"]


async def test_student_refresh_for_inactive_student_rejected(
    client: AsyncClient, session
) -> None:
    exam_id, series_id = await _exam_and_series(client, "BAC")
    subjects = (await client.get(f"/api/v1/series/{series_id}/subjects")).json()
    response = await client.post(
        "/api/v1/students/register",
        json=_payload(exam_id, series_id, [s["subject_id"] for s in subjects]),
    )
    refresh_token = response.json()["refresh_token"]

    from sqlalchemy import select

    from app.models import Student

    student = (
        await session.execute(
            select(Student).where(Student.phone_number == "+237670000000")
        )
    ).scalar()
    student.is_active = False
    await session.commit()

    rejected = await client.post(
        "/api/v1/auth/student/refresh", json={"refresh_token": refresh_token}
    )
    assert rejected.status_code == 401


async def test_student_refresh_for_nonexistent_student_rejected(
    client: AsyncClient,
) -> None:
    import uuid

    from app.core.security import create_student_refresh_token

    rejected = await client.post(
        "/api/v1/auth/student/refresh",
        json={"refresh_token": create_student_refresh_token(uuid.uuid4())},
    )
    assert rejected.status_code == 401


async def test_student_refresh_with_malformed_token_rejected(
    client: AsyncClient,
) -> None:
    rejected = await client.post(
        "/api/v1/auth/student/refresh", json={"refresh_token": "not-a-jwt"}
    )
    assert rejected.status_code == 401


async def test_admin_refresh_token_rejected_on_student_endpoint(
    client: AsyncClient,
) -> None:
    await _login(client, BOOTSTRAP_EMAIL, BOOTSTRAP_PASSWORD)
    admin_tokens = (
        await client.post(
            "/api/v1/auth/login",
            json={"email": BOOTSTRAP_EMAIL, "password": BOOTSTRAP_PASSWORD},
        )
    ).json()

    rejected = await client.post(
        "/api/v1/auth/student/refresh",
        json={"refresh_token": admin_tokens["refresh_token"]},
    )
    assert rejected.status_code == 401


async def test_student_access_token_rejected_on_refresh_endpoint(
    client: AsyncClient,
) -> None:
    exam_id, series_id = await _exam_and_series(client, "BAC")
    subjects = (await client.get(f"/api/v1/series/{series_id}/subjects")).json()
    response = await client.post(
        "/api/v1/students/register",
        json=_payload(exam_id, series_id, [s["subject_id"] for s in subjects]),
    )

    rejected = await client.post(
        "/api/v1/auth/student/refresh",
        json={"refresh_token": response.json()["access_token"]},
    )
    assert rejected.status_code == 401



async def test_student_me_returns_joined_profile(client: AsyncClient) -> None:
    exam_id, series_id = await _exam_and_series(client, "BAC")
    subjects = (await client.get(f"/api/v1/series/{series_id}/subjects")).json()
    response = await client.post(
        "/api/v1/students/register",
        json=_payload(exam_id, series_id, [s["subject_id"] for s in subjects]),
    )
    token = response.json()["access_token"]

    me = (
        await client.get("/api/v1/students/me", headers=_auth(token))
    ).json()
    assert me["phone_number"] == "+237670000000"
    assert me["full_name"] == "Test Student"
    assert me["exam_name"] == "Baccalauréat"
    assert me["series_label"] == "Série D"
    assert len(me["subjects"]) == 3


async def test_student_token_rejected_on_admin_endpoints(
    client: AsyncClient,
) -> None:
    exam_id, series_id = await _exam_and_series(client, "BAC")
    subjects = (await client.get(f"/api/v1/series/{series_id}/subjects")).json()
    response = await client.post(
        "/api/v1/students/register",
        json=_payload(exam_id, series_id, [s["subject_id"] for s in subjects]),
    )
    token = response.json()["access_token"]

    rejected = await client.post(
        "/api/v1/admin/exams",
        json={"code": "X", "name": "X", "system": "FR"},
        headers=_auth(token),
    )
    assert rejected.status_code == 401


async def test_admin_token_rejected_on_student_me(client: AsyncClient) -> None:
    token = await _login(client, BOOTSTRAP_EMAIL, BOOTSTRAP_PASSWORD)
    rejected = await client.get("/api/v1/students/me", headers=_auth(token))
    assert rejected.status_code == 401
