"""File import endpoint (.xlsx / .csv upsert)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from .. import importer
from ..database import get_db
from ..schemas import ImportResult

router = APIRouter(prefix="/api", tags=["imports"])

_ALLOWED_SUFFIXES = (".xlsx", ".xls", ".csv")


@router.post("/import", response_model=ImportResult)
async def import_cases(
    file: UploadFile = File(...), db: AsyncSession = Depends(get_db)
) -> ImportResult:
    filename = file.filename or ""
    if not filename.lower().endswith(_ALLOWED_SUFFIXES):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Upload a .xlsx or .csv file.",
        )
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    result = await importer.import_file(db, filename, content)
    return ImportResult(**result)
