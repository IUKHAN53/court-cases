"""Database access helpers: filtering, listing, CRUD and upsert."""
from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Dict, Optional, Sequence, Tuple

from sqlalchemy import Select, String, asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Case

# Columns that are safe to sort by (whitelist guards against injection / errors).
SORTABLE_COLUMNS = {
    "id": Case.id,
    "wing": Case.wing,
    "case_type": Case.case_type,
    "case_number": Case.case_number,
    "case_year": Case.case_year,
    "court": Case.court,
    "city": Case.city,
    "case_title": Case.case_title,
    "status": Case.status,
    "next_hearing_date": Case.next_hearing_date,
    "created_at": Case.created_at,
    "updated_at": Case.updated_at,
}

# An "active" case is anything not disposed. We compare on a lowercased prefix
# so it works identically on SQLite (no ILIKE) and Postgres.
_DISPOSED_PREFIX = "disposed"


def _is_disposed_clause():
    return func.lower(Case.status).like(f"{_DISPOSED_PREFIX}%")


def _is_active_clause():
    return ~_is_disposed_clause()


def apply_filters(
    stmt: Select,
    *,
    search: Optional[str] = None,
    wing: Optional[str] = None,
    status: Optional[str] = None,
    city: Optional[str] = None,
    court: Optional[str] = None,
    case_year: Optional[int] = None,
    deadline: Optional[str] = None,
    active: Optional[bool] = None,
    today: Optional[date] = None,
) -> Select:
    """Apply the shared filter set used by list/export/report endpoints."""
    if today is None:
        today = date.today()

    if active is True:
        stmt = stmt.where(_is_active_clause())
    elif active is False:
        stmt = stmt.where(_is_disposed_clause())

    if search:
        term = f"%{search.strip().lower()}%"
        conditions = [
            func.lower(Case.case_title).like(term),
            func.lower(Case.wing).like(term),
            func.cast(Case.case_number, String).like(term),
        ]
        stmt = stmt.where(or_(*conditions))

    if wing:
        stmt = stmt.where(Case.wing == wing)
    if status:
        stmt = stmt.where(Case.status == status)
    if city:
        stmt = stmt.where(Case.city == city)
    if court:
        stmt = stmt.where(Case.court == court)
    if case_year is not None:
        stmt = stmt.where(Case.case_year == case_year)

    if deadline == "none":
        stmt = stmt.where(Case.next_hearing_date.is_(None))
    elif deadline == "upcoming":
        horizon = today + timedelta(days=30)
        stmt = stmt.where(
            _is_active_clause(),
            Case.next_hearing_date.is_not(None),
            Case.next_hearing_date >= today,
            Case.next_hearing_date <= horizon,
        )
    elif deadline == "overdue":
        stmt = stmt.where(
            _is_active_clause(),
            Case.next_hearing_date.is_not(None),
            Case.next_hearing_date < today,
        )

    return stmt


def apply_sort(stmt: Select, sort: str, order: str) -> Select:
    """Apply ORDER BY with a sensible, stable fallback."""
    col = SORTABLE_COLUMNS.get(sort, Case.next_hearing_date)
    direction = desc if (order or "asc").lower() == "desc" else asc
    # Tie-break on id for deterministic pagination.
    return stmt.order_by(direction(col), asc(Case.id))


async def list_cases(
    db: AsyncSession,
    *,
    filters: Dict[str, Any],
    sort: str = "next_hearing_date",
    order: str = "asc",
    limit: int = 50,
    offset: int = 0,
) -> Tuple[Sequence[Case], int]:
    """Return a page of cases plus the total count for the same filters."""
    base = apply_filters(select(Case), **filters)

    count_stmt = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = apply_sort(base, sort, order).limit(limit).offset(offset)
    rows = (await db.execute(stmt)).scalars().all()
    return rows, total


async def get_case(db: AsyncSession, case_id: int) -> Optional[Case]:
    return await db.get(Case, case_id)


def _normalize_payload(data: Dict[str, Any]) -> Dict[str, Any]:
    """Trim strings and enforce city != NULL / sensible defaults."""
    out = dict(data)
    for key in ("wing", "case_title"):
        if key in out and isinstance(out[key], str):
            out[key] = out[key].strip() or None
    for key in ("case_type", "court", "status"):
        if key in out and isinstance(out[key], str):
            out[key] = out[key].strip()
    if "city" in out:
        out["city"] = (out["city"] or "").strip() if out["city"] is not None else ""
    return out


async def create_case(db: AsyncSession, data: Dict[str, Any]) -> Case:
    payload = _normalize_payload(data)
    payload.setdefault("court", "High Court")
    payload.setdefault("status", "Pending")
    payload.setdefault("city", "")
    case = Case(**payload)
    db.add(case)
    await db.commit()
    await db.refresh(case)
    return case


async def update_case(
    db: AsyncSession, case: Case, data: Dict[str, Any]
) -> Case:
    payload = _normalize_payload(data)
    for key, value in payload.items():
        setattr(case, key, value)
    await db.commit()
    await db.refresh(case)
    return case


async def delete_case(db: AsyncSession, case: Case) -> None:
    await db.delete(case)
    await db.commit()


async def find_by_business_key(
    db: AsyncSession, case_number: int, case_year: int, city: str
) -> Optional[Case]:
    stmt = select(Case).where(
        Case.case_number == case_number,
        Case.case_year == case_year,
        Case.city == (city or ""),
    )
    return (await db.execute(stmt)).scalars().first()


async def upsert_case(
    db: AsyncSession, data: Dict[str, Any], *, commit: bool = True
) -> str:
    """Insert or update a case by the (case_number, case_year, city) key.

    Returns ``"inserted"`` or ``"updated"``. When ``commit`` is False the caller
    is responsible for committing (used for batch imports).
    """
    payload = _normalize_payload(data)
    payload.setdefault("court", "High Court")
    payload.setdefault("status", "Pending")
    payload.setdefault("city", "")

    existing = await find_by_business_key(
        db, payload["case_number"], payload["case_year"], payload["city"]
    )
    if existing is None:
        db.add(Case(**payload))
        result = "inserted"
    else:
        for key, value in payload.items():
            setattr(existing, key, value)
        result = "updated"

    if commit:
        await db.commit()
    return result
