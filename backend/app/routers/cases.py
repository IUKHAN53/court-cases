"""CRUD + listing endpoints for cases."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from .. import crud
from ..auth import require
from ..database import get_db
from ..models import User
from ..schemas import CaseCreate, CaseListResponse, CaseOut, CaseUpdate

router = APIRouter(prefix="/api", tags=["cases"])


@router.get("/cases", response_model=CaseListResponse)
async def list_cases(
    search: Optional[str] = None,
    wing: Optional[str] = None,
    status_: Optional[str] = Query(default=None, alias="status"),
    city: Optional[str] = None,
    court: Optional[str] = None,
    case_year: Optional[int] = None,
    deadline: Optional[str] = Query(
        default=None, pattern="^(upcoming|upcoming7|overdue|none)$"
    ),
    active: Optional[bool] = None,
    sort: str = "next_hearing_date",
    order: str = Query(default="asc", pattern="^(asc|desc)$"),
    limit: int = Query(default=50, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require("view_cases")),
) -> CaseListResponse:
    filters = {
        "search": search,
        "wing": wing,
        "status": status_,
        "city": city,
        "court": court,
        "case_year": case_year,
        "deadline": deadline,
        "active": active,
    }
    rows, total = await crud.list_cases(
        db, filters=filters, sort=sort, order=order, limit=limit, offset=offset
    )
    return CaseListResponse(items=[CaseOut.model_validate(r) for r in rows], total=total)


@router.post("/cases", response_model=CaseOut, status_code=status.HTTP_201_CREATED)
async def create_case(
    payload: CaseCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require("create_cases")),
) -> CaseOut:
    case = await crud.create_case(db, payload.model_dump())
    return CaseOut.model_validate(case)


@router.put("/cases/{case_id}", response_model=CaseOut)
async def update_case(
    case_id: int,
    payload: CaseUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require("edit_cases")),
) -> CaseOut:
    case = await crud.get_case(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    data = payload.model_dump(exclude_unset=True)
    case = await crud.update_case(db, case, data)
    return CaseOut.model_validate(case)


@router.delete("/cases/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_case(
    case_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require("delete_cases")),
) -> None:
    case = await crud.get_case(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    await crud.delete_case(db, case)
    return None
