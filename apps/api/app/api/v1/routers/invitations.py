"""Admin invitation endpoints: protected creation/listing + public accept."""

import hashlib
import os
import uuid
from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_permission
from app.core.security import (
    create_access_token,
    create_refresh_token,
    generate_invitation_token,
    hash_password,
)
from app.db.session import get_async_session
from app.models import (
    Admin,
    AdminInvitation,
    AdminRole,
    AdminSubjectGrant,
    Role,
)
from app.schemas.admin_accounts import (
    AcceptInvitationRequest,
    InvitationCreate,
    InvitationCreatedResponse,
    InvitationRead,
    PublicInvitationRead,
)
from app.schemas.auth import TokenResponse

router = APIRouter(prefix="/api/v1", tags=["invitations"])

_ADMIN_MANAGE = require_permission("admin.manage")


def _role_code(role: Role) -> str:
    return role.code


def _to_read(inv: AdminInvitation, role_code: str) -> InvitationRead:
    now = datetime.now(UTC)
    expires_at = inv.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    if inv.accepted_at is not None:
        status: Literal["pending", "accepted", "expired"] = "accepted"
    elif expires_at < now:
        status = "expired"
    else:
        status = "pending"
    return InvitationRead(
        id=inv.id,
        email=inv.email,
        role_code=role_code,
        system_scope=inv.system_scope,
        subject_ids=inv.subject_ids,
        status=status,
        expires_at=inv.expires_at,
        accepted_at=inv.accepted_at,
        created_at=inv.created_at,
    )


@router.post(
    "/admin/invitations",
    response_model=InvitationCreatedResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_invitation(
    body: InvitationCreate,
    session: AsyncSession = Depends(get_async_session),
    current_admin: Admin = Depends(_ADMIN_MANAGE),
) -> InvitationCreatedResponse:
    role = (
        await session.execute(select(Role).where(Role.code == body.role_code))
    ).scalar()
    if role is None:
        raise HTTPException(status_code=400, detail=f"Unknown role: {body.role_code}")

    if body.role_code in ("admin", "content_manager", "super_admin"):
        if not body.system_scope:
            raise HTTPException(
                status_code=400,
                detail=f"system_scope is required for role '{body.role_code}'.",
            )
        if body.subject_ids:
            raise HTTPException(
                status_code=400,
                detail=f"subject_ids must be empty for role '{body.role_code}'.",
            )
    if body.role_code == "contributor":
        if not body.subject_ids:
            raise HTTPException(
                status_code=400,
                detail="subject_ids must be a non-empty list for role 'contributor'.",
            )
        if body.system_scope:
            raise HTTPException(
                status_code=400,
                detail="system_scope must be null for role 'contributor'.",
            )

    raw_token, token_hash = generate_invitation_token()
    invitation = AdminInvitation(
        email=body.email,
        role_id=role.id,
        system_scope=body.system_scope,
        subject_ids=[str(sid) for sid in (body.subject_ids or [])] or None,
        token_hash=token_hash,
        invited_by_admin_id=current_admin.id,
    )
    session.add(invitation)
    await session.commit()

    frontend_base = os.environ.get("FRONTEND_BASE_URL", "http://localhost:5173").rstrip("/")
    return InvitationCreatedResponse(
        invitation=_to_read(invitation, role.code),
        raw_token=raw_token,
        invite_url=f"{frontend_base}/invite/{raw_token}",
    )


@router.get("/admin/invitations", response_model=list[InvitationRead])
async def list_invitations(
    session: AsyncSession = Depends(get_async_session),
    _=Depends(_ADMIN_MANAGE),
) -> list[InvitationRead]:
    result = await session.execute(
        select(AdminInvitation).order_by(AdminInvitation.created_at.desc())
    )
    invitations = result.scalars().all()
    out: list[InvitationRead] = []
    for inv in invitations:
        role = await session.get(Role, inv.role_id)
        out.append(_to_read(inv, role.code if role else "unknown"))
    return out


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def _get_valid_invitation(
    session: AsyncSession, token: str
) -> tuple[AdminInvitation | None, str | None]:
    """Return (invitation, error_message) for the public endpoints.

    error_message distinguishes 404 (not found) vs 410 (expired/accepted).
    """
    invitation = (
        await session.execute(
            select(AdminInvitation).where(
                AdminInvitation.token_hash == _hash_token(token)
            )
        )
    ).scalar()
    if invitation is None:
        return None, "Invitation not found"

    now = datetime.now(UTC)
    expires_at = invitation.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)

    if invitation.accepted_at is not None:
        return invitation, "This invitation has already been accepted."
    if expires_at < now:
        return invitation, "This invitation has expired."
    return invitation, None


@router.get("/invitations/{token}", response_model=PublicInvitationRead)
async def get_invitation(
    token: str,
    session: AsyncSession = Depends(get_async_session),
) -> PublicInvitationRead:
    invitation, error = await _get_valid_invitation(session, token)
    if invitation is None:
        raise HTTPException(status_code=404, detail=error)
    if error is not None:
        raise HTTPException(status_code=410, detail=error)
    role = await session.get(Role, invitation.role_id)
    return PublicInvitationRead(
        email=invitation.email, role_code=role.code if role else "unknown"
    )


@router.post("/invitations/{token}/accept", response_model=TokenResponse)
async def accept_invitation(
    token: str,
    body: AcceptInvitationRequest,
    session: AsyncSession = Depends(get_async_session),
) -> TokenResponse:
    invitation, error = await _get_valid_invitation(session, token)
    if invitation is None:
        raise HTTPException(status_code=404, detail=error)
    if error is not None:
        raise HTTPException(status_code=410, detail=error)

    existing = (
        await session.execute(select(Admin).where(Admin.email == invitation.email))
    ).scalar()
    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail="An admin account with this email already exists.",
        )

    admin = Admin(email=invitation.email, password_hash=hash_password(body.password))
    session.add(admin)
    await session.flush()

    session.add(
        AdminRole(
            admin_id=admin.id,
            role_id=invitation.role_id,
            # Contributor invitations scope by subject grant, not system_scope.
            system_scope=invitation.system_scope,
        )
    )
    for subject_id_str in invitation.subject_ids or []:
        session.add(
            AdminSubjectGrant(
                admin_id=admin.id, subject_id=uuid.UUID(subject_id_str)
            )
        )

    invitation.accepted_at = datetime.now(UTC)
    await session.commit()

    return TokenResponse(
        access_token=create_access_token(admin.id),
        refresh_token=create_refresh_token(admin.id),
    )
