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
from app.models import Admin, AdminRole, Role
from app.schemas.auth import (
    AccessTokenResponse,
    AdminRead,
    AdminRoleRead,
    LoginRequest,
    RefreshRequest,
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
async def refresh(body: RefreshRequest) -> AccessTokenResponse:
    """Exchange a valid refresh token for a new access token."""
    admin_id = decode_token(body.refresh_token, expected_type="refresh")
    if admin_id is None:
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
    )
