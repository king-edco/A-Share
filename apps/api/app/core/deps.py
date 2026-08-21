"""FastAPI dependencies for authentication and role-based access control."""

import uuid
from collections.abc import Awaitable, Callable

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token_actor
from app.db.session import get_async_session
from app.models import (
    Admin,
    AdminRole,
    AdminSubjectGrant,
    Chapter,
    Exam,
    Permission,
    RolePermission,
    Series,
    Student,
    Subject,
)

_bearer = HTTPBearer(auto_error=False)

_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid or expired access token",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    session: AsyncSession = Depends(get_async_session),
) -> Admin:
    """Extract the Bearer access token and load the authenticated admin.

    Raises 401 when the token is missing, invalid, or expired, when the
    admin account is missing/inactive, or when the token is not an admin
    token (actor_type != "admin").
    """
    if credentials is None:
        raise _UNAUTHORIZED
    admin_id, actor_type = decode_token_actor(
        credentials.credentials, expected_type="access"
    )
    if admin_id is None:
        raise _UNAUTHORIZED
    if actor_type != "admin":
        raise _UNAUTHORIZED
    admin = await session.get(Admin, admin_id)
    if admin is None or not admin.is_active:
        raise _UNAUTHORIZED
    return admin


async def get_current_student(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    session: AsyncSession = Depends(get_async_session),
) -> Student:
    """Extract the Bearer access token and load the authenticated student.

    Raises 401 when the token is missing, invalid, or expired, when the
    student account is missing/inactive, or when the token is not a
    student token (actor_type != "student"). A student's token never
    grants access to admin endpoints and vice versa.
    """
    if credentials is None:
        raise _UNAUTHORIZED
    student_id, actor_type = decode_token_actor(
        credentials.credentials, expected_type="access"
    )
    if student_id is None:
        raise _UNAUTHORIZED
    if actor_type != "student":
        raise _UNAUTHORIZED
    student = await session.get(Student, student_id)
    if student is None or not student.is_active:
        raise _UNAUTHORIZED
    return student


def require_permission(
    permission_code: str,
) -> Callable[[Admin, AsyncSession], Awaitable[Admin]]:
    """Build a dependency that requires the admin to hold a permission.

    Only the permission code is checked here; system_scope enforcement
    against actual resources comes with the admin CRUD endpoints.
    """

    async def dependency(
        admin: Admin = Depends(get_current_admin),
        session: AsyncSession = Depends(get_async_session),
    ) -> Admin:
        result = await session.execute(
            select(RolePermission)
            .join(Permission, RolePermission.permission_id == Permission.id)
            .join(AdminRole, RolePermission.role_id == AdminRole.role_id)
            .where(AdminRole.admin_id == admin.id, Permission.code == permission_code)
        )
        if result.first() is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permission: {permission_code}",
            )
        return admin

    return dependency


async def _granted_scopes(
    session: AsyncSession, admin: Admin, permission_code: str
) -> set[str]:
    """Return the system_scope values the admin holds for one permission."""
    result = await session.execute(
        select(AdminRole.system_scope)
        .join(RolePermission, AdminRole.role_id == RolePermission.role_id)
        .join(Permission, RolePermission.permission_id == Permission.id)
        .where(AdminRole.admin_id == admin.id, Permission.code == permission_code)
    )
    return set(result.scalars().all())


async def _resolve_target_systems(
    request: Request, session: AsyncSession
) -> list[str]:
    """Resolve which exam system(s) the write request targets.

    Resolution rules (path params win over body fields, most specific first):
    - chapter_id -> the chapter's subject's exam
    - series_id -> the series' exam (subject_id in the same path does not
      affect scope; cross-exam links are rejected by the handlers with 400)
    - subject_id -> the subject's exam
    - exam_id -> the exam itself
    - otherwise (POST bodies): exam_id / subject_id from the body, and
      finally a raw `system` value (POST /admin/exams has no row yet)
    A PATCH on an exam that also changes `system` resolves both the current
    and the requested system, so both scopes are required.
    Unknown/missing targets resolve to an empty list (no scope check);
    the handlers then respond with 404/422 as appropriate.
    """
    params = request.path_params
    statement = None

    # Path param ids arrive as strings; Uuid columns need uuid.UUID.
    def _param_uuid(key: str) -> uuid.UUID | None:
        try:
            return uuid.UUID(params[key]) if key in params else None
        except (ValueError, TypeError):
            return None

    chapter_uuid = _param_uuid("chapter_id")
    series_uuid = _param_uuid("series_id")
    subject_uuid = _param_uuid("subject_id")
    exam_uuid = _param_uuid("exam_id")

    if chapter_uuid is not None:
        statement = (
            select(Exam.system)
            .join(Subject, Subject.exam_id == Exam.id)
            .join(Chapter, Chapter.subject_id == Subject.id)
            .where(Chapter.id == chapter_uuid)
        )
    elif series_uuid is not None:
        statement = (
            select(Exam.system)
            .join(Series, Series.exam_id == Exam.id)
            .where(Series.id == series_uuid)
        )
    elif subject_uuid is not None:
        statement = (
            select(Exam.system)
            .join(Subject, Subject.exam_id == Exam.id)
            .where(Subject.id == subject_uuid)
        )
    elif exam_uuid is not None:
        statement = select(Exam.system).where(Exam.id == exam_uuid)

    systems: list[str] = []
    if statement is not None:
        systems.extend((await session.execute(statement)).scalars().all())

    if request.method in ("POST", "PATCH"):
        try:
            body = await request.json()
        except Exception:  # noqa: BLE001 - absence of a JSON body means no resolution
            body = None
        if isinstance(body, dict):
            # JSON body ids arrive as strings; Uuid columns need uuid.UUID.
            def _as_uuid(key: str) -> uuid.UUID | None:
                try:
                    return uuid.UUID(body[key])
                except (KeyError, ValueError, TypeError):
                    return None

            exam_uuid = _as_uuid("exam_id")
            if exam_uuid is not None and "series_id" not in params:
                rows = (
                    await session.execute(
                        select(Exam.system).where(Exam.id == exam_uuid)
                    )
                ).scalars()
                systems.extend(rows.all())
            subject_uuid = _as_uuid("subject_id")
            if subject_uuid is not None and not systems and "exam_id" not in body:
                rows = (
                    await session.execute(
                        select(Exam.system)
                        .join(Subject, Subject.exam_id == Exam.id)
                        .where(Subject.id == subject_uuid)
                    )
                ).scalars()
                systems.extend(rows.all())
            # POST /admin/exams: no row exists yet, scope from the raw value.
            if statement is None and "system" in body:
                systems.append(body["system"])
            # PATCH /admin/exams/{exam_id} changing the system: also require
            # scope for the new system, not just the current one.
            if (
                request.method == "PATCH"
                and "exam_id" in params
                and isinstance(body.get("system"), str)
                and body["system"] not in systems
            ):
                systems.append(body["system"])

    return systems


