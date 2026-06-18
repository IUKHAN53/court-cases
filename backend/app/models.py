"""SQLAlchemy ORM models."""
from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

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


class AppSetting(Base):
    """Key/value store for runtime settings (e.g. the JWT signing secret)."""

    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String, primary_key=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)


class Role(Base):
    """A named set of permission keys."""

    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    # List of permission-key strings, stored as JSON.
    permissions: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    is_system: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class User(Base):
    """An application user, with a single assigned role."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    full_name: Mapped[str] = mapped_column(String, nullable=False, default="")
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), default=func.now()
    )

    role: Mapped["Role"] = relationship("Role", lazy="joined")
