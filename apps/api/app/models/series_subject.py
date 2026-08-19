"""SeriesSubject: association between a series and its subject pool.

Distinct from a plain many-to-many table because each link carries extra
attributes (coefficient, is_compulsory) and forms a composite primary key.
"""

import uuid
from decimal import Decimal

from sqlalchemy import Boolean, ForeignKey, Index, Numeric, Uuid, false
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SeriesSubject(Base):
    __tablename__ = "series_subjects"
    __table_args__ = (
        # The composite primary key already indexes (series_id, subject_id);
        # only subject_id needs its own index for reverse lookups.
        Index("ix_series_subjects_subject_id", "subject_id"),
    )

    series_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("series.id"), primary_key=True
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("subjects.id"), primary_key=True
    )
    coefficient: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2), nullable=True
    )
    is_compulsory: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=false()
    )
