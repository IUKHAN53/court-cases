"""Parse and upsert uploaded .xlsx / .csv files."""
from __future__ import annotations

import io
import math
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from . import crud
from .models import Case
from .normalize import normalize_city, normalize_status, normalize_wing

# Map of normalized (lowercased, stripped) source header -> model field.
HEADER_MAP: Dict[str, str] = {
    "wing": "wing",
    "case name": "case_type",
    "case type": "case_type",
    "case #": "case_number",
    "case no": "case_number",
    "case no.": "case_number",
    "case number": "case_number",
    "case year": "case_year",
    "year": "case_year",
    "court": "court",
    "city": "city",
    "case title": "case_title",
    "title": "case_title",
    "petitioner": "case_title",
    "status": "status",
    "status of case": "status",
    "status of the case": "status",
    "case status": "status",
    "next date of hearing": "next_hearing_date",
    "next hearing date": "next_hearing_date",
    "next hearing": "next_hearing_date",
}

# Excel's epoch (the well-known 1900 date system, with the 1900 leap-year bug).
_EXCEL_EPOCH = datetime(1899, 12, 30)

_DATE_FORMATS = (
    "%Y-%m-%d",
    "%d-%m-%Y",
    "%d/%m/%Y",
    "%m/%d/%Y",
    "%d-%b-%Y",
    "%d %b %Y",
    "%d-%B-%Y",
    "%d %B %Y",
    "%Y/%m/%d",
    "%d.%m.%Y",
)


def _normalize_header(h: Any) -> str:
    return str(h).strip().lower()


def _clean_cell(value: Any) -> Optional[str]:
    """Return a trimmed string, or None for blanks/NaN."""
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    if isinstance(value, str):
        s = value.strip()
        return s or None
    # pandas may hand us numpy types / Timestamps; stringify.
    if pd.isna(value):
        return None
    return str(value).strip() or None


def _parse_int(value: Any) -> Optional[int]:
    s = _clean_cell(value)
    if s is None:
        return None
    # Tolerate "1059.0" coming from a float column.
    try:
        return int(float(s)) if ("." in s and s.replace(".", "", 1).isdigit()) else int(s)
    except (ValueError, TypeError):
        # Last-ditch: strip non-digits.
        digits = "".join(ch for ch in s if ch.isdigit())
        return int(digits) if digits else None


def parse_date(value: Any) -> Optional[date]:
    """Parse Excel serials and common string date formats. Blank -> None."""
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    # Native datetime/date (pandas often gives Timestamps).
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, pd.Timestamp):
        return value.to_pydatetime().date()

    # Numeric -> treat as an Excel serial number.
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if pd.isna(value):
            return None
        try:
            return (_EXCEL_EPOCH + timedelta(days=float(value))).date()
        except (OverflowError, ValueError):
            return None

    s = _clean_cell(value)
    if s is None:
        return None

    # A bare integer-looking string is most likely an Excel serial.
    if s.isdigit():
        try:
            serial = int(s)
            if 1 <= serial <= 2958465:  # within Excel's date range
                return (_EXCEL_EPOCH + timedelta(days=serial)).date()
        except (ValueError, OverflowError):
            pass

    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue

    # Final fallback: let pandas have a go (handles many ISO-ish forms).
    try:
        parsed = pd.to_datetime(s, errors="coerce", dayfirst=True)
        if pd.notna(parsed):
            return parsed.to_pydatetime().date()
    except (ValueError, TypeError):
        pass
    return None


def _read_dataframe(filename: str, content: bytes) -> pd.DataFrame:
    name = (filename or "").lower()
    buf = io.BytesIO(content)
    if name.endswith(".csv"):
        # keep everything as string so we control cleaning/parsing ourselves.
        return pd.read_csv(buf, dtype=str, keep_default_na=False, na_values=[""])
    # default to Excel (.xlsx/.xls)
    return pd.read_excel(buf, engine="openpyxl", dtype=object)


def _map_columns(df: pd.DataFrame) -> Dict[str, str]:
    """Return {model_field: source_column} for recognized headers."""
    mapping: Dict[str, str] = {}
    for col in df.columns:
        field = HEADER_MAP.get(_normalize_header(col))
        if field and field not in mapping:
            mapping[field] = col
    return mapping


