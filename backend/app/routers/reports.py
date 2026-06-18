"""Reporting endpoints: summary stats, upcoming deadlines, filter options."""
from __future__ import annotations

from datetime import date, timedelta
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case as sa_case
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import require
from ..crud import _is_active_clause, _is_disposed_clause
from ..database import get_db
from ..models import Case, User
from ..schemas import (
    CaseOut,
    FiltersResponse,
    LabelCount,
    SummaryReport,
)

router = APIRouter(prefix="/api", tags=["reports"])


async def _grouped_counts(db: AsyncSession, column, *, unassigned_label: str | None = None):
    """Return [{label, count}] grouped by a column, ordered by count desc."""
    stmt = select(column, func.count()).group_by(column).order_by(func.count().desc())
    rows = (await db.execute(stmt)).all()
    out: List[LabelCount] = []
    for value, count in rows:
        if value is None or (isinstance(value, str) and value.strip() == ""):
            label = unassigned_label if unassigned_label is not None else ""
            if unassigned_label is None:
                # skip blanks when no unassigned label requested
                continue
        else:
            label = str(value)
        out.append(LabelCount(label=label, count=count))
    return out


@router.get("/reports/summary", response_model=SummaryReport)
async def reports_summary(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require("view_cases")),
) -> SummaryReport:
    today = date.today()
    horizon = today + timedelta(days=30)
    horizon7 = today + timedelta(days=7)

    # Total / active / disposed in a single pass.
    agg = (
        await db.execute(
            select(
                func.count(),
                func.sum(sa_case((_is_disposed_clause(), 1), else_=0)),
            )
        )
    ).one()
    total = agg[0] or 0
    disposed = agg[1] or 0
    active = total - disposed

    upcoming_count = (
        await db.execute(
            select(func.count()).where(
                _is_active_clause(),
                Case.next_hearing_date.is_not(None),
                Case.next_hearing_date >= today,
                Case.next_hearing_date <= horizon,
            )
        )
    ).scalar_one()

    upcoming7_count = (
        await db.execute(
            select(func.count()).where(
                _is_active_clause(),
                Case.next_hearing_date.is_not(None),
                Case.next_hearing_date >= today,
                Case.next_hearing_date <= horizon7,
            )
        )
    ).scalar_one()

    overdue_count = (
        await db.execute(
            select(func.count()).where(
                _is_active_clause(),
                Case.next_hearing_date.is_not(None),
                Case.next_hearing_date < today,
            )
        )
    ).scalar_one()

    by_status = await _grouped_counts(db, Case.status, unassigned_label="(Unassigned)")
    by_wing = await _grouped_counts(db, Case.wing, unassigned_label="(Unassigned)")
    by_city = await _grouped_counts(db, Case.city, unassigned_label="(Unassigned)")
    by_year = await _grouped_counts(db, Case.case_year, unassigned_label="(Unassigned)")

    return SummaryReport(
        total=total,
        active=active,
        disposed=disposed,
        upcoming_count=upcoming_count,
        upcoming7_count=upcoming7_count,
        overdue_count=overdue_count,
        by_status=by_status,
        by_wing=by_wing,
        by_city=by_city,
        by_year=by_year,
    )


@router.get("/reports/upcoming", response_model=List[CaseOut])
async def reports_upcoming(
    days: int = Query(default=30, ge=0, le=3650),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require("view_cases")),
) -> List[CaseOut]:
    """Active cases that are overdue OR due within ``days``, soonest first."""
    today = date.today()
    horizon = today + timedelta(days=days)
    stmt = (
        select(Case)
        .where(
            _is_active_clause(),
            Case.next_hearing_date.is_not(None),
            Case.next_hearing_date <= horizon,
        )
        .order_by(Case.next_hearing_date.asc(), Case.id.asc())
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [CaseOut.model_validate(r) for r in rows]


@router.get("/filters", response_model=FiltersResponse)
async def filters(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require("view_cases")),
) -> FiltersResponse:
    async def distinct(column, *, numeric: bool = False):
        stmt = select(column).distinct().where(column.is_not(None))
        rows = (await db.execute(stmt)).scalars().all()
        cleaned = []
        for v in rows:
            if v is None:
                continue
            if isinstance(v, str) and v.strip() == "":
                continue
            cleaned.append(v)
        return sorted(cleaned)

    return FiltersResponse(
        wings=await distinct(Case.wing),
        statuses=await distinct(Case.status),
        cities=await distinct(Case.city),
        courts=await distinct(Case.court),
        years=await distinct(Case.case_year, numeric=True),
    )


@router.get("/health")
async def health() -> dict:
    from ..config import settings

    return {"status": "ok", "seed": settings.seed_on_startup, "build": "auth-1"}
