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


class SubjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    exam_id: uuid.UUID
    name: str
    is_active: bool


class SeriesRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    exam_id: uuid.UUID
    parent_series_id: uuid.UUID | None
    code: str
    label: str
    stream_group: str | None
    is_binding: bool
    min_subjects: int | None
    max_subjects: int | None
    is_active: bool


class SubjectInSeriesRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    subject_id: uuid.UUID
    name: str
    coefficient: Decimal | None
    is_compulsory: bool
    subject_category: str | None


class ChapterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    subject_id: uuid.UUID
    parent_chapter_id: uuid.UUID | None
    title: str
    order_index: int
    syllabus_year: int | None
    is_active: bool
