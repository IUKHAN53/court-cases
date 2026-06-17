"""Export filtered cases to an .xlsx download."""
from __future__ import annotations

import io
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..crud import apply_filters, apply_sort
from ..database import get_db
from ..models import Case

router = APIRouter(prefix="/api", tags=["exports"])

# Columns in the ORIGINAL Excel order. (header, model attribute)
_EXPORT_COLUMNS = [
    ("Wing", "wing"),
    ("Case Name", "case_type"),
    ("Case #", "case_number"),
    ("Case Year", "case_year"),
    ("Court", "court"),
    ("City", "city"),
    ("Case Title", "case_title"),
    ("Status", "status"),
    ("next date of hearing", "next_hearing_date"),
]


@router.get("/export")
async def export_cases(
    search: Optional[str] = None,
    wing: Optional[str] = None,
    status_: Optional[str] = Query(default=None, alias="status"),
    city: Optional[str] = None,
    court: Optional[str] = None,
    case_year: Optional[int] = None,
    deadline: Optional[str] = Query(default=None, pattern="^(upcoming|overdue|none)$"),
    sort: str = "next_hearing_date",
    order: str = Query(default="asc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    stmt = apply_filters(
        select(Case),
        search=search,
        wing=wing,
        status=status_,
        city=city,
        court=court,
        case_year=case_year,
        deadline=deadline,
    )
    stmt = apply_sort(stmt, sort, order)
    rows = (await db.execute(stmt)).scalars().all()

    wb = Workbook()
    ws = wb.active
    ws.title = "Cases"
    ws.append([header for header, _ in _EXPORT_COLUMNS])

    for r in rows:
        record = []
        for _, attr in _EXPORT_COLUMNS:
            value = getattr(r, attr)
            if attr == "next_hearing_date" and value is not None:
                value = value.isoformat()
            record.append("" if value is None else value)
        ws.append(record)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    headers = {
        "Content-Disposition": "attachment; filename=court_cases_export.xlsx"
    }
    return StreamingResponse(
        buf,
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers=headers,
    )
