"""Seed the database with the minimal sample dataset.

Runnable standalone (python -m app.db.seed); get-or-create semantics make it
idempotent: re-running it never creates duplicates.

Seeded graph:
- Exam BAC (FR): series "D" (stream science) with compulsory subjects
  Mathématiques (coef 7), Physique-Chimie (coef 6), SVT (coef 5).
- Exam GCE_AL (EN): series "Science" (parent grouping only, no direct
  subjects) and child series "S1" with compulsory subjects Pure Mathematics,
  Physics, Chemistry.
"""

import asyncio
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import _get_engine
from app.models import Exam, Series, SeriesSubject, Subject


async def _get_or_create_exam(
    session: AsyncSession, code: str, name: str, system: str
) -> Exam:
    exam = (await session.execute(select(Exam).where(Exam.code == code))).scalar()

    if exam is None:
        exam = Exam(code=code, name=name, system=system)
        session.add(exam)
        await session.flush()
    return exam


async def _get_or_create_series(
    session: AsyncSession,
    exam: Exam,
    code: str,
    label: str,
    stream_group: str | None,
) -> Series:
    series = (
        await session.execute(
            select(Series).where(Series.exam_id == exam.id, Series.code == code)
        )
    ).scalar()

    if series is None:
        series = Series(
            exam_id=exam.id,
            code=code,
            label=label,
            stream_group=stream_group,
        )
        session.add(series)
        await session.flush()
    return series


async def _get_or_create_subject(
    session: AsyncSession, exam: Exam, name: str
) -> Subject:
    subject = (
        await session.execute(
            select(Subject).where(Subject.exam_id == exam.id, Subject.name == name)
        )
    ).scalar()

    if subject is None:
        subject = Subject(exam_id=exam.id, name=name)
        session.add(subject)
        await session.flush()
    return subject


async def _link_subject(
    session: AsyncSession,
    series: Series,
    subject: Subject,
    coefficient: Decimal | None,
    compulsory: bool,
) -> None:
    link = (
        await session.execute(
            select(SeriesSubject).where(
                SeriesSubject.series_id == series.id,
                SeriesSubject.subject_id == subject.id,
            )
        )
    ).scalar()

    if link is None:
        session.add(
            SeriesSubject(
                series_id=series.id,
                subject_id=subject.id,
                coefficient=coefficient,
                is_compulsory=compulsory,
            )
        )


async def seed(session: AsyncSession) -> None:
    """Insert the sample dataset into the given session (idempotent)."""
    bac = await _get_or_create_exam(session, "BAC", "Baccalauréat", "FR")
    bac_d = await _get_or_create_series(session, bac, "D", "Série D", "science")
    for name, coefficient in (
        ("Mathématiques", Decimal("7")),
        ("Physique-Chimie", Decimal("6")),
        ("Sciences de la Vie et de la Terre", Decimal("5")),
    ):
        subject = await _get_or_create_subject(session, bac, name)
        await _link_subject(session, bac_d, subject, coefficient, True)

    gce_al = await _get_or_create_exam(session, "GCE_AL", "GCE Advanced Level", "EN")
    science = await _get_or_create_series(
        session, gce_al, "Science", "Science (grouping)", "science"
    )
    s1 = await _get_or_create_series(session, gce_al, "S1", "Upper Sixth Science 1", "science")
    if s1.parent_series_id is None:
        s1.parent_series_id = science.id
        await session.flush()
    for name in ("Pure Mathematics", "Physics", "Chemistry"):
        subject = await _get_or_create_subject(session, gce_al, name)
        await _link_subject(session, s1, subject, None, True)

    await session.commit()


async def _main() -> None:
    engine = _get_engine()
    async with AsyncSession(engine) as session:
        await seed(session)
    await engine.dispose()
    print("Seed completed.")


if __name__ == "__main__":
    asyncio.run(_main())
