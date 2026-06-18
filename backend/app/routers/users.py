"""User & role administration (all endpoints require ``manage_users``)."""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import ALL_PERMISSIONS, hash_password, require, user_to_out
from ..database import get_db
from ..models import Role, User
from ..schemas import (
    RoleCreate,
    RoleOut,
    RoleUpdate,
    UserCreate,
    UserOut,
    UserUpdate,
)

router = APIRouter(prefix="/api", tags=["users"])


async def _role_by_name(db: AsyncSession, name: str) -> Role | None:
    return (
        await db.execute(select(Role).where(Role.name == name))
    ).scalars().first()


# --- Users ------------------------------------------------------------------

@router.get("/users", response_model=List[UserOut])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require("manage_users")),
) -> List[UserOut]:
    rows = (await db.execute(select(User).order_by(User.id))).scalars().all()
    return [UserOut(**user_to_out(u)) for u in rows]


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require("manage_users")),
) -> UserOut:
    username = payload.username.strip().lower()
    existing = (
        await db.execute(select(User).where(User.username == username))
    ).scalars().first()
    if existing is not None:
        raise HTTPException(status_code=400, detail="Username already exists")

    role = await _role_by_name(db, payload.role)
    if role is None:
        raise HTTPException(status_code=400, detail="Role not found")

    user = User(
        username=username,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role_id=role.id,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserOut(**user_to_out(user))


@router.put("/users/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require("manage_users")),
) -> UserOut:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.role is not None:
        role = await _role_by_name(db, payload.role)
        if role is None:
            raise HTTPException(status_code=400, detail="Role not found")
        user.role_id = role.id
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.password is not None:
        user.password_hash = hash_password(payload.password)

    await db.commit()
    await db.refresh(user)
    return UserOut(**user_to_out(user))


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require("manage_users")),
) -> None:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == _user.id:
        raise HTTPException(status_code=400, detail="You cannot delete yourself")

    # Refuse to delete the last remaining Admin-role user.
    admin_role = await _role_by_name(db, "Admin")
    if admin_role is not None and user.role_id == admin_role.id:
        admin_count = (
            await db.execute(
                select(func.count())
                .select_from(User)
                .where(User.role_id == admin_role.id)
            )
        ).scalar_one()
        if admin_count <= 1:
            raise HTTPException(
                status_code=400, detail="Cannot delete the last Admin user"
            )

    await db.delete(user)
    await db.commit()
    return None


# --- Roles ------------------------------------------------------------------

@router.get("/roles")
async def list_roles(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require("manage_users")),
) -> dict:
    rows = (await db.execute(select(Role).order_by(Role.id))).scalars().all()
    return {
        "roles": [
            RoleOut(
                id=r.id,
                name=r.name,
                permissions=list(r.permissions or []),
                is_system=r.is_system,
            )
            for r in rows
        ],
        "all_permissions": [
            {"key": key, "label": label} for key, label in ALL_PERMISSIONS
        ],
    }


@router.put("/roles/{role_id}", response_model=RoleOut)
async def update_role(
    role_id: int,
    payload: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require("manage_users")),
) -> RoleOut:
    role = await db.get(Role, role_id)
    if role is None:
        raise HTTPException(status_code=404, detail="Role not found")
    role.permissions = list(payload.permissions)
    await db.commit()
    await db.refresh(role)
    return RoleOut(
        id=role.id,
        name=role.name,
        permissions=list(role.permissions or []),
        is_system=role.is_system,
    )


@router.post("/roles", response_model=RoleOut, status_code=status.HTTP_201_CREATED)
async def create_role(
    payload: RoleCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require("manage_users")),
) -> RoleOut:
    existing = await _role_by_name(db, payload.name)
    if existing is not None:
        raise HTTPException(status_code=400, detail="Role name already exists")
    role = Role(
        name=payload.name, permissions=list(payload.permissions), is_system=False
    )
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return RoleOut(
        id=role.id,
        name=role.name,
        permissions=list(role.permissions or []),
        is_system=role.is_system,
    )
