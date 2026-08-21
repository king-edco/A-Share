"""Validate a student's subject selection against the series pool rules.

A series' pool is built from the series itself and all its ancestors
(parent_series_id chain). Closed pools (is_binding=true) only allow pool
subjects; suggested pools (is_binding=false) allow any subject in the exam.
Compulsory subjects are always auto-added regardless.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Series, SeriesSubject, Subject


class InvalidSubjectSelection(ValueError):
    """Raised when a subject list violates the series pool rules."""


async def _ancestors(session: AsyncSession, series_id: uuid.UUID) -> set[uuid.UUID]:
    chain = {series_id}
    current = series_id
    while True:
        parent = (
            await session.execute(
                select(Series.parent_series_id).where(Series.id == current)
            )
        ).scalar()
        if parent is None:
            break
        chain.add(parent)
        current = parent
    return chain


async def validate_subject_selection(
    session: AsyncSession,
    exam_id: uuid.UUID,
    series_id: uuid.UUID,
    subject_ids: list[uuid.UUID],
) -> list[uuid.UUID]:
    """Return the validated subject ids (with compulsory auto-added)."""
    series = await session.get(Series, series_id)
    if series is None:
        raise InvalidSubjectSelection("Series not found")
    if series.exam_id != exam_id:
        raise InvalidSubjectSelection("Series does not belong to the given exam")

    ancestor_ids = await _ancestors(session, series_id)
    pool_result = await session.execute(
        select(SeriesSubject, Subject)
        .join(Subject, SeriesSubject.subject_id == Subject.id)
        .where(SeriesSubject.series_id.in_(ancestor_ids))
    )
    compulsory_ids: set[uuid.UUID] = set()
    pool_ids: set[uuid.UUID] = set()
    for link, _subject in pool_result.all():
        pool_ids.add(link.subject_id)
        if link.is_compulsory:
            compulsory_ids.add(link.subject_id)

    provided = set(subject_ids)
    # Auto-add any compulsory subjects the client omitted.
    missing_compulsory = compulsory_ids - provided
    provided |= compulsory_ids

    if series.is_binding:
        invalid = provided - pool_ids
        if invalid:
            raise InvalidSubjectSelection(
                f"The selected subjects are not part of this series' "
                f"pool: {[str(i) for i in invalid]}."
            )
    else:
        invalid_ids = provided - pool_ids
        # Suggested pool: any subject in the exam is allowed.
        if invalid_ids:
            same_exam = (
                await session.execute(
                    select(Subject).where(Subject.id.in_(invalid_ids))
                )
            ).scalars().all()
            wrong = [s.id for s in same_exam if s.exam_id != exam_id]
            if wrong or len(same_exam) != len(invalid_ids):
                raise InvalidSubjectSelection(
                    f"The selected subjects are not part of this exam's "
                    f"catalog: {[str(i) for i in wrong or invalid_ids]}."
                )

    if series.min_subjects is not None and len(provided) < series.min_subjects:
        raise InvalidSubjectSelection(
            f"At least {series.min_subjects} subjects are required "
            f"(you selected {len(provided)})."
        )
    if series.max_subjects is not None and len(provided) > series.max_subjects:
        raise InvalidSubjectSelection(
            f"At most {series.max_subjects} subjects are allowed "
            f"(you selected {len(provided)})."
        )
    if missing_compulsory:
        # Notify is implicit: the endpoint reports the final list back.
        pass
    return sorted(provided, key=str)
