"""Chapter model: self-referencing hierarchy of syllabus chapters."""

import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, Uuid, true
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Chapter(TimestampMixin, Base):
    __tablename__ = "chapters"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("subjects.id"), nullable=False, index=True
    )
    parent_chapter_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("chapters.id"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    order_index: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    syllabus_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=true()
    )
