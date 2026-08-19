"""Admin write endpoints for the exam catalog.

Every endpoint requires an authenticated admin holding the resource-specific
permission, with system_scope enforced against the target exam (see
require_permission_scoped). Deletion is always soft (is_active = false);
the only hard deletion is detaching a subject from a series' pool, which
removes the association row itself.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_permission_scoped
from app.db.session import get_async_session
from app.models import Chapter, Exam, Series, SeriesSubject, Subject
from app.schemas import ChapterRead, ExamRead, SeriesRead, SubjectInSeriesRead
from app.schemas.admin_catalog import (
    ChapterCreate,
    ChapterUpdate,
    ExamCreate,
    ExamUpdate,
    SeriesCreate,
    SeriesSubjectCreate,
    SeriesSubjectUpdate,
    SeriesUpdate,
    SubjectCreate,
    SubjectUpdate,
)

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

_EXAM_MANAGE = require_permission_scoped("exam.manage")
_SERIES_MANAGE = require_permission_scoped("series.manage")
_SUBJECT_MANAGE = require_permission_scoped("subject.manage")
_CHAPTER_MANAGE = require_permission_scoped("chapter.manage")


def _apply_patch(target, data: BaseModel) -> None:
    """Apply exactly the fields the client sent (even explicit nulls)."""
    for field_name in data.model_fields_set:
        setattr(target, field_name, getattr(data, field_name))


# Exams --------------------------------------------------------------------


@router.post("/exams", response_model=ExamRead, status_code=status.HTTP_201_CREATED)
async def create_exam(
    body: ExamCreate,
    session: AsyncSession = Depends(get_async_session),
    _=Depends(_EXAM_MANAGE),
) -> Exam:
    duplicate = (
        await session.execute(select(Exam).where(Exam.code == body.code))
    ).scalar()
    if duplicate is not None:
        raise HTTPException(status_code=409, detail=f"Exam code '{body.code}' already exists")

    exam = Exam(code=body.code, name=body.name, system=body.system)
    session.add(exam)
    await session.commit()
    return exam


@router.patch("/exams/{exam_id}", response_model=ExamRead)
async def update_exam(
    exam_id: uuid.UUID,
    body: ExamUpdate,
    session: AsyncSession = Depends(get_async_session),
    _=Depends(_EXAM_MANAGE),
) -> Exam:
    exam = await session.get(Exam, exam_id)
    if exam is None:
        raise HTTPException(status_code=404, detail="Exam not found")
    _apply_patch(exam, body)
    await session.commit()
    return exam


@router.delete("/exams/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam(
    exam_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session),
    _=Depends(_EXAM_MANAGE),
) -> None:
    exam = await session.get(Exam, exam_id)
    if exam is None:
        raise HTTPException(status_code=404, detail="Exam not found")
    exam.is_active = False
    await session.commit()


# Series -------------------------------------------------------------------


@router.post("/series", response_model=SeriesRead, status_code=status.HTTP_201_CREATED)
async def create_series(
    body: SeriesCreate,
    session: AsyncSession = Depends(get_async_session),
    _=Depends(_SERIES_MANAGE),
) -> Series:
    exam = await session.get(Exam, body.exam_id)
    if exam is None:
        raise HTTPException(status_code=404, detail="Exam not found")
    if body.parent_series_id is not None:
        await _require_valid_parent(session, body.parent_series_id, body.exam_id, None)

    series = Series(
        exam_id=body.exam_id,
        parent_series_id=body.parent_series_id,
        code=body.code,
        label=body.label,
        stream_group=body.stream_group,
        is_binding=body.is_binding,
        min_subjects=body.min_subjects,
        max_subjects=body.max_subjects,
    )
    session.add(series)
    await session.commit()
    return series


async def _require_valid_parent(
    session: AsyncSession,
    parent_id: uuid.UUID,
    exam_id: uuid.UUID,
    series_id: uuid.UUID | None,
) -> Series:
    parent = await session.get(Series, parent_id)
    if parent is None or parent.exam_id != exam_id:
        raise HTTPException(
            status_code=400,
            detail="parent_series_id must reference a series of the same exam",
        )
    if series_id is not None and parent_id == series_id:
        raise HTTPException(status_code=400, detail="A series cannot be its own parent")
    return parent


@router.patch("/series/{series_id}", response_model=SeriesRead)
async def update_series(
    series_id: uuid.UUID,
    body: SeriesUpdate,
    session: AsyncSession = Depends(get_async_session),
    _=Depends(_SERIES_MANAGE),
) -> Series:
    series = await session.get(Series, series_id)
    if series is None:
        raise HTTPException(status_code=404, detail="Series not found")
    if "parent_series_id" in body.model_fields_set and body.parent_series_id is not None:
        await _require_valid_parent(session, body.parent_series_id, series.exam_id, series_id)
    _apply_patch(series, body)
    await session.commit()
    return series


@router.delete("/series/{series_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_series(
    series_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session),
    _=Depends(_SERIES_MANAGE),
) -> None:
    series = await session.get(Series, series_id)
    if series is None:
        raise HTTPException(status_code=404, detail="Series not found")
    active_children = (
        await session.execute(
            select(Series.id).where(
                Series.parent_series_id == series_id, Series.is_active
            )
        )
    ).scalars().all()
    if active_children:
        raise HTTPException(
            status_code=409,
            detail="Series has active child series; reassign or deactivate them first",
        )
    series.is_active = False
    await session.commit()


# Subjects -----------------------------------------------------------------


@router.post("/subjects", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_subject(
    body: SubjectCreate,
    session: AsyncSession = Depends(get_async_session),
    _=Depends(_SUBJECT_MANAGE),
) -> dict:
    exam = await session.get(Exam, body.exam_id)
    if exam is None:
        raise HTTPException(status_code=404, detail="Exam not found")
    subject = Subject(exam_id=body.exam_id, name=body.name)
    session.add(subject)
    await session.commit()
    return {"id": subject.id, "name": subject.name, "is_active": subject.is_active}


@router.patch("/subjects/{subject_id}", response_model=dict)
async def update_subject(
    subject_id: uuid.UUID,
    body: SubjectUpdate,
    session: AsyncSession = Depends(get_async_session),
    _=Depends(_SUBJECT_MANAGE),
) -> dict:
    subject = await session.get(Subject, subject_id)
    if subject is None:
        raise HTTPException(status_code=404, detail="Subject not found")
    _apply_patch(subject, body)
    await session.commit()
    return {"id": subject.id, "name": subject.name, "is_active": subject.is_active}


@router.delete("/subjects/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(
    subject_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session),
    _=Depends(_SUBJECT_MANAGE),
) -> None:
    subject = await session.get(Subject, subject_id)
    if subject is None:
        raise HTTPException(status_code=404, detail="Subject not found")
    subject.is_active = False
    await session.commit()


# Series <-> subject links ---------------------------------------------------


@router.post(
    "/series/{series_id}/subjects",
    response_model=SubjectInSeriesRead,
    status_code=status.HTTP_201_CREATED,
)
async def attach_subject(
    series_id: uuid.UUID,
    body: SeriesSubjectCreate,
    session: AsyncSession = Depends(get_async_session),
    _=Depends(_SERIES_MANAGE),
) -> SubjectInSeriesRead:
    series = await session.get(Series, series_id)
    if series is None:
        raise HTTPException(status_code=404, detail="Series not found")
    subject = await session.get(Subject, body.subject_id)
    if subject is None:
        raise HTTPException(status_code=404, detail="Subject not found")
    if subject.exam_id != series.exam_id:
        raise HTTPException(
            status_code=400,
            detail="Series and subject must belong to the same exam",
        )
    existing = (
        await session.execute(
            select(SeriesSubject).where(
                SeriesSubject.series_id == series_id,
                SeriesSubject.subject_id == body.subject_id,
            )
        )
    ).scalar()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Subject already attached to this series")

    link = SeriesSubject(
        series_id=series_id,
        subject_id=body.subject_id,
        coefficient=body.coefficient,
        is_compulsory=body.is_compulsory,
        subject_category=body.subject_category,
    )
    session.add(link)
    await session.commit()
    return SubjectInSeriesRead(
        subject_id=subject.id,
        name=subject.name,
        coefficient=link.coefficient,
        is_compulsory=link.is_compulsory,
        subject_category=link.subject_category,
    )


async def _get_link_or_404(
    session: AsyncSession, series_id: uuid.UUID, subject_id: uuid.UUID
) -> SeriesSubject:
    link = (
        await session.execute(
            select(SeriesSubject).where(
                SeriesSubject.series_id == series_id,
                SeriesSubject.subject_id == subject_id,
            )
        )
    ).scalar()
    if link is None:
        raise HTTPException(status_code=404, detail="Series-subject link not found")
    return link


@router.patch(
    "/series/{series_id}/subjects/{subject_id}",
    response_model=SubjectInSeriesRead,
)
async def update_link(
    series_id: uuid.UUID,
    subject_id: uuid.UUID,
    body: SeriesSubjectUpdate,
    session: AsyncSession = Depends(get_async_session),
    _=Depends(_SERIES_MANAGE),
) -> SubjectInSeriesRead:
    link = await _get_link_or_404(session, series_id, subject_id)
    _apply_patch(link, body)
    await session.commit()
    subject = await session.get(Subject, subject_id)
    return SubjectInSeriesRead(
        subject_id=subject_id,
        name=subject.name if subject else "",
        coefficient=link.coefficient,
        is_compulsory=link.is_compulsory,
        subject_category=link.subject_category,
    )


@router.delete(
    "/series/{series_id}/subjects/{subject_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def detach_subject(
    series_id: uuid.UUID,
    subject_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session),
    _=Depends(_SERIES_MANAGE),
) -> None:
    link = await _get_link_or_404(session, series_id, subject_id)
    await session.delete(link)
    await session.commit()


# Chapters ------------------------------------------------------------------


async def _validate_chapter_parent(
    session: AsyncSession,
    subject_id: uuid.UUID,
    parent_id: uuid.UUID | None,
    chapter_id: uuid.UUID | None = None,
) -> None:
    if parent_id is None:
        return
    parent = await session.get(Chapter, parent_id)
    if parent is None or parent.subject_id != subject_id:
        raise HTTPException(
            status_code=400,
            detail="parent_chapter_id must reference a chapter of the same subject",
        )
    if chapter_id is not None and parent_id == chapter_id:
        raise HTTPException(status_code=400, detail="A chapter cannot be its own parent")


@router.post("/chapters", response_model=ChapterRead, status_code=status.HTTP_201_CREATED)
async def create_chapter(
    body: ChapterCreate,
    session: AsyncSession = Depends(get_async_session),
    _=Depends(_CHAPTER_MANAGE),
) -> Chapter:
    subject = await session.get(Subject, body.subject_id)
    if subject is None:
        raise HTTPException(status_code=404, detail="Subject not found")
    await _validate_chapter_parent(session, body.subject_id, body.parent_chapter_id)

    chapter = Chapter(
        subject_id=body.subject_id,
        parent_chapter_id=body.parent_chapter_id,
        title=body.title,
        order_index=body.order_index,
        syllabus_year=body.syllabus_year,
    )
    session.add(chapter)
    await session.commit()
    return chapter


@router.patch("/chapters/{chapter_id}", response_model=ChapterRead)
async def update_chapter(
    chapter_id: uuid.UUID,
    body: ChapterUpdate,
    session: AsyncSession = Depends(get_async_session),
    _=Depends(_CHAPTER_MANAGE),
) -> Chapter:
    chapter = await session.get(Chapter, chapter_id)
    if chapter is None:
        raise HTTPException(status_code=404, detail="Chapter not found")
    if (
        "parent_chapter_id" in body.model_fields_set
        and body.parent_chapter_id is not None
    ):
        await _validate_chapter_parent(
            session, chapter.subject_id, body.parent_chapter_id, chapter_id
        )
    _apply_patch(chapter, body)
    await session.commit()
    return chapter


@router.delete("/chapters/{chapter_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chapter(
    chapter_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session),
    _=Depends(_CHAPTER_MANAGE),
) -> None:
    chapter = await session.get(Chapter, chapter_id)
    if chapter is None:
        raise HTTPException(status_code=404, detail="Chapter not found")
    active_children = (
        await session.execute(
            select(Chapter.id).where(
                Chapter.parent_chapter_id == chapter_id, Chapter.is_active
            )
        )
    ).scalars().all()
    if active_children:
        raise HTTPException(
            status_code=409,
            detail="Chapter has active child chapters; reassign or deactivate them first",
        )
    chapter.is_active = False
    await session.commit()
