from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str


class AdminInviteRequest(BaseModel):
    email: EmailStr
    role: str  # "admin" | "contributor"


class AdminRegisterRequest(BaseModel):
    invite_token: str
    password: str
    full_name: str


class AdminResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    invite_status: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
