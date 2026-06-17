# Court Cases API

A production-quality FastAPI backend for tracking and reporting on court cases,
with deadline alerts, Excel/CSV import, and filtered Excel export.

- **FastAPI** + **SQLAlchemy 2.x async** + **Pydantic v2**
- Runs out-of-the-box on **SQLite** (zero config) or **Postgres/Neon**
- Tables auto-created on startup (no migrations needed for the demo)
- Sample + synthetic live data seeded automatically on first run

## Run locally (Windows / PowerShell)

```powershell
cd D:\www\court-cases\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Then open:

- API docs (Swagger): http://localhost:8000/docs
- Health check: http://localhost:8000/api/health

On first start the app creates `court_cases.db` (SQLite) in the backend folder
and seeds 22 sample cases plus ~8 synthetic active cases with live hearing
dates so the deadline alert panel has data.

To disable seeding set `SEED_ON_STARTUP=false`.

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Configuration

Copy `.env.example` to `.env` and edit as needed. All variables are optional.

| Variable           | Default                                  | Notes |
|--------------------|------------------------------------------|-------|
| `DATABASE_URL`     | `sqlite+aiosqlite:///./court_cases.db`   | See below |
| `CORS_ORIGINS`     | `http://localhost:3000,*`                | Comma-separated |
| `SEED_ON_STARTUP`  | `true`                                   | Seed sample data if table empty |

### Using Neon / Postgres

Paste your Neon connection string into `DATABASE_URL`. Both `postgres://` and
`postgresql://` URLs are automatically normalized to `postgresql+asyncpg://`,
and SSL is enabled (`ssl=require`) as Neon requires. Example:

```
DATABASE_URL=postgresql://user:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

`sslmode`/`channel_binding` query params are stripped (asyncpg doesn't accept
them) and translated into the proper connect-arg.

## Deploy to Render

This repo includes `render.yaml`. From the Render dashboard choose
**New > Blueprint** and point it at the repo, or create a Web Service manually:

- **Build command:** `pip install -r requirements.txt`
- **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Environment variables:**
  - `DATABASE_URL` — your Neon Postgres connection string (recommended on
    Render, since the container filesystem is ephemeral and SQLite data would
    not persist across deploys/restarts).
  - `CORS_ORIGINS` — your frontend origin(s), e.g.
    `https://your-frontend.onrender.com`.
  - `SEED_ON_STARTUP` — `true` to seed demo data on first run.

## API overview (all under `/api`)

| Method | Path                       | Description |
|--------|----------------------------|-------------|
| GET    | `/api/cases`               | List with filters/sort/pagination -> `{items, total}` |
| POST   | `/api/cases`               | Create a case (201) |
| PUT    | `/api/cases/{id}`          | Partial update (404 if missing) |
| DELETE | `/api/cases/{id}`          | Delete (204) |
| POST   | `/api/import`              | Upload `.xlsx`/`.csv`, upsert by (case_number, year, city) |
| GET    | `/api/reports/summary`     | Totals, active/disposed, deadline counts, breakdowns |
| GET    | `/api/reports/upcoming`    | Active cases overdue or due within `?days=30` |
| GET    | `/api/export`              | Download filtered cases as `.xlsx` |
| GET    | `/api/filters`             | Distinct dropdown values |
| GET    | `/api/health`              | `{ "status": "ok" }` |

### Importing data

Upload `sample_cases.csv` (included) via `POST /api/import` or the frontend
Import UI to test the flow. Headers are matched case-insensitively and trimmed;
recognized headers include `Wing`, `Case Name`, `Case #`/`Case No`,
`Case Year`, `Court`, `City`, `Case Title`, `Status`, and
`next date of hearing`. Re-importing the same file updates existing rows
instead of duplicating them.
