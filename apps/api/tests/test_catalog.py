"""Tests for the read-only catalog endpoints against a seeded test database."""

import uuid

from httpx import AsyncClient


async def test_list_exams_returns_seeded_exams(client: AsyncClient) -> None:
    response = await client.get("/api/v1/exams")

    assert response.status_code == 200
    exams = {exam["code"]: exam for exam in response.json()}
    assert set(exams) == {"BAC", "GCE_AL"}
    assert exams["BAC"]["system"] == "FR"
    assert exams["GCE_AL"]["system"] == "EN"


async def test_series_hierarchy_reflects_parent_child(client: AsyncClient) -> None:
    exams = (await client.get("/api/v1/exams")).json()
    gce_al_id = next(e["id"] for e in exams if e["code"] == "GCE_AL")

    response = await client.get(f"/api/v1/exams/{gce_al_id}/series")

    assert response.status_code == 200
    series = {s["code"]: s for s in response.json()}
    assert set(series) == {"Science", "S1"}

    science = series["Science"]
    assert science["parent_series_id"] is None

    s1 = series["S1"]
    assert uuid.UUID(s1["parent_series_id"]) == uuid.UUID(science["id"])
    # Parent grouping holds no subjects directly; only its child does.
    assert (
        (await client.get(f"/api/v1/series/{science['id']}/subjects")).json() == []
    )


async def test_series_subjects_pool_attributes(client: AsyncClient) -> None:
    exams = (await client.get("/api/v1/exams")).json()
    bac_id = next(e["id"] for e in exams if e["code"] == "BAC")
    bac_series = (await client.get(f"/api/v1/exams/{bac_id}/series")).json()
    series_d_id = next(s["id"] for s in bac_series if s["code"] == "D")

    response = await client.get(f"/api/v1/series/{series_d_id}/subjects")

    assert response.status_code == 200
    subjects = {s["name"]: s for s in response.json()}
    assert set(subjects) == {
        "Mathématiques",
        "Physique-Chimie",
        "Sciences de la Vie et de la Terre",
    }
    assert all(s["is_compulsory"] for s in subjects.values())
    # Numeric coefficients serialize as JSON strings; compare numerically.
    assert float(subjects["Mathématiques"]["coefficient"]) == 7
    assert float(subjects["Physique-Chimie"]["coefficient"]) == 6
    assert float(subjects["Sciences de la Vie et de la Terre"]["coefficient"]) == 5


async def test_unknown_exam_returns_404(client: AsyncClient) -> None:
    unknown = uuid.uuid4()

    assert (await client.get(f"/api/v1/exams/{unknown}/series")).status_code == 404
    assert (await client.get(f"/api/v1/series/{unknown}/subjects")).status_code == 404


async def test_list_exam_subjects_returns_active_subjects(client: AsyncClient) -> None:
    exams = (await client.get("/api/v1/exams")).json()
    bac_id = next(e["id"] for e in exams if e["code"] == "BAC")

    response = await client.get(f"/api/v1/exams/{bac_id}/subjects")

    assert response.status_code == 200
    names = {s["name"] for s in response.json()}
    assert {"Mathématiques", "Physique-Chimie", "Sciences de la Vie et de la Terre"} <= names


async def test_list_subject_chapters_empty_for_seeded_subject(client: AsyncClient) -> None:
    exams = (await client.get("/api/v1/exams")).json()
    bac_id = next(e["id"] for e in exams if e["code"] == "BAC")
    subjects = (await client.get(f"/api/v1/exams/{bac_id}/subjects")).json()
    math_id = next(s["id"] for s in subjects if s["name"] == "Mathématiques")

    response = await client.get(f"/api/v1/subjects/{math_id}/chapters")

    assert response.status_code == 200
    assert response.json() == []

