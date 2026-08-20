"""AdminRole: association between admins and roles, with a system_scope.

The scope (FR, EN, or BOTH) will later restrict which exam system the admin
may act on; it is stored now and enforced in the next phase.
"""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.admin import Admin
    from app.models.role import Role


class AdminRole(Base):
    __tablename__ = "admin_roles"
    __table_args__ = (
        CheckConstraint(
            "system_scope IS NULL OR system_scope IN ('FR', 'EN', 'BOTH')",
            name="ck_admin_roles_scope",
        ),
        # The composite primary key already indexes (admin_id, role_id);
        # only role_id needs its own index for reverse lookups.
        Index("ix_admin_roles_role_id", "role_id"),
    )

    admin_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("admins.id"), primary_key=True
    )
    role_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("roles.id"), primary_key=True
    )
    # Nullable: contributor assignments scope by subject grant, not system.
    system_scope: Mapped[str | None] = mapped_column(String(8), nullable=True)

    admin: Mapped["Admin"] = relationship("Admin", back_populates="admin_roles")
    role: Mapped["Role"] = relationship("Role", back_populates="admin_roles")
