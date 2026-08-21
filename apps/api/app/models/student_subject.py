"""StudentSubject: the subjects a student follows (association)."""

import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Index, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class StudentSubject(Base):
    __tablename__ = "student_subjects"
    __table_args__ = (
        # The composite primary key already indexes (student_id, subject_id);
        # only subject_id needs its own index for reverse lookups.
        Index("ix_student_subjects_subject_id", "subject_id"),
    )

    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id"), primary_key=True
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("subjects.id"), primary_key=True
    )
    added_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )
