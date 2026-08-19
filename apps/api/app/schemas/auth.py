"""Request/response schemas for the authentication endpoints."""

import uuid

from pydantic import BaseModel, ConfigDict


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AdminRoleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    label: str
    system_scope: str


class AdminRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    roles: list[AdminRoleRead]
