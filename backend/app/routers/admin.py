import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    decode_token,
    get_password_hash,
    oauth2_scheme,
    verify_password,
)
from app.models.models import AdminUser
from app.schemas.admin import (
    AdminInviteRequest,
    AdminLoginRequest,
    AdminRegisterRequest,
    AdminResponse,
    TokenResponse,
)

router = APIRouter()


def get_current_admin(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> AdminUser:
    payload = decode_token(token)
    admin_id = payload.get("sub")
    if admin_id is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    admin = db.query(AdminUser).filter(AdminUser.id == admin_id).first()
    if admin is None:
        raise HTTPException(status_code=401, detail="Admin not found")
    return admin


@router.post("/invite", response_model=AdminResponse)
def invite_admin(
    request: AdminInviteRequest,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    if current_admin.role not in ("super_admin", "admin"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    existing = db.query(AdminUser).filter(AdminUser.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    invite_token = str(uuid.uuid4())
    new_admin = AdminUser(
        email=request.email,
        password_hash="",
        full_name="",
        role=request.role,
        invited_by=current_admin.id,
        invite_token=invite_token,
        invite_status="pending",
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)
    return new_admin


@router.post("/register", response_model=TokenResponse)
def register_admin(request: AdminRegisterRequest, db: Session = Depends(get_db)):
    admin = db.query(AdminUser).filter(AdminUser.invite_token == request.invite_token).first()
    if not admin or admin.invite_status != "pending":
        raise HTTPException(status_code=400, detail="Invalid or expired invite token")

    admin.password_hash = get_password_hash(request.password)
    admin.full_name = request.full_name
    admin.invite_token = None
    admin.invite_status = "accepted"
    db.commit()

    access_token = create_access_token(data={"sub": str(admin.id), "role": admin.role})
    return TokenResponse(access_token=access_token)


@router.post("/login", response_model=TokenResponse)
def login_admin(request: AdminLoginRequest, db: Session = Depends(get_db)):
    admin = db.query(AdminUser).filter(AdminUser.email == request.email).first()
    if not admin or not verify_password(request.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if admin.invite_status != "accepted":
        raise HTTPException(status_code=403, detail="Account not activated")

    access_token = create_access_token(data={"sub": str(admin.id), "role": admin.role})
    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=AdminResponse)
def get_current_admin_profile(current_admin: AdminUser = Depends(get_current_admin)):
    return current_admin
