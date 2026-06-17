"""Quick smoke test: boot the app with TestClient and hit key endpoints."""
import io
import json
import sys

from fastapi.testclient import TestClient

from app.main import app


def show(title, resp):
    print(f"\n=== {title} -> HTTP {resp.status_code} ===")
    ctype = resp.headers.get("content-type", "")
    if "json" in ctype:
        print(json.dumps(resp.json(), indent=2, default=str)[:1500])
    else:
        print(f"content-type={ctype} bytes={len(resp.content)}")
        cd = resp.headers.get("content-disposition")
        if cd:
            print(f"content-disposition={cd}")


def main():
    failures = []
    # TestClient runs lifespan (init_db + seed) on enter.
    with TestClient(app) as client:
        r = client.get("/api/health")
        show("GET /api/health", r)
        if r.status_code != 200 or r.json() != {"status": "ok"}:
            failures.append("health")

        r = client.get("/api/reports/summary")
        show("GET /api/reports/summary", r)
        if r.status_code != 200:
            failures.append("summary")
        else:
            data = r.json()
            for key in (
                "total", "active", "disposed", "upcoming_count",
                "overdue_count", "by_status", "by_wing", "by_city", "by_year",
            ):
                if key not in data:
                    failures.append(f"summary.{key}")

        r = client.get("/api/cases")
        show("GET /api/cases", r)
        if r.status_code != 200 or "items" not in r.json() or "total" not in r.json():
            failures.append("cases")
        else:
            print(f"\n(cases total={r.json()['total']}, first item shown below)")
            if r.json()["items"]:
                print(json.dumps(r.json()["items"][0], indent=2, default=str))

        # --- extra coverage: upcoming, filters, create, update, delete, export, import
        r = client.get("/api/reports/upcoming?days=30")
        show("GET /api/reports/upcoming?days=30", r)
        if r.status_code != 200 or not isinstance(r.json(), list):
            failures.append("upcoming")
        else:
            print(f"(upcoming alerts: {len(r.json())})")

        r = client.get("/api/filters")
        show("GET /api/filters", r)
        if r.status_code != 200:
            failures.append("filters")

        # Create
        new_case = {
            "case_type": "CPD",
            "case_number": 9999,
            "case_year": 2026,
            "city": "Karachi",
            "case_title": "Smoke Test Petitioner",
            "status": "Pending",
            "next_hearing_date": "2026-07-01",
        }
        r = client.post("/api/cases", json=new_case)
        show("POST /api/cases", r)
        if r.status_code != 201:
            failures.append("create")
            created_id = None
        else:
            created_id = r.json()["id"]

        if created_id:
            r = client.put(f"/api/cases/{created_id}", json={"status": "Adjourned"})
            show("PUT /api/cases/{id}", r)
            if r.status_code != 200 or r.json()["status"] != "Adjourned":
                failures.append("update")

            r = client.delete(f"/api/cases/{created_id}")
            print(f"\n=== DELETE /api/cases/{created_id} -> HTTP {r.status_code} ===")
            if r.status_code != 204:
                failures.append("delete")

        # 404 path
        r = client.put("/api/cases/9999999", json={"status": "X"})
        print(f"\n=== PUT missing -> HTTP {r.status_code} (expect 404) ===")
        if r.status_code != 404:
            failures.append("update-404")

        # Export
        r = client.get("/api/export")
        show("GET /api/export", r)
        if r.status_code != 200 or "spreadsheetml" not in r.headers.get(
            "content-type", ""
        ):
            failures.append("export")

        # Import the sample CSV (idempotent upsert -> should be updates)
        with open("sample_cases.csv", "rb") as fh:
            content = fh.read()
        r = client.post(
            "/api/import",
            files={"file": ("sample_cases.csv", io.BytesIO(content), "text/csv")},
        )
        show("POST /api/import (sample_cases.csv)", r)
        if r.status_code != 200:
            failures.append("import")

    print("\n" + "=" * 50)
    if failures:
        print("SMOKE TEST FAILED:", failures)
        sys.exit(1)
    print("SMOKE TEST PASSED: all endpoints OK")


if __name__ == "__main__":
    main()
