"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users as UsersIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import type { AuthUser, RoleInfo } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Field, Select, TextInput } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Badge } from "@/components/ui/Badge";
import { AccessDenied } from "@/components/ui/AccessDenied";

type PermDef = { key: string; label: string };

function TabBtn({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
        active ? "bg-white text-slate-900 shadow-card" : "text-slate-500 hover:text-slate-800"
      }`}
    >
      <Icon className="h-4 w-4" /> {children}
    </button>
  );
}

export default function UsersPage() {
  const { can, user: me } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState<"users" | "roles">("users");
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [allPerms, setAllPerms] = useState<PermDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<AuthUser | null>(null);
  const [confirm, setConfirm] = useState<AuthUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([api.listUsers(), api.getRoles()]);
      setUsers(u);
      setRoles(r.roles);
      setAllPerms(r.all_permissions);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to load", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load, tick]);

  if (!can("manage_users")) return <AccessDenied feature="Users & Roles" />;

  const roleNames = roles.map((r) => r.name);

  async function doDelete() {
    if (!confirm) return;
    setDeleting(true);
    try {
      await api.deleteUser(confirm.id);
      toast("User deleted", "success");
      setConfirm(null);
      setTick((t) => t + 1);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <TabBtn active={tab === "users"} onClick={() => setTab("users")} icon={UsersIcon}>
          Users
        </TabBtn>
        <TabBtn active={tab === "roles"} onClick={() => setTab("roles")} icon={ShieldCheck}>
          Roles &amp; Permissions
        </TabBtn>
        <div className="flex-1" />
        {tab === "users" && (
          <Button
            onClick={() => {
              setEditing(null);
              setDrawerOpen(true);
            }}
          >
            <UserPlus className="h-4 w-4" /> Add User
          </Button>
        )}
      </div>

      {tab === "users" ? (
        <UsersTable
          users={users}
          loading={loading}
          meId={me?.id}
          onEdit={(u) => {
            setEditing(u);
            setDrawerOpen(true);
          }}
          onDelete={(u) => setConfirm(u)}
        />
      ) : (
        <RolesPanel roles={roles} allPerms={allPerms} loading={loading} onChanged={() => setTick((t) => t + 1)} />
      )}

      <UserDrawer
        open={drawerOpen}
        initial={editing}
        roleNames={roleNames}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => setTick((t) => t + 1)}
      />

      <ConfirmDialog
        open={!!confirm}
        loading={deleting}
        title="Delete this user?"
        message={
          confirm ? (
            <>
              <b className="text-slate-700">{confirm.full_name || confirm.username}</b> will lose
              access immediately.
            </>
          ) : (
            ""
          )
        }
        onConfirm={doDelete}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

function UsersTable({
  users,
  loading,
  meId,
  onEdit,
  onDelete,
}: {
  users: AuthUser[];
  loading: boolean;
  meId?: number;
  onEdit: (u: AuthUser) => void;
  onDelete: (u: AuthUser) => void;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 4 }).map((__, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="skeleton h-4 w-full max-w-[140px]" />
                      </td>
                    ))}
                  </tr>
                ))
              : users.map((u) => {
                  const initials = (u.full_name || u.username)
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();
                  return (
                    <tr key={u.id} className="group transition hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{u.full_name || u.username}</div>
                            <div className="text-xs text-slate-400">@{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-brand-50 text-brand-700 ring-brand-600/20">{u.role}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {u.is_active ? (
                          <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">Active</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-500 ring-slate-400/20">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-60 transition group-hover:opacity-100">
                          <button
                            onClick={() => onEdit(u)}
                            aria-label="Edit"
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-brand-50 hover:text-brand-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onDelete(u)}
                            disabled={u.id === meId}
                            aria-label="Delete"
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
      {!loading && users.length === 0 && (
        <div className="px-6 py-12 text-center text-sm text-slate-400">No users yet.</div>
      )}
    </div>
  );
}

function RolesPanel({
  roles,
  allPerms,
  loading,
  onChanged,
}: {
  roles: RoleInfo[];
  allPerms: PermDef[];
  loading: boolean;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [draft, setDraft] = useState<Record<number, string[]>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [newRole, setNewRole] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const d: Record<number, string[]> = {};
    roles.forEach((r) => (d[r.id] = [...r.permissions]));
    setDraft(d);
  }, [roles]);

  function toggle(roleId: number, key: string) {
    setDraft((d) => {
      const set = new Set(d[roleId] || []);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return { ...d, [roleId]: [...set] };
    });
  }

  function isDirty(r: RoleInfo) {
    const a = [...(draft[r.id] || [])].sort().join(",");
    const b = [...r.permissions].sort().join(",");
    return a !== b;
  }

  async function save(r: RoleInfo) {
    setSavingId(r.id);
    try {
      await api.updateRole(r.id, draft[r.id] || []);
      toast(`"${r.name}" permissions updated`, "success");
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Save failed", "error");
    } finally {
      setSavingId(null);
    }
  }

  async function addRole() {
    if (!newRole.trim()) return;
    setCreating(true);
    try {
      await api.createRole(newRole.trim(), ["view_cases"]);
      toast(`Role "${newRole.trim()}" created`, "success");
      setNewRole("");
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not create role", "error");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <div className="skeleton h-64 w-full" />;

  return (
    <div className="space-y-4">
      {roles.map((r) => (
        <div key={r.id} className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-brand-500" />
              <h3 className="text-sm font-bold text-slate-900">{r.name}</h3>
              {r.is_system && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                  built-in
                </span>
              )}
            </div>
            <Button size="sm" onClick={() => save(r)} loading={savingId === r.id} disabled={!isDirty(r)}>
              <Check className="h-4 w-4" /> Save
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {allPerms.map((p) => {
              const checked = (draft[r.id] || []).includes(p.key);
              return (
                <label
                  key={p.key}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition ${
                    checked
                      ? "border-brand-300 bg-brand-50/60 text-slate-800"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span
                    className={`grid h-5 w-5 place-items-center rounded-md border transition ${
                      checked ? "border-brand-500 bg-brand-500 text-white" : "border-slate-300 bg-white"
                    }`}
                  >
                    {checked && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => toggle(r.id, p.key)}
                  />
                  {p.label}
                </label>
              );
            })}
          </div>
        </div>
      ))}

      <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
        <Field label="New role name">
          <TextInput
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            placeholder="e.g. Read Only"
          />
        </Field>
        <Button variant="secondary" onClick={addRole} loading={creating} disabled={!newRole.trim()}>
          <Plus className="h-4 w-4" /> Add role
        </Button>
      </div>
    </div>
  );
}

function UserDrawer({
  open,
  initial,
  roleNames,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: AuthUser | null;
  roleNames: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const isEdit = !!initial;
  const [form, setForm] = useState({
    username: "",
    full_name: "",
    password: "",
    role: "",
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        username: initial.username,
        full_name: initial.full_name,
        password: "",
        role: initial.role,
        is_active: initial.is_active,
      });
    } else {
      setForm({ username: "", full_name: "", password: "", role: roleNames[0] || "", is_active: true });
    }
    setErrors({});
  }, [open, initial, roleNames]);

  function validate() {
    const e: Record<string, string> = {};
    if (!isEdit && !form.username.trim()) e.username = "Required";
    if (!form.full_name.trim()) e.full_name = "Required";
    if (!form.role) e.role = "Required";
    if (!isEdit && !form.password) e.password = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setSaving(true);
    try {
      if (isEdit && initial) {
        await api.updateUser(initial.id, {
          full_name: form.full_name.trim(),
          role: form.role,
          is_active: form.is_active,
          ...(form.password ? { password: form.password } : {}),
        });
        toast("User updated", "success");
      } else {
        await api.createUser({
          username: form.username.trim().toLowerCase(),
          full_name: form.full_name.trim(),
          password: form.password,
          role: form.role,
        });
        toast("User created", "success");
      }
      onSaved();
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit User" : "Add User"}
      subtitle={isEdit ? "Update this account." : "Create a new account."}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            {isEdit ? "Save changes" : "Create user"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Username" required error={errors.username} hint={isEdit ? "Username can't be changed" : "Used to sign in"}>
          <TextInput
            value={form.username}
            disabled={isEdit}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            placeholder="e.g. secretary"
          />
        </Field>
        <Field label="Full name" required error={errors.full_name}>
          <TextInput
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            placeholder="e.g. Imran Khan"
          />
        </Field>
        <Field label="Role" required error={errors.role}>
          <Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            {roleNames.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={isEdit ? "Reset password" : "Password"}
          required={!isEdit}
          error={errors.password}
          hint={isEdit ? "Leave blank to keep the current password" : undefined}
        >
          <TextInput
            type="text"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder={isEdit ? "New password (optional)" : "Set a password"}
          />
        </Field>
        {isEdit && (
          <Field label="Status">
            <Select
              value={form.is_active ? "1" : "0"}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.value === "1" }))}
            >
              <option value="1">Active</option>
              <option value="0">Inactive (can't sign in)</option>
            </Select>
          </Field>
        )}
      </div>
    </Drawer>
  );
}
