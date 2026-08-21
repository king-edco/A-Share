"""Schemas for student registration, login, and profile."""

import uuid

from pydantic import BaseModel, Field

PIN_PATTERN = r"^\d{4,6}$"


class StudentRegisterRequest(BaseModel):
    phone_number: str
    pin: str = Field(pattern=PIN_PATTERN)
    full_name: str
    school: str | None = None
    city: str | None = None
    exam_id: uuid.UUID
    series_id: uuid.UUID
    subject_ids: list[uuid.UUID] = Field(default_factory=list)


class StudentLoginRequest(BaseModel):
    phone_number: str
    pin: str = Field(pattern=PIN_PATTERN)


class StudentRefreshRequest(BaseModel):
    refresh_token: str


class SubjectInProfile(BaseModel):
    subject_id: uuid.UUID
    name: str


class StudentProfileRead(BaseModel):
    id: uuid.UUID
    phone_number: str
    full_name: str
    school: str | None
    city: str | None
    exam_id: uuid.UUID
    exam_name: str
    series_id: uuid.UUID
    series_label: str
    subjects: list[SubjectInProfile]
