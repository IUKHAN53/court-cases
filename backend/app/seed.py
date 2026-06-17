"""Idempotent seeding of sample + synthetic live data."""
from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Case

# Original 22 rows. Format: (wing, case_number, case_year, city, case_title, status)
# case_type is always "CPD", court is always "High Court". Blank -> None
# (except city blank -> '').
_ORIGINAL_ROWS = [
    ("Agriculture Extension", 1059, 2013, "Larkana", "Habib-ur-Rehman Tunio", "Disposed of"),
    ("Agriculture Research", 1093, 2013, "Larkana", "Gul Muhammad Soomro", "Disposed of"),
    ("SASO", 397, 2013, "Karachi", "", "Disposed of"),
    ("Agriculture Marketing", 537, 2013, "Hyderabad", "Abdul Latif", "Disposed of"),
    ("Agriculture Extension", 904, 2012, "Hyderabad", "", "Disposed of"),
    ("Agriculture Extension", 932, 2013, "Hyderabad", "Imam Bux Balouch", "Disposed of"),
    ("AE&WM", 1270, 2013, "Hyderabad", "Zahid Hussain Soomro", "Disposed of"),
    ("Agriculture Marketing", 1949, 2013, "Hyderabad", "Muhammad Waris", "Disposed of"),
    ("Sindh Seed Corporation", 395, 2013, "", "Aamir Hussain", "Disposed of"),
    ("Agriculture Extension", 538, 2013, "Hyderabad", "Ghulam Abbas", "Statement Filed"),
    ("Agriculture Research", 1247, 2012, "Larkana", "Riyaz Ahmed & Others", "Statement Filed"),
    ("", 2190, 2012, "Hyderabad", "Sajad Hussain", "Disposed of"),
    ("", 391, 2013, "Larkana", "Ghulam Qadir Soomro", "Disposed of"),
    ("Agriculture Extension", 1754, 2011, "Larkana", "Muhamamd Aslam Brohi", "Disposed of"),
    ("Agriculture Extension", 1649, 2012, "Karachi", "Muhammad Ayub Burdi", "Disposed of"),
    ("", 1847, 2010, "Hyderabad", "Khawaja Khadim Hussain", "Disposed of"),
    ("Agriculture Marketing", 62, 2011, "Hyderabad", "Muhammad Saleh", "Disposed of"),
    ("Agriculture Marketing", 64, 2011, "Hyderabad", "Muhib Ali", "Disposed of"),
    ("AE&WM", 3926, 2012, "Karachi", "Ghulam Hyder & Others", "Disposed of"),
    ("Crop Reporting", 2684, 2013, "Sukkur", "Amanullah Lakho", "Disposed of"),
    ("Agriculture Extension", 1041, 2013, "Larkana", "Fida Hussain", "Disposed of"),
    ("Cane Commissioner", 111, 2013, "Hyderabad", "", "Disposed of"),
]


def _blank(s: str) -> Optional[str]:
    return s if s else None


def original_records() -> List[Dict[str, Any]]:
    """Return the 22 original rows as case dicts (next_hearing_date None)."""
    records: List[Dict[str, Any]] = []
    for wing, number, year, city, title, status in _ORIGINAL_ROWS:
        records.append(
            {
                "wing": _blank(wing),
                "case_type": "CPD",
                "case_number": number,
                "case_year": year,
                "court": "High Court",
                "city": city or "",  # part of the key: blank -> ''
                "case_title": _blank(title),
                "status": status,
                "next_hearing_date": None,
            }
        )
    return records


def synthetic_active_records(today: Optional[date] = None) -> List[Dict[str, Any]]:
    """~8 ACTIVE cases with hearing dates relative to today for live alerts."""
    if today is None:
        today = date.today()

    # (wing, number, year, city, title, status, day_offset)
    specs = [
        ("Agriculture Extension", 5001, 2025, "Karachi", "Ali Raza", "Pending", -5),    # overdue
        ("Agriculture Marketing", 5002, 2025, "Hyderabad", "Bilal Khan", "Adjourned", -2),  # overdue
        ("Crop Reporting", 5003, 2026, "Sukkur", "Sana Memon", "Statement Filed", 0),   # due today
        ("AE&WM", 5004, 2026, "Larkana", "Imran Shah", "Pending", 1),                   # upcoming
        ("SASO", 5005, 2025, "Karachi", "Farah Naz", "Adjourned", 3),                   # upcoming
        ("Cane Commissioner", 5006, 2024, "Hyderabad", "Usman Ghani", "Pending", 9),    # upcoming
        ("Agriculture Research", 5007, 2026, "Larkana", "Hina Baig", "Statement Filed", 21),  # upcoming
        ("Sindh Seed Corporation", 5008, 2025, "Sukkur", "Kashif Iqbal", "Pending", 40),  # beyond 30d
    ]
    records: List[Dict[str, Any]] = []
    for wing, number, year, city, title, status, offset in specs:
        records.append(
            {
                "wing": wing,
                "case_type": "CPD",
                "case_number": number,
                "case_year": year,
                "court": "High Court",
                "city": city,
                "case_title": title,
                "status": status,
                "next_hearing_date": today + timedelta(days=offset),
            }
        )
    return records


async def seed_if_empty(db: AsyncSession, today: Optional[date] = None) -> int:
    """Insert sample + synthetic rows only if the table is empty.

    Returns the number of rows inserted (0 if it was already populated).
    """
    count = (await db.execute(select(func.count()).select_from(Case))).scalar_one()
    if count:
        return 0

    records = original_records() + synthetic_active_records(today)
    db.add_all([Case(**r) for r in records])
    await db.commit()
    return len(records)
