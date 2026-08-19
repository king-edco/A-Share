"""RolePermission: association between roles and the permissions they grant."""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.permission import Permission
    from app.models.role import Role


class RolePermission(Base):
    __tablename__ = "role_permissions"
    __table_args__ = (
        # The composite primary key already indexes (role_id, permission_id);
        # only permission_id needs its own index for reverse lookups.
        Index("ix_role_permissions_permission_id", "permission_id"),
    )

    role_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("roles.id"), primary_key=True
    )
    permission_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("permissions.id"), primary_key=True
    )

    role: Mapped["Role"] = relationship("Role", back_populates="role_permissions")
    permission: Mapped["Permission"] = relationship("Permission")
