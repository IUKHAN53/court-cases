"""Authentication endpoints: bootstrap, login, current-user."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import (
    create_token,
    get_current_user,
    hash_password,
    seed_default_roles,
    user_to_out,
    verify_password,
)
from ..database import get_db
from ..models import Role, User
from ..schemas import BootstrapIn, LoginIn, TokenOut, UserOut

router = APIRouter(prefix="/api", tags=["auth"])


@router.post("/auth/bootstrap")
async def bootstrap(payload: BootstrapIn, db: AsyncSession = Depends(get_db)) -> dict:
    """Create the first Admin user. Refused once any user exists."""
    count = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    if count and count > 0:
        raise HTTPException(status_code=403, detail="Already initialized")

    # Make sure the default roles (incl. Admin) are present.
    await seed_default_roles(db)
    admin_role = (
        await db.execute(select(Role).where(Role.name == "Admin"))
    ).scalars().first()
    if admin_role is None:
        raise HTTPException(status_code=500, detail="Admin role missing")

    user = User(
        username=payload.username.strip().lower(),
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role_id=admin_role.id,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    return {"ok": True}


@router.post("/auth/login", response_model=TokenOut)
async def login(payload: LoginIn, db: AsyncSession = Depends(get_db)) -> TokenOut:
    username = payload.username.strip().lower()
    user = (
        await db.execute(select(User).where(User.username == username))
    ).scalars().first()
    if (
        user is None
        or not user.is_active
        or not verify_password(payload.password, user.password_hash)
    ):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = await create_token(db, user.username)
    return TokenOut(access_token=token, user=UserOut(**user_to_out(user)))


@router.get("/auth/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut(**user_to_out(user))
