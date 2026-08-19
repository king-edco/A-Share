"""Throwaway RBAC probe endpoint.

Exists only to prove the auth + RBAC chain works end to end; delete this
file when the real admin CRUD endpoints land in the next phase.
"""

import uuid

from fastapi import APIRouter, Depends

from app.core.deps import require_permission
from app.models import Admin

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/ping")
async def admin_ping(
    admin: Admin = Depends(require_permission("exam.manage")),
) -> dict[str, uuid.UUID | str]:
    return {"admin_id": admin.id, "message": "pong"}
