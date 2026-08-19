"""FastAPI dependencies for authentication and role-based access control."""

from collections.abc import Awaitable, Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.db.session import get_async_session
from app.models import Admin, AdminRole, Permission, RolePermission

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

    Raises 401 when the token is missing, invalid, or expired, or when the
    admin account no longer exists or has been deactivated.
    """
    if credentials is None:
        raise _UNAUTHORIZED
    admin_id = decode_token(credentials.credentials, expected_type="access")
    if admin_id is None:
        raise _UNAUTHORIZED
    admin = await session.get(Admin, admin_id)
    if admin is None or not admin.is_active:
        raise _UNAUTHORIZED
    return admin


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
