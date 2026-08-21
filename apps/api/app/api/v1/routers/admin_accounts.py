"""Admin account management (list + activate/deactivate).

Platform-level: protected by the admin.manage permission, no system_scope
resolution (that is catalog-level).
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_permission
from app.db.session import get_async_session
from app.models import Admin, AdminRole, AdminSubjectGrant, Role, Subject
from app.schemas.admin_accounts import (
    AdminAccountRead,
    AdminAccountUpdate,
    AdminRoleAssignmentRead,
    AdminSubjectGrantRead,
)
from app.services.admin_safety import can_deactivate_admin

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

_ADMIN_MANAGE = require_permission("admin.manage")


@router.get("/admins", response_model=list[AdminAccountRead])
async def list_admins(
    session: AsyncSession = Depends(get_async_session),
    _=Depends(_ADMIN_MANAGE),
) -> list[AdminAccountRead]:
    result = await session.execute(select(Admin).order_by(Admin.email))
    admins = result.scalars().all()
    out: list[AdminAccountRead] = []
    for admin in admins:
        roles_result = await session.execute(
            select(AdminRole, Role)
            .join(Role, AdminRole.role_id == Role.id)
            .where(AdminRole.admin_id == admin.id)
            .order_by(Role.code)
        )
        roles = [
            AdminRoleAssignmentRead(role_code=role.code, system_scope=admin_role.system_scope)
            for admin_role, role in roles_result.all()
        ]
        grants_result = await session.execute(
            select(AdminSubjectGrant, Subject)
            .join(Subject, AdminSubjectGrant.subject_id == Subject.id)
            .where(AdminSubjectGrant.admin_id == admin.id)
            .order_by(Subject.name)
        )
        grants = [
            AdminSubjectGrantRead(subject_id=grant.subject_id, subject_name=subject.name)
            for grant, subject in grants_result.all()
        ]
        out.append(
            AdminAccountRead(
                id=admin.id,
                email=admin.email,
                is_active=admin.is_active,
                roles=roles,
                subject_grants=grants,
            )
        )
    return out


@router.patch("/admins/{admin_id}", response_model=AdminAccountRead)
async def update_admin(
    admin_id: uuid.UUID,
    body: AdminAccountUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_admin: Admin = Depends(_ADMIN_MANAGE),
) -> AdminAccountRead:
    target = await session.get(Admin, admin_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Admin not found")

    if not body.is_active and target.is_active:
        allowed, message = await can_deactivate_admin(
            session, current_admin.id, admin_id
        )
        if not allowed:
            raise HTTPException(
                status_code=(
                    status.HTTP_400_BAD_REQUEST
                    if message == "You cannot deactivate your own account."
                    else status.HTTP_409_CONFLICT
                ),
                detail=message,
            )
    target.is_active = body.is_active
    await session.commit()
    return AdminAccountRead(
        id=target.id,
        email=target.email,
        is_active=target.is_active,
        roles=[],
        subject_grants=[],
    )
