"""Pydantic response schemas for the read-only catalog endpoints."""

import uuid
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class ExamRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    name: str
    system: str
    is_active: bool


class SeriesRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    exam_id: uuid.UUID
    parent_series_id: uuid.UUID | None
    code: str
    label: str
    stream_group: str | None
    min_subjects: int | None
    max_subjects: int | None
    is_active: bool


class SubjectInSeriesRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    subject_id: uuid.UUID
    name: str
    coefficient: Decimal | None
    is_compulsory: bool
