"""Exam model: one row per national exam (BAC, PROBA, GCE_OL, GCE_AL)."""

import uuid

from sqlalchemy import Boolean, CheckConstraint, String, Uuid, true
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Exam(TimestampMixin, Base):
    __tablename__ = "exams"
    __table_args__ = (
        CheckConstraint("system IN ('FR', 'EN')", name="ck_exams_system"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    code: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    system: Mapped[str] = mapped_column(String(2), nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=true()
    )
