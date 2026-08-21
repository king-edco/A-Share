"""Student model: the PWA user account (phone-number + PIN auth)."""

import uuid

from sqlalchemy import ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Student(TimestampMixin, Base):
    __tablename__ = "students"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    # Stored normalized in E.164 (+237...) format for uniqueness lookups.
    phone_number: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    pin_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    school: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(255), nullable=True)
    exam_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("exams.id"), nullable=False, index=True
    )
    series_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("series.id"), nullable=False, index=True
    )
    is_active: Mapped[bool] = mapped_column(default=True, server_default="true")