def require_permission_scoped(
    permission_code: str,
) -> Callable[[Request, Admin, AsyncSession], Awaitable[Admin]]:
    """Build a dependency that enforces a permission AND its system_scope.

    Everything require_permission does (401 unauthenticated, 403 without
    the permission), plus a scope check: the target exam's system must be
    covered by the admin's granted scopes for this permission, where scope
    "BOTH" covers any system.
    """

    async def dependency(
        request: Request,
        admin: Admin = Depends(require_permission(permission_code)),
        session: AsyncSession = Depends(get_async_session),
    ) -> Admin:
        systems = await _resolve_target_systems(request, session)
        if systems:
            granted = await _granted_scopes(session, admin, permission_code)
            for system in systems:
                if "BOTH" not in granted and system not in granted:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=(
                            f"Your system_scope does not cover exam system "
                            f"'{system}' for permission '{permission_code}'."
                        ),
                    )
        return admin

    return dependency


async def _resolve_target_subject_id(
    request: Request, session: AsyncSession
) -> uuid.UUID | None:
    """Resolve the subject_id a chapter write targets.

    PATCH/DELETE carry chapter_id in the path (look up the chapter);
    POST carries subject_id in the body.
    """
    params = request.path_params
    chapter_uuid = None
    try:
        if "chapter_id" in params:
            chapter_uuid = uuid.UUID(params["chapter_id"])
    except (ValueError, TypeError):
        chapter_uuid = None

    if chapter_uuid is not None:
        chapter = await session.get(Chapter, chapter_uuid)
        if chapter is None:
            return None
        return chapter.subject_id

    if request.method == "POST":
        try:
            body = await request.json()
        except Exception:  # noqa: BLE001
            body = None
        if isinstance(body, dict) and "subject_id" in body:
            try:
                return uuid.UUID(body["subject_id"])
            except (ValueError, TypeError):
                return None
    return None


def require_chapter_permission_scoped() -> Callable[
    [Request, Admin, AsyncSession], Awaitable[Admin]
]:
    """Chapter-specific permission check supporting two grant paths.

    Access is granted if EITHER the admin holds a role granting
    chapter.manage with a system_scope covering the subject's exam
    (broad admins), OR the admin has an explicit AdminSubjectGrant for
    the exact subject (contributors).
    """

    async def dependency(
        request: Request,
        admin: Admin = Depends(require_permission("chapter.manage")),
        session: AsyncSession = Depends(get_async_session),
    ) -> Admin:
        subject_id = await _resolve_target_subject_id(request, session)
        if subject_id is None:
            # Not resolvable (e.g. chapter not found) — let the handler
            # respond with 404/422 rather than a misleading 403.
            return admin

        # Broad path: role assignment with a covering system_scope.
        subject = await session.get(Subject, subject_id)
        if subject is None:
            return admin
        exam = await session.get(Exam, subject.exam_id)
        if exam is not None:
            granted = await _granted_scopes(session, admin, "chapter.manage")
            if "BOTH" in granted or exam.system in granted:
                return admin

        # Contributor path: explicit subject grant.
        grant = (
            await session.execute(
                select(AdminSubjectGrant).where(
                    AdminSubjectGrant.admin_id == admin.id,
                    AdminSubjectGrant.subject_id == subject_id,
                )
            )
        ).scalar()
        if grant is not None:
            return admin

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You do not have chapter.manage access to this subject "
                "(no covering system_scope or subject grant)."
            ),
        )

    return dependency

