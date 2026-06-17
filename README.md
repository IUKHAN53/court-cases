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

## Deploy (free tier): Neon + Render + Vercel

### Database — Neon
1. Create a project at neon.tech → copy the **pooled** connection string.
2. Use the `postgresql+asyncpg://...` form (the backend normalizes `postgres://` too).

### Backend — Render
- New **Web Service**, root directory `backend`.
- Build: `pip install -r requirements.txt`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Env vars:
  - `DATABASE_URL` = your Neon connection string
  - `CORS_ORIGINS` = your Vercel URL, e.g. `https://courttrack.vercel.app`
- (A `render.yaml` is included for one-click setup.)

### Frontend — Vercel
- Import the repo, root directory `frontend` (auto-detected as Next.js).
- Env var: `NEXT_PUBLIC_API_URL` = your Render backend URL.

> ⚠️ Render's free web service cold-starts after ~15 min idle. Hit the URL once to warm
> it before a live demo, or host the backend on Koyeb (no spin-down).

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
