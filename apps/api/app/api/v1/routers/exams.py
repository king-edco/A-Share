"""GET endpoints for exams, their series, and their subjects (read-only catalog)."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_session
from app.models.exam import Exam
from app.models.series import Series
from app.models.subject import Subject
from app.schemas import ExamRead, SeriesRead, SubjectRead

router = APIRouter(prefix="/api/v1/exams", tags=["exams"])


@router.get("", response_model=list[ExamRead])
async def list_exams(
    session: AsyncSession = Depends(get_async_session),
) -> list[Exam]:
    """Return all active exams ordered by code."""
    result = await session.execute(
        select(Exam).where(Exam.is_active).order_by(Exam.code)
    )
    return list(result.scalars().all())


@router.get("/{exam_id}/series", response_model=list[SeriesRead])
async def list_exam_series(
    exam_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session),
) -> list[Series]:
    """Return a flat list of all series for one exam.

    Each item carries parent_series_id so clients can rebuild the tree.
    """
    exam = await session.get(Exam, exam_id)
    if exam is None:
        raise HTTPException(status_code=404, detail="Exam not found")

    result = await session.execute(
        select(Series)
        .where(Series.exam_id == exam_id, Series.is_active)
        .order_by(Series.code)
    )
    return list(result.scalars().all())


@router.get("/{exam_id}/subjects", response_model=list[SubjectRead])
async def list_exam_subjects(
    exam_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session),
) -> list[Subject]:
    """Return all active subjects for one exam, ordered by name."""
    exam = await session.get(Exam, exam_id)
    if exam is None:
        raise HTTPException(status_code=404, detail="Exam not found")

    result = await session.execute(
        select(Subject)
        .where(Subject.exam_id == exam_id, Subject.is_active)
        .order_by(Subject.name)
    )
    return list(result.scalars().all())
