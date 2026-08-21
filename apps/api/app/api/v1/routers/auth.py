"""Authentication endpoints: login, token refresh, and current identity."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_admin
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.db.session import get_async_session
from app.models import Admin, AdminRole, AdminSubjectGrant, Exam, Role, Subject
from app.schemas.auth import (
    AccessTokenResponse,
    AdminRead,
    AdminRoleRead,
    LoginRequest,
    RefreshRequest,
    SubjectGrantRead,
    TokenResponse,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid credentials",
)


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    session: AsyncSession = Depends(get_async_session),
) -> TokenResponse:
    """Verify credentials and issue an access/refresh token pair."""
    result = await session.execute(select(Admin).where(Admin.email == body.email))
    admin = result.scalar()
    if (
        admin is None
        or not admin.is_active
        or not verify_password(body.password, admin.password_hash)
    ):
        raise _UNAUTHORIZED
    return TokenResponse(
        access_token=create_access_token(admin.id),
        refresh_token=create_refresh_token(admin.id),
    )


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh(
    body: RefreshRequest,
    session: AsyncSession = Depends(get_async_session),
) -> AccessTokenResponse:
    """Exchange a valid refresh token for a new access token.

    The token alone is not sufficient: the referenced admin must still
    exist and be active, so deactivated or deleted accounts immediately
    lose refresh capability even with an unexpired refresh token.

    Refresh tokens remain otherwise stateless JWTs: there is no server-side
    revocation list (intentionally — no Redis needed). Their lifetime is
    short (7 days) and the account check above is the revocation mechanism.
    """
    admin_id = decode_token(body.refresh_token, expected_type="refresh")
    if admin_id is None:
        raise _UNAUTHORIZED
    admin = await session.get(Admin, admin_id)
    if admin is None or not admin.is_active:
        raise _UNAUTHORIZED
    return AccessTokenResponse(access_token=create_access_token(admin_id))


@router.get("/me", response_model=AdminRead)
async def me(
    admin: Admin = Depends(get_current_admin),
    session: AsyncSession = Depends(get_async_session),
) -> AdminRead:
    """Return the authenticated admin's identity and scoped roles."""
    result = await session.execute(
        select(AdminRole, Role)
        .join(Role, AdminRole.role_id == Role.id)
        .where(AdminRole.admin_id == admin.id)
        .order_by(Role.code)
    )
    grants_result = await session.execute(
        select(AdminSubjectGrant, Subject, Exam)
        .join(Subject, AdminSubjectGrant.subject_id == Subject.id)
        .join(Exam, Subject.exam_id == Exam.id)
        .where(AdminSubjectGrant.admin_id == admin.id)
        .order_by(Subject.name)
    )
    return AdminRead(
        id=admin.id,
        email=admin.email,
        roles=[
            AdminRoleRead(
                code=role.code,
                label=role.label,
                system_scope=admin_role.system_scope,
            )
            for admin_role, role in result.all()
        ],
        subject_grants=[
            SubjectGrantRead(
                subject_id=grant.subject_id,
                subject_name=subject.name,
                exam_code=exam.code,
            )
            for grant, subject, exam in grants_result.all()
        ],
    )
