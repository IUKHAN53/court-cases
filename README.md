# CourtTrack — Court Case Management & Reporting

Internal tool for tracking court cases, hearing **deadlines**, and reporting for the
Agriculture Department. Import from Excel/CSV, full CRUD, dashboard reporting, Excel
export, and a built-in **deadline alert system**.

```
court-cases/
├─ backend/    FastAPI + SQLAlchemy (async) + Postgres/SQLite
└─ frontend/   Next.js (App Router) + Tailwind + Recharts
```

## Features
- **Import** — upload `.xlsx`/`.csv`; rows are **upserted** by `Case # + Year + City`
  (re-import the same sheet to update hearing dates without creating duplicates).
- **CRUD** — add, edit, and delete cases from a polished slide-over form.
- **Reporting** — KPIs + charts (by status, wing, city, year).
- **Deadline alerts** — overdue & upcoming hearings surfaced on the dashboard and in a
  topbar bell badge, colour-coded by urgency.
- **Export** — download the current filtered view as Excel.

---

## Run locally

### 1. Backend (port 8000)
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
By default it uses a local SQLite file and **auto-seeds sample data** (incl. live
deadline cases), so it runs with zero external setup. API docs at
http://localhost:8000/docs.

### 2. Frontend (port 3000)
```powershell
cd frontend
npm install
copy .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```
Open http://localhost:3000.

---

## Live deployment

| Piece | URL | Host |
|---|---|---|
| Frontend (Next.js) | https://court-cases.vercel.app | Vercel |
| Backend API (FastAPI) | https://court-cases-api.vercel.app | Vercel (Python serverless) |
| Database | — | Neon (Postgres, free) |

Everything is on **Vercel + Neon** (all free tier, no credit card). The repo is a
monorepo deployed as **two Vercel projects** from the same GitHub repo.

### Database — Neon
- A Neon Postgres project supplies the **pooled** connection string. The backend
  normalizes `postgres://` → `postgresql+asyncpg://` and handles `sslmode`/`channel_binding`
  automatically.

### Backend — Vercel (`court-cases-api`)
- Root directory `backend`; preset **FastAPI**.
- Served as a Python serverless function via [`backend/api/index.py`](backend/api/index.py)
  + [`backend/vercel.json`](backend/vercel.json) (`@vercel/python`).
- Tables are created and seeded **lazily on the first request** (Vercel does not run the
  ASGI lifespan), so no manual migration step is needed.
- Env var: `DATABASE_URL` = the Neon pooled connection string.

### Frontend — Vercel (`court-cases`)
- Root directory `frontend`; auto-detected as Next.js.
- Env var: `NEXT_PUBLIC_API_URL` = `https://court-cases-api.vercel.app`.

> ℹ️ Both projects auto-deploy on every push to `main`. Neon scales to zero when idle
> but wakes in milliseconds; serverless functions cold-start in ~1–2s.

A `render.yaml` is also included if you prefer to host the backend on Render instead
(note: Render requires credit-card identity verification before creating services).

---

## Data model

| Field | Notes |
|---|---|
| `wing` | Department (nullable) |
| `case_type` | e.g. "CPD" (from Excel "Case Name") |
| `case_number`, `case_year` | Filing number & year |
| `court`, `city` | Court & bench; `city` stored as `''` when blank (part of the unique key) |
| `case_title` | Petitioner (nullable) |
| `status` | Pending / Statement Filed / Adjourned / Reserved / Disposed of |
| `next_hearing_date` | Drives the alert system (nullable) |

**Unique key:** `(case_number, case_year, city)` — used for import upserts.
