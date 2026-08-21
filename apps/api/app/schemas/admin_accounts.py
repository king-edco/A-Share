"""Schemas for admin account management and invitations."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr


class AdminRoleAssignmentRead(BaseModel):
    role_code: str
    # None for contributor assignments (scoped by subject grant instead).
    system_scope: str | None


class AdminSubjectGrantRead(BaseModel):
    subject_id: uuid.UUID
    subject_name: str


class AdminAccountRead(BaseModel):
    id: uuid.UUID
    email: str
    is_active: bool
    roles: list[AdminRoleAssignmentRead]
    subject_grants: list[AdminSubjectGrantRead]


class AdminAccountUpdate(BaseModel):
    is_active: bool


class InvitationCreate(BaseModel):
    email: EmailStr
    role_code: Literal["super_admin", "admin", "content_manager", "contributor"]
    system_scope: str | None = None
    subject_ids: list[uuid.UUID] | None = None


class InvitationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    role_code: str
    system_scope: str | None
    subject_ids: list[str] | None
    status: Literal["pending", "accepted", "expired"]
    expires_at: datetime
    accepted_at: datetime | None
    created_at: datetime


class InvitationCreatedResponse(BaseModel):
    invitation: InvitationRead
    raw_token: str
    invite_url: str


class PublicInvitationRead(BaseModel):
    email: str
    role_code: str


class AcceptInvitationRequest(BaseModel):
    password: str


class AcceptInvitationResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
