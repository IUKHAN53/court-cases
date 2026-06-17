"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CloudUpload,
  Download,
  FileSpreadsheet,
  Info,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { api } from "@/lib/api";
import type { ImportResult } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

const SAMPLE_CSV =
  "Wing,Case Name,Case #,Case Year,Court,City,Case Title,Status,next date of hearing\n" +
  "Agriculture Extension,CPD,1059,2013,High Court,Larkana,Habib-ur-Rehman Tunio,Disposed of,\n" +
  "Agriculture Marketing,CPD,537,2013,High Court,Hyderabad,Abdul Latif,Pending,2026-07-15\n" +
  "SASO,CPD,397,2013,High Court,Karachi,,Statement Filed,2026-06-30\n";

function downloadSample() {
  const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "court_cases_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportPage() {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  function pick(f: File | null) {
    if (!f) return;
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) {
      toast("Please choose a .xlsx or .csv file", "error");
      return;
    }
    setFile(f);
    setResult(null);
  }

  async function upload() {
    if (!file) return;
    setBusy(true);
    try {
      const res = await api.importFile(file);
      setResult(res);
      toast(`Imported: ${res.inserted} new, ${res.updated} updated`, "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Import failed", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files?.[0] ?? null);
        }}
        className={`card flex flex-col items-center justify-center px-6 py-12 text-center transition ${
          dragging ? "border-brand-400 bg-brand-50/40 ring-4 ring-brand-500/10" : ""
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow">
          <CloudUpload className="h-8 w-8" />
        </div>
        <h2 className="mt-5 text-lg font-bold text-slate-900">Import cases from a file</h2>
        <p className="mt-1 max-w-md text-sm text-slate-500">
          Drag &amp; drop an Excel or CSV file here, or browse. Existing cases are matched by{" "}
          <b>Case # + Year + City</b> and updated in place.
        </p>

        {file ? (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            <div className="text-left">
              <div className="text-sm font-semibold text-slate-800">{file.name}</div>
              <div className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button variant="secondary" onClick={() => inputRef.current?.click()}>
            {file ? "Choose another" : "Browse files"}
          </Button>
          <Button onClick={upload} loading={busy} disabled={!file}>
            <CloudUpload className="h-4 w-4" /> Import now
          </Button>
        </div>
      </div>

      {result && (
        <div className="card p-6">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900">Import complete</h3>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: "Inserted", value: result.inserted, color: "text-emerald-600" },
              { label: "Updated", value: result.updated, color: "text-brand-600" },
              { label: "Skipped", value: result.skipped, color: "text-slate-500" },
            ].map((t) => (
              <div key={t.label} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-center">
                <div className={`text-2xl font-extrabold ${t.color}`}>{t.value}</div>
                <div className="text-xs font-medium text-slate-500">{t.label}</div>
              </div>
            ))}
          </div>

          {result.errors.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                <TriangleAlert className="h-4 w-4" /> {result.errors.length} row issue(s)
              </div>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-amber-700/90">
                {result.errors.slice(0, 50).map((e, i) => (
                  <li key={i}>• {e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/cases">
              <Button>
                View cases <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="ghost" onClick={() => { setFile(null); setResult(null); }}>
              <RefreshCw className="h-4 w-4" /> Import another
            </Button>
          </div>
        </div>
      )}

      <div className="card p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
            <Info className="h-[18px] w-[18px]" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-900">Expected columns</h3>
            <p className="mt-1 text-sm text-slate-500">
              Wing, Case Name, Case #, Case Year, Court, City, Case Title, Status, next date of hearing.
              Headers are matched flexibly and blank cells are allowed.
            </p>
            <button
              onClick={downloadSample}
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 transition hover:text-brand-700"
            >
              <Download className="h-4 w-4" /> Download a sample template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
