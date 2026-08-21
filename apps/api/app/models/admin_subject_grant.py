"""AdminSubjectGrant: scopes a contributor to specific subjects only."""

import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Index, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AdminSubjectGrant(Base):
    __tablename__ = "admin_subject_grants"
    __table_args__ = (
        # The composite primary key already indexes (admin_id, subject_id);
        # only subject_id needs its own index for reverse lookups.
        Index("ix_admin_subject_grants_subject_id", "subject_id"),
    )

    admin_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("admins.id"), primary_key=True
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("subjects.id"), primary_key=True
    )
    granted_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        nullable=False,
    )
