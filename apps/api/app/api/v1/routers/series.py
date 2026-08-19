"""GET endpoint for the subject pool of one series (read-only catalog)."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_session
from app.models.series import Series
from app.models.series_subject import SeriesSubject
from app.models.subject import Subject
from app.schemas import SubjectInSeriesRead

router = APIRouter(prefix="/api/v1/series", tags=["series"])


@router.get("/{series_id}/subjects", response_model=list[SubjectInSeriesRead])
async def list_series_subjects(
    series_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session),
) -> list[SubjectInSeriesRead]:
    """Return the subjects available in one series' pool, with their link
    attributes (coefficient, is_compulsory)."""
    series = await session.get(Series, series_id)
    if series is None:
        raise HTTPException(status_code=404, detail="Series not found")

    result = await session.execute(
        select(SeriesSubject, Subject)
        .join(Subject, SeriesSubject.subject_id == Subject.id)
        .where(SeriesSubject.series_id == series_id)
        .order_by(Subject.name)
    )
    return [
        SubjectInSeriesRead(
            subject_id=subject.id,
            name=subject.name,
            coefficient=link.coefficient,
            is_compulsory=link.is_compulsory,
        )
        for link, subject in result.all()
    ]
