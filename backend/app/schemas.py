"""Pydantic v2 schemas for request/response bodies."""
from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, field_validator


def _blank_to_none(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    v = v.strip()
    return v or None


class CaseBase(BaseModel):
    """Shared case fields used for create/output."""

    wing: Optional[str] = None
    case_type: str
    case_number: int
    case_year: int
    court: str = "High Court"
    city: str = ""
    case_title: Optional[str] = None
    status: str = "Pending"
    next_hearing_date: Optional[date] = None


class CaseCreate(CaseBase):
    """Body for creating a case. Normalizes/trims string fields."""

    @field_validator("wing", "case_title", mode="before")
    @classmethod
    def _nullable_strings(cls, v):
        return _blank_to_none(v) if isinstance(v, str) else v

    @field_validator("case_type", "court", "status", mode="before")
    @classmethod
    def _trim_required(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("city", mode="before")
    @classmethod
    def _city_blank(cls, v):
        # city is part of the unique key: NEVER null, blank -> ''.
        if v is None:
            return ""
        return v.strip() if isinstance(v, str) else v


class CaseUpdate(BaseModel):
    """Partial update body — every field optional."""

    wing: Optional[str] = None
    case_type: Optional[str] = None
    case_number: Optional[int] = None
    case_year: Optional[int] = None
    court: Optional[str] = None
    city: Optional[str] = None
    case_title: Optional[str] = None
    status: Optional[str] = None
    next_hearing_date: Optional[date] = None


class CaseOut(CaseBase):
    """Case as returned to clients."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class CaseListResponse(BaseModel):
    items: List[CaseOut]
    total: int


class ImportResult(BaseModel):
    inserted: int
    updated: int
    skipped: int
    errors: List[str]


class LabelCount(BaseModel):
    label: str
    count: int


class SummaryReport(BaseModel):
    total: int
    active: int
    disposed: int
    upcoming_count: int
    upcoming7_count: int
    overdue_count: int
    by_status: List[LabelCount]
    by_wing: List[LabelCount]
    by_city: List[LabelCount]
    by_year: List[LabelCount]


class FiltersResponse(BaseModel):
    wings: List[str]
    statuses: List[str]
    cities: List[str]
    courts: List[str]
    years: List[int]


# --- Auth & RBAC ------------------------------------------------------------

class LoginIn(BaseModel):
    username: str
    password: str


class BootstrapIn(BaseModel):
    username: str
    password: str
    full_name: str


class UserOut(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    permissions: List[str]
    is_active: bool


class UserCreate(BaseModel):
    username: str
    full_name: str
    password: str
    role: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class RoleOut(BaseModel):
    id: int
    name: str
    permissions: List[str]
    is_system: bool


class RoleUpdate(BaseModel):
    permissions: List[str]


class RoleCreate(BaseModel):
    name: str
    permissions: List[str]
