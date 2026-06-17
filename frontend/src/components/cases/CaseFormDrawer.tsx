"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextInput } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import type { CaseInput, CaseRecord, FiltersData } from "@/lib/types";

const STATUS_OPTIONS = ["Pending", "Statement Filed", "Adjourned", "Reserved", "Disposed of"];

function blankForm(): CaseInput {
  return {
    wing: "",
    case_type: "CPD",
    case_number: 0,
    case_year: new Date().getFullYear(),
    court: "High Court",
    city: "",
    case_title: "",
    status: "Pending",
    next_hearing_date: null,
  };
}

function toForm(c: CaseRecord): CaseInput {
  return {
    wing: c.wing ?? "",
    case_type: c.case_type,
    case_number: c.case_number,
    case_year: c.case_year,
    court: c.court,
    city: c.city ?? "",
    case_title: c.case_title ?? "",
    status: c.status,
    next_hearing_date: c.next_hearing_date,
  };
}

export function CaseFormDrawer({
  open,
  initial,
  filters,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: CaseRecord | null;
  filters: FiltersData | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<CaseInput>(blankForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial;

  useEffect(() => {
    if (open) {
      setForm(initial ? toForm(initial) : blankForm());
      setErrors({});
    }
  }, [open, initial]);

  function set<K extends keyof CaseInput>(key: K, value: CaseInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.case_type.trim()) e.case_type = "Required";
    if (!form.case_number || form.case_number <= 0) e.case_number = "Enter a valid number";
    if (!form.case_year || form.case_year < 1900) e.case_year = "Enter a valid year";
    if (!form.court.trim()) e.court = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setSaving(true);
    const payload: CaseInput = {
      ...form,
      wing: form.wing?.trim() || null,
      city: form.city?.trim() || "",
      case_title: form.case_title?.trim() || null,
      case_type: form.case_type.trim(),
      court: form.court.trim(),
      next_hearing_date: form.next_hearing_date || null,
    };
    try {
      if (isEdit && initial) {
        await api.updateCase(initial.id, payload);
        toast("Case updated", "success");
      } else {
        await api.createCase(payload);
        toast("Case added", "success");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Case" : "Add Case"}
      subtitle={isEdit ? "Update the case details below." : "Create a new court case record."}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            {isEdit ? "Save changes" : "Add case"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Case Type" required error={errors.case_type}>
            <TextInput value={form.case_type} onChange={(e) => set("case_type", e.target.value)} placeholder="CPD" />
          </Field>
          <Field label="Court" required error={errors.court}>
            <TextInput value={form.court} onChange={(e) => set("court", e.target.value)} placeholder="High Court" />
          </Field>
          <Field label="Case Number" required error={errors.case_number}>
            <TextInput
              type="number"
              value={form.case_number || ""}
              onChange={(e) => set("case_number", Number(e.target.value))}
              placeholder="1059"
            />
          </Field>
          <Field label="Case Year" required error={errors.case_year}>
            <TextInput
              type="number"
              value={form.case_year || ""}
              onChange={(e) => set("case_year", Number(e.target.value))}
              placeholder="2013"
            />
          </Field>
        </div>

        <Field label="Petitioner / Case Title">
          <TextInput
            value={form.case_title ?? ""}
            onChange={(e) => set("case_title", e.target.value)}
            placeholder="e.g. Habib-ur-Rehman Tunio"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Wing / Department">
            <TextInput
              list="wing-options"
              value={form.wing ?? ""}
              onChange={(e) => set("wing", e.target.value)}
              placeholder="Agriculture Extension"
            />
            <datalist id="wing-options">
              {filters?.wings.map((w) => <option key={w} value={w} />)}
            </datalist>
          </Field>
          <Field label="City / Bench">
            <TextInput
              list="city-options"
              value={form.city ?? ""}
              onChange={(e) => set("city", e.target.value)}
              placeholder="Karachi"
            />
            <datalist id="city-options">
              {filters?.cities.map((c) => <option key={c} value={c} />)}
            </datalist>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Status" required>
            <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
              {!STATUS_OPTIONS.includes(form.status) && <option value={form.status}>{form.status}</option>}
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Next Hearing Date" hint="Leave blank if none / disposed">
            <TextInput
              type="date"
              value={form.next_hearing_date ?? ""}
              onChange={(e) => set("next_hearing_date", e.target.value || null)}
            />
          </Field>
        </div>
      </div>
    </Drawer>
  );
}
