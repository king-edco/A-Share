from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr


class StudentSignupRequest(BaseModel):
    full_name: str
    phone: str
    email: Optional[EmailStr] = None
    password: str
    school: Optional[str] = None
    city: Optional[str] = None
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
    email: Optional[str] = None
    language_pref: str
    school: Optional[str] = None
    city: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
