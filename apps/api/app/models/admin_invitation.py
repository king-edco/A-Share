"""AdminInvitation: a one-time invite to create an admin account.

Only a SHA-256 digest of the raw token is stored; the raw token is returned
exactly once (on creation) and never persisted.
"""

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.models.base import Base

INVITATION_LIFETIME = timedelta(days=7)


def default_expires_at() -> datetime:
    return datetime.now(UTC) + INVITATION_LIFETIME


class AdminInvitation(Base):
    __tablename__ = "admin_invitations"
    __table_args__ = (
        CheckConstraint(
            "system_scope IS NULL OR system_scope IN ('FR', 'EN', 'BOTH')",
            name="ck_admin_invitations_scope",
        ),
        Index("ix_admin_invitations_token_hash", "token_hash", unique=True),
        Index("ix_admin_invitations_email", "email"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    role_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("roles.id"), nullable=False
    )
    system_scope: Mapped[str | None] = mapped_column(String(8), nullable=True)
    # Contributor invitations carry the exact subjects they will be granted.
    # Stored as a portable JSON array of UUID strings (JSONB on Postgres).
    subject_ids: Mapped[list | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    invited_by_admin_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("admins.id"), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=default_expires_at
    )
    accepted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
