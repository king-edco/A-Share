"""Series model: a self-referencing hierarchy of exam tracks (filières)."""

import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, Uuid, true
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Series(TimestampMixin, Base):
    __tablename__ = "series"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    exam_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("exams.id"), nullable=False, index=True
    )
    parent_series_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("series.id"), nullable=True, index=True
    )
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    stream_group: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # is_binding marks whether this series' subject pool is a closed list
    # (true: Bac, Probatoire, GCE A Level, TVE) or only a suggested default
    # (false: GCE O Level groupings, where students mix freely within the
    # exam's min/max subject rules).
    is_binding: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=true()
    )
    min_subjects: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_subjects: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=true()
    )

    parent: Mapped["Series | None"] = relationship(
        "Series", remote_side=[id], back_populates="children"
    )
    children: Mapped[list["Series"]] = relationship(
        "Series", back_populates="parent"
    )
