from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


class StudentSignupRequest(BaseModel):
    full_name: str
    phone: str
    email: EmailStr | None = None
    password: str
    school: str | None = None
    city: str | None = None
    language_pref: str  # "fr" | "en"
    education_system_id: UUID
    exam_id: UUID
    track_id: UUID
    subject_ids: list[UUID] = []


class StudentLoginRequest(BaseModel):
    phone: str
    password: str


class StudentResponse(BaseModel):
    id: UUID
    full_name: str
    phone: str
    email: str | None = None
    language_pref: str
    school: str | None = None
    city: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
