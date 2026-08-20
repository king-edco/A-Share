"""Password hashing and JWT issuance/verification for admin authentication.

Secrets come from the environment (JWT_SECRET_KEY) and are read lazily at
call time, so tests and local tooling can inject them without rebuilding
the application settings.
"""

import hashlib
import os
import secrets
import uuid
from datetime import UTC, datetime, timedelta

from jose import jwt
from jose.exceptions import JWTError
from passlib.context import CryptContext

ACCESS_TOKEN_MINUTES = 15
REFRESH_TOKEN_DAYS = 7
_ALGORITHM = "HS256"

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _pwd_context.verify(password, password_hash)


def _jwt_secret() -> str:
    secret = os.environ.get("JWT_SECRET_KEY")
    if not secret:
        raise RuntimeError("JWT_SECRET_KEY environment variable is not set.")
    return secret


def _issue_token(admin_id: uuid.UUID, token_type: str, lifetime: timedelta) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(admin_id),
        "type": token_type,
        "iat": now,
        "exp": now + lifetime,
    }
    return jwt.encode(payload, _jwt_secret(), algorithm=_ALGORITHM)


def create_access_token(admin_id: uuid.UUID) -> str:
    return _issue_token(admin_id, "access", timedelta(minutes=ACCESS_TOKEN_MINUTES))


def create_refresh_token(admin_id: uuid.UUID) -> str:
    return _issue_token(admin_id, "refresh", timedelta(days=REFRESH_TOKEN_DAYS))


def decode_token(token: str, expected_type: str) -> uuid.UUID | None:
    """Return the admin id in `sub` when the token is valid, else None."""
    try:
        payload = jwt.decode(token, _jwt_secret(), algorithms=[_ALGORITHM])
    except JWTError:
        return None
    if payload.get("type") != expected_type:
        return None
    try:
        return uuid.UUID(payload["sub"])
    except (KeyError, ValueError):
        return None


def generate_invitation_token() -> tuple[str, str]:
    """Return (raw_token, sha256_hex_digest).

    Only the digest is ever stored; the raw token is shown to the inviter
    exactly once and used as the invite URL secret.
    """
    raw = secrets.token_urlsafe(32)
    return raw, hashlib.sha256(raw.encode("utf-8")).hexdigest()
