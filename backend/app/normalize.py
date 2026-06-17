"""Normalize messy free-text Wing / City / Status values on import.

Real-world source spreadsheets carry typos, casing differences and trailing
dates. These helpers canonicalize the worst offenders so reporting groups
cleanly, while leaving genuinely unknown values untouched.
"""
from __future__ import annotations

import re
from typing import Optional

_WS = re.compile(r"\s+")


def _clean(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    v = _WS.sub(" ", str(value).strip())
    return v or None


# --- Status ----------------------------------------------------------------
_STATUS_EXACT = {
    "statement filed": "Statement Filed",
    "not filed": "Not Filed",
    "filed": "Filed",
    "pending": "Pending",
    "adjourned": "Adjourned",
    "reserved": "Reserved",
    "not pertained to dept": "Not Pertained to Dept",
}


def normalize_status(value: Optional[str]) -> str:
    v = _clean(value)
    if v is None:
        return "Pending"
    low = v.lower()
    # "Disposed of" family — typos, casing, and trailing dates all collapse.
    if low.startswith(("dispos", "dispoed", "disposted", "disposd")):
        return "Disposed of"
    # "Not pertained" / "do not pertain" family.
    if "pertain" in low:
        return "Not Pertained to Dept"
    # "Not a party" family.
    if low.replace(" ", "") in ("notparty", "notaparty", "notapaty", "notaprty"):
        return "Not a Party"
    return _STATUS_EXACT.get(low, v)


# --- City ------------------------------------------------------------------
_CITY_MAP = {
    "karachi": "Karachi",
    "hyderabad": "Hyderabad",
    "sukkur": "Sukkur",
    "larkana": "Larkana",
    "larkano": "Larkana",
    "larakan": "Larkana",
    "mirpurkhas": "Mirpurkhas",
    "islamabad": "Islamabad",
}


def normalize_city(value: Optional[str]) -> str:
    v = _clean(value)
    if v is None:
        return ""
    return _CITY_MAP.get(v.lower(), v)


# --- Wing ------------------------------------------------------------------
_WING_MAP = {
    "cane commissioner": "Cane Commissioner",
    "ofwm": "On Farm Water Management",
    "on farm water management": "On Farm Water Management",
    "agriculture marketing": "Agriculture Marketing",
    "agriculture mrketing": "Agriculture Marketing",
    "agriculturemarketing": "Agriculture Marketing",
}


def normalize_wing(value: Optional[str]) -> Optional[str]:
    v = _clean(value)
    if v is None:
        return None
    return _WING_MAP.get(v.lower(), v)
