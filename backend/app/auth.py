"""Authentication & authorization: password hashing, JWT, and dependencies."""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, Header, HTTPException, status
from passlib.hash import pbkdf2_sha256
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .database import get_db
from .models import AppSetting, User

# --- Permission catalogue ---------------------------------------------------

# Fixed set of permission keys with human-readable labels. The order here is the
# order surfaced to clients via the /roles endpoint.
ALL_PERMISSIONS: list[tuple[str, str]] = [
    ("view_cases", "View cases"),
    ("create_cases", "Add cases"),
    ("edit_cases", "Edit cases"),
    ("delete_cases", "Delete cases"),
    ("import_cases", "Import data"),
    ("export_cases", "Export data"),
    ("manage_users", "Manage users & roles"),
]

PERMISSION_KEYS = [key for key, _ in ALL_PERMISSIONS]

# Default system roles. Each is created once (by name) if it does not yet exist.
DEFAULT_ROLES: list[tuple[str, list[str]]] = [
    ("Admin", list(PERMISSION_KEYS)),
    ("Secretary", ["view_cases", "create_cases", "export_cases"]),
    (
        "Section Officer",
        ["view_cases", "create_cases", "edit_cases", "export_cases"],
    ),
]


async def seed_default_roles(db: AsyncSession) -> None:
    """Idempotently create the default system roles (only if name missing)."""
    from .models import Role  # local import to avoid a cycle at module load

    result = await db.execute(select(Role.name))
    existing = {name for (name,) in result.all()}
    created = False
    for name, perms in DEFAULT_ROLES:
        if name not in existing:
            db.add(Role(name=name, permissions=list(perms), is_system=True))
            created = True
    if created:
        await db.commit()


async def ensure_secret(db: AsyncSession) -> None:
    """Ensure the JWT secret exists (delegates to the cached getter)."""
    await get_secret(db)


# --- Password hashing -------------------------------------------------------

def hash_password(password: str) -> str:
    return pbkdf2_sha256.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    try:
        return pbkdf2_sha256.verify(password, hashed)
    except (ValueError, TypeError):
        return False


# --- JWT secret -------------------------------------------------------------

_JWT_SECRET_KEY = "jwt_secret"
_secret_cache: Optional[str] = None


async def get_secret(db: AsyncSession) -> str:
    """Return the JWT signing secret, generating & persisting it on first use.

    Cached in a module-level variable so it is stable across requests within a
    process; all instances read the same persisted DB value.
    """
    global _secret_cache
    if _secret_cache is not None:
        return _secret_cache

    setting = await db.get(AppSetting, _JWT_SECRET_KEY)
    if setting is None:
        secret = secrets.token_hex(32)
        db.add(AppSetting(key=_JWT_SECRET_KEY, value=secret))
        await db.commit()
    else:
        secret = setting.value

    _secret_cache = secret
    return secret


# --- Tokens -----------------------------------------------------------------

_ALGORITHM = "HS256"
_TOKEN_TTL = timedelta(days=7)


async def create_token(db: AsyncSession, username: str) -> str:
    secret = await get_secret(db)
    payload = {
        "sub": username,
        "exp": datetime.now(timezone.utc) + _TOKEN_TTL,
    }
    return jwt.encode(payload, secret, algorithm=_ALGORITHM)


async def decode_token(db: AsyncSession, token: str) -> Optional[str]:
    secret = await get_secret(db)
    try:
        payload = jwt.decode(token, secret, algorithms=[_ALGORITHM])
    except jwt.PyJWTError:
        return None
    sub = payload.get("sub")
    return sub if isinstance(sub, str) else None


# --- Dependencies -----------------------------------------------------------

async def get_current_user(
    authorization: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Resolve the current user from a ``Authorization: Bearer <token>`` header."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(" ", 1)[1].strip()
    username = await decode_token(db, token)
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await db.execute(select(User).where(User.username == username))
    user = result.scalars().first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="User is inactive")
    return user


def user_to_out(user: User) -> dict:
    """Shape a ``User`` (with its joined role) into ``UserOut`` fields."""
    return {
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "role": user.role.name,
        "permissions": list(user.role.permissions or []),
        "is_active": user.is_active,
    }


def require(*perms: str):
    """Build a dependency that enforces the given permission keys.

    A user's effective permissions are exactly their role's permission list;
    there is no implicit grant (e.g. ``manage_users`` does not imply the rest).
    """

    async def _dependency(user: User = Depends(get_current_user)) -> User:
        granted = set(user.role.permissions or [])
        missing = [p for p in perms if p not in granted]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return _dependency
