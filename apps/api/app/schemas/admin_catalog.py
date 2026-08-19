"""Request/response schemas for the admin catalog write endpoints.

PATCH models are partially populated: applying them only touches fields the
client actually sent, including explicit nulls (useful to clear optional
columns like coefficient, stream_group, or parent ids).
"""

import uuid
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel

SystemValue = Literal["FR", "EN"]


class ExamCreate(BaseModel):
    code: str
    name: str
    system: SystemValue


class ExamUpdate(BaseModel):
    name: str | None = None
    system: SystemValue | None = None
    is_active: bool | None = None


class SeriesCreate(BaseModel):
    exam_id: uuid.UUID
    parent_series_id: uuid.UUID | None = None
    code: str
    label: str
    stream_group: str | None = None
    is_binding: bool = True
    min_subjects: int | None = None
    max_subjects: int | None = None


class SeriesUpdate(BaseModel):
    parent_series_id: uuid.UUID | None = None
    code: str | None = None
    label: str | None = None
    stream_group: str | None = None
    is_binding: bool | None = None
    min_subjects: int | None = None
    max_subjects: int | None = None
    is_active: bool | None = None


class SubjectCreate(BaseModel):
    exam_id: uuid.UUID
    name: str


class SubjectUpdate(BaseModel):
    name: str | None = None
    is_active: bool | None = None


class SeriesSubjectCreate(BaseModel):
    subject_id: uuid.UUID
    coefficient: Decimal | None = None
    is_compulsory: bool = False
    subject_category: str | None = None


class SeriesSubjectUpdate(BaseModel):
    coefficient: Decimal | None = None
    is_compulsory: bool | None = None
    subject_category: str | None = None


class ChapterCreate(BaseModel):
    subject_id: uuid.UUID
    parent_chapter_id: uuid.UUID | None = None
    title: str
    order_index: int = 0
    syllabus_year: int | None = None


class ChapterUpdate(BaseModel):
    parent_chapter_id: uuid.UUID | None = None
    title: str | None = None
    order_index: int | None = None
    syllabus_year: int | None = None
    is_active: bool | None = None
