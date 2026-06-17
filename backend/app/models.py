"""SQLAlchemy ORM models."""
from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class Case(Base):
    """A court case record.

    The business/upsert key is ``(case_number, case_year, city)``. ``city`` is
    stored as an empty string (never NULL) so the unique constraint behaves
    consistently across SQLite and Postgres (NULLs are not equal under SQL).
    """

    __tablename__ = "cases"
    __table_args__ = (
        UniqueConstraint(
            "case_number", "case_year", "city", name="uq_case_number_year_city"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    wing: Mapped[str | None] = mapped_column(String, nullable=True)
    case_type: Mapped[str] = mapped_column(String, nullable=False)
    case_number: Mapped[int] = mapped_column(Integer, nullable=False)
    case_year: Mapped[int] = mapped_column(Integer, nullable=False)
    court: Mapped[str] = mapped_column(String, nullable=False, default="High Court")
    city: Mapped[str] = mapped_column(String, nullable=False, default="")
    case_title: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False, default="Pending")
    next_hearing_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        default=func.now(),
        onupdate=func.now(),
    )