def rows_from_dataframe(
    df: pd.DataFrame,
) -> Tuple[List[Dict[str, Any]], List[str], int]:
    """Convert a DataFrame into cleaned case dicts.

    Returns (valid_rows, errors, skipped_count). Rows missing case_number or
    case_year are skipped (not errored).
    """
    colmap = _map_columns(df)
    valid: List[Dict[str, Any]] = []
    errors: List[str] = []
    skipped = 0

    if "case_number" not in colmap or "case_year" not in colmap:
        missing = [
            f for f in ("case_number", "case_year") if f not in colmap
        ]
        errors.append(
            "Missing required column(s): "
            + ", ".join(missing)
            + f". Found headers: {list(df.columns)}"
        )
        return valid, errors, skipped

    for idx, raw in df.iterrows():
        rownum = int(idx) + 2  # +2 to roughly match a spreadsheet row (header=1)
        try:
            case_number = _parse_int(raw[colmap["case_number"]])
            case_year = _parse_int(raw[colmap["case_year"]])
            if case_number is None or case_year is None:
                skipped += 1
                continue

            record: Dict[str, Any] = {
                "case_number": case_number,
                "case_year": case_year,
            }

            record["wing"] = _clean_cell(raw[colmap["wing"]]) if "wing" in colmap else None
            record["case_type"] = (
                _clean_cell(raw[colmap["case_type"]]) if "case_type" in colmap else None
            ) or "CPD"
            record["court"] = (
                _clean_cell(raw[colmap["court"]]) if "court" in colmap else None
            ) or "High Court"
            # city is part of the key: blank -> ''.
            city_val = _clean_cell(raw[colmap["city"]]) if "city" in colmap else None
            record["city"] = city_val or ""
            record["case_title"] = (
                _clean_cell(raw[colmap["case_title"]]) if "case_title" in colmap else None
            )
            record["status"] = (
                _clean_cell(raw[colmap["status"]]) if "status" in colmap else None
            ) or "Pending"
            record["next_hearing_date"] = (
                parse_date(raw[colmap["next_hearing_date"]])
                if "next_hearing_date" in colmap
                else None
            )

            # Canonicalize messy free-text values so reports group cleanly.
            record["wing"] = normalize_wing(record["wing"])
            record["city"] = normalize_city(record["city"])
            record["status"] = normalize_status(record["status"])

            valid.append(record)
        except Exception as exc:  # pragma: no cover - defensive per-row guard
            errors.append(f"Row {rownum}: {exc}")

    return valid, errors, skipped


async def import_file(
    db: AsyncSession, filename: str, content: bytes
) -> Dict[str, Any]:
    """Parse the uploaded file and upsert all valid rows."""
    try:
        df = _read_dataframe(filename, content)
    except Exception as exc:
        return {
            "inserted": 0,
            "updated": 0,
            "skipped": 0,
            "errors": [f"Could not read file: {exc}"],
        }

    # Drop fully-empty rows that pandas sometimes yields from spreadsheets.
    df = df.dropna(how="all")

    rows, errors, skipped = rows_from_dataframe(df)

    # Dedupe by the business key (case_number, case_year, city); the last
    # occurrence in the file wins (matches per-row upsert semantics).
    deduped: Dict[tuple, Dict[str, Any]] = {}
    for record in rows:
        payload = crud._normalize_payload(record)
        payload.setdefault("court", "High Court")
        payload.setdefault("status", "Pending")
        payload.setdefault("city", "")
        key = (payload["case_number"], payload["case_year"], payload.get("city") or "")
        deduped[key] = payload

    # Load existing rows once (avoids a SELECT per row — important for large
    # files on serverless where per-row round-trips would blow the time limit).
    existing: Dict[tuple, Case] = {}
    if deduped:
        result = await db.execute(select(Case))
        for case in result.scalars():
            existing[(case.case_number, case.case_year, case.city or "")] = case

    inserted = 0
    updated = 0
    new_cases = []
    for key, payload in deduped.items():
        found = existing.get(key)
        if found is None:
            new_cases.append(Case(**payload))
            inserted += 1
        else:
            for field, value in payload.items():
                setattr(found, field, value)
            updated += 1

    if new_cases:
        db.add_all(new_cases)
    await db.commit()

    return {
        "inserted": inserted,
        "updated": updated,
        "skipped": skipped,
        "errors": errors,
    }
