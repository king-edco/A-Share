"""Seed the database with the minimal sample dataset.

Runnable standalone (python -m app.db.seed); get-or-create semantics make it
idempotent: re-running it never creates duplicates.

Seeded graph:
- Exam BAC (FR): series "D" (stream science) with compulsory subjects
  Mathématiques (coef 7), Physique-Chimie (coef 6), SVT (coef 5).
- Exam GCE_AL (EN): series "Science" (parent grouping only, no direct
  subjects) and child series "S1" with compulsory subjects Pure Mathematics,
  Physics, Chemistry.
- Permissions exam.manage / series.manage / subject.manage / chapter.manage,
  roles super_admin and content_manager (both linked to all four
  permissions for now), and one bootstrap admin account (credentials from
  the ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD environment
  variables) holding the super_admin role with system_scope BOTH.
"""

import asyncio
import os
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.db.session import _get_engine
from app.models import (
    Admin,
    AdminRole,
    Exam,
    Permission,
    Role,
    RolePermission,
    Series,
    SeriesSubject,
    Subject,
)

_PERMISSION_CODES = ("exam.manage", "series.manage", "subject.manage", "chapter.manage")


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


async def _get_or_create_permission(session: AsyncSession, code: str) -> Permission:
    permission = (
        await session.execute(select(Permission).where(Permission.code == code))
    ).scalar()

    if permission is None:
        permission = Permission(code=code)
        session.add(permission)
        await session.flush()
    return permission


async def _get_or_create_role(
    session: AsyncSession, code: str, label: str
) -> Role:
    role = (await session.execute(select(Role).where(Role.code == code))).scalar()

    if role is None:
        role = Role(code=code, label=label)
        session.add(role)
        await session.flush()
    return role


async def _link_role_permission(
    session: AsyncSession, role: Role, permission: Permission
) -> None:
    link = (
        await session.execute(
            select(RolePermission).where(
                RolePermission.role_id == role.id,
                RolePermission.permission_id == permission.id,
            )
        )
    ).scalar()

    if link is None:
        session.add(RolePermission(role_id=role.id, permission_id=permission.id))


async def _get_or_create_bootstrap_admin(
    session: AsyncSession, roles: list[Role]
) -> Admin:
    email = os.environ.get("ADMIN_BOOTSTRAP_EMAIL")
    password = os.environ.get("ADMIN_BOOTSTRAP_PASSWORD")
    if not email or not password:
        raise RuntimeError(
            "ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD must be set "
            "to create the bootstrap admin account."
        )

    admin = (
        await session.execute(select(Admin).where(Admin.email == email))
    ).scalar()

    if admin is None:
        admin = Admin(email=email, password_hash=hash_password(password))
        session.add(admin)
        await session.flush()

    for role in roles:
        assignment = (
            await session.execute(
                select(AdminRole).where(
                    AdminRole.admin_id == admin.id,
                    AdminRole.role_id == role.id,
                )
            )
        ).scalar()
        if assignment is None:
            session.add(
                AdminRole(admin_id=admin.id, role_id=role.id, system_scope="BOTH")
            )
    return admin


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

    permissions = [await _get_or_create_permission(session, code) for code in _PERMISSION_CODES]
    super_admin = await _get_or_create_role(session, "super_admin", "Super Admin")
    content_manager = await _get_or_create_role(session, "content_manager", "Content Manager")
    for role in (super_admin, content_manager):
        for permission in permissions:
            await _link_role_permission(session, role, permission)
    await _get_or_create_bootstrap_admin(session, [super_admin])

    await session.commit()


async def _main() -> None:
    engine = _get_engine()
    async with AsyncSession(engine) as session:
        await seed(session)
    await engine.dispose()
    print("Seed completed.")


if __name__ == "__main__":
    asyncio.run(_main())
