"""Guardrails protecting the platform from losing its last super admin."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Admin, AdminRole, Role


async def count_active_super_admins(session: AsyncSession) -> int:
    """Count admins who are active and hold the super_admin role."""
    result = await session.execute(
        select(func.count())
        .select_from(Admin)
        .join(AdminRole, AdminRole.admin_id == Admin.id)
        .join(Role, AdminRole.role_id == Role.id)
        .where(Role.code == "super_admin", Admin.is_active)
    )
    return int(result.scalar_one())


async def can_deactivate_admin(
    session: AsyncSession,
    current_admin_id: uuid.UUID,
    target_admin_id: uuid.UUID,
) -> tuple[bool, str | None]:
    """Enforce self-deactivation and last-super-admin rules.

    Returns (allowed, error_message).
    """
    if current_admin_id == target_admin_id:
        return False, "You cannot deactivate your own account."

    target = await session.get(Admin, target_admin_id)
    if target is None:
        return False, "Admin not found"

    holds_super_admin = (
        await session.execute(
            select(AdminRole)
            .join(Role, AdminRole.role_id == Role.id)
            .where(
                AdminRole.admin_id == target_admin_id,
                Role.code == "super_admin",
            )
        )
    ).scalar()

    if holds_super_admin is not None and await count_active_super_admins(session) <= 1:
        return False, (
            "Cannot deactivate the last active super admin. "
            "Assign another super admin first."
        )

    return True, None
