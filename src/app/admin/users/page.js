"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { confirmDialog } from "../components/ui/ConfirmDialog";
import Button from "../components/ui/Button";
import AdminTableCard from "../components/AdminTableCard";

export default function AdminUsersPage() {
  const [admins, setAdmins] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [role, setRole] = useState("ADMIN");
  const [marketIds, setMarketIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editMarketIds, setEditMarketIds] = useState([]);
  const [meId, setMeId] = useState(null);
  const [tempPassword, setTempPassword] = useState(null); // { name, password }
  const [showNew, setShowNew] = useState(false);

  // ucitavanje liste admina i trzista
  useEffect(() => {
    async function loadAdmins() {
      setLoading(true);
      setError("");
      try {
        const [adminsRes, marketsRes, meRes] = await Promise.all([
          fetch("/api/admin/users"),
          fetch("/api/admin/markets"),
          fetch("/api/admin/me"),
        ]);
        if (adminsRes.status === 401) {
          setError("Unauthorized – please log in again.");
          return;
        }
        if (adminsRes.status === 403) {
          setError("Only super admins can manage users.");
          return;
        }
        if (!adminsRes.ok) {
          const t = await adminsRes.text().catch(() => "");
          throw new Error(t || `HTTP ${adminsRes.status}`);
        }
        const data = await adminsRes.json();
        setAdmins(data);

        if (meRes.ok) setMeId((await meRes.json()).id);

        if (marketsRes.ok) {
          const marketData = await marketsRes.json();
          setMarkets(marketData);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load admin users.");
      } finally {
        setLoading(false);
      }
    }
    loadAdmins();
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !pwd.trim()) {
      toast.error("Fill in all fields.");
      return;
    }
    if (role === "ADMIN" && !marketIds.length) {
      toast.error("Pick at least one market for this admin.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: pwd.trim(),
          role,
          marketIds: role === "ADMIN" ? marketIds : [],
        }),
      });

      if (res.status === 409) {
        toast.error("Email already in use.");
        return;
      }

      if (res.status === 403) {
        toast.error("Only super admins can create users.");
        return;
      }

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `HTTP ${res.status}`);
      }

      const created = await res.json();
      setAdmins((prev) => [...prev, created]);
      toast.success("Admin user created.");
      setName("");
      setEmail("");
      setPwd("");
      setRole("ADMIN");
      setMarketIds([]);
      setShowNew(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create admin user.");
    } finally {
      setSaving(false);
    }
  }
  function startEdit(admin) {
    setEditingId(admin.id);
    setEditName(admin.name);
    setEditEmail(admin.email);
    setEditMarketIds((admin.markets || []).map((m) => m.id));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditEmail("");
    setEditMarketIds([]);
  }

  async function saveEdit(admin) {
    const { id } = admin;
    if (!editName.trim() || !editEmail.trim()) {
      toast.error("Fill in name and email.");
      return;
    }
    if (admin.role === "ADMIN" && !editMarketIds.length) {
      toast.error("Pick at least one market for this admin.");
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim(),
          ...(admin.role === "ADMIN" ? { marketIds: editMarketIds } : {}),
        }),
      });

      if (res.status === 409) {
        toast.error("Email already in use.");
        return;
      }

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `HTTP ${res.status}`);
      }

      const updated = await res.json();

      setAdmins((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updated } : a))
      );

      toast.success("Admin updated.");
      cancelEdit();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update admin.");
    }
  }

  async function resetPassword(admin) {
    const ok = await confirmDialog({
      title: `Reset the password for ${admin.name}?`,
      message: "They will be signed out everywhere and must set a new password at their next login.",
      confirmLabel: "Reset password",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/users/${admin.id}/reset-password`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const { tempPassword: password } = await res.json();
      setAdmins((prev) => prev.map((a) => (a.id === admin.id ? { ...a, mustChangePassword: true } : a)));
      setTempPassword({ name: admin.name, password });
    } catch (err) {
      toast.error(err.message || "Failed to reset password.");
    }
  }

  async function reset2fa(admin) {
    const ok = await confirmDialog({
      title: `Reset 2FA for ${admin.name}?`,
      message: `Use this only if they lost their phone and backup codes.${admin.role === "SUPER_ADMIN" ? " They will have to set it up again at their next login." : ""}`,
      confirmLabel: "Reset 2FA",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/users/${admin.id}/reset-2fa`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      setAdmins((prev) => prev.map((a) => (a.id === admin.id ? { ...a, totpEnabled: false } : a)));
      toast.success("Two-factor authentication reset.");
    } catch (err) {
      toast.error(err.message || "Failed to reset 2FA.");
    }
  }

  async function deleteAdmin(id) {
    const admin = admins.find((a) => a.id === id);
    const ok = await confirmDialog({
      title: `Delete ${admin?.name || "this admin"}?`,
      message: "The account is removed permanently. Their promotion history stays.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
      });

      if (!res.ok && res.status !== 204) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `HTTP ${res.status}`);
      }

      setAdmins((prev) => prev.filter((a) => a.id !== id));
      toast.success("Admin deleted.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete admin.");
    }
  }

  const inputClass = "mt-1 w-full rounded border border-[#D0D0D0] px-2.5 py-1.5 text-sm";

  return (
    <>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="mb-2">
          <h1 className="text-xl font-semibold">Backoffice - Users</h1>
          <p className="text-sm text-neutral-500">Admin accounts, their markets and sign-in security.</p>
        </div>
        <Button onClick={() => setShowNew((v) => !v)}>{showNew ? "Close form" : "+ New admin"}</Button>
      </div>

      {showNew && (
        <div className="mb-6">
          <AdminTableCard title="New admin">
            <form onSubmit={onSubmit} className="grid gap-4 p-4 sm:grid-cols-2">
              <label className="block text-sm text-neutral-800 sm:col-span-2">
                Name
                <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="block text-sm text-neutral-800">
                Email
                <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
              </label>
              <label className="block text-sm text-neutral-800">
                Initial password
                <input type="password" className={inputClass} value={pwd} onChange={(e) => setPwd(e.target.value)} autoComplete="new-password" />
                <span className="mt-1 block text-xs text-neutral-500">They must change it at their first login.</span>
              </label>
              <label className="block text-sm text-neutral-800">
                Role
                <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="ADMIN">Admin (selected markets)</option>
                  <option value="SUPER_ADMIN">Super admin (all markets, 2FA required)</option>
                </select>
              </label>
              {role === "ADMIN" && (
                <div className="text-sm text-neutral-800">
                  Markets
                  <MarketCheckboxes markets={markets} value={marketIds} onChange={setMarketIds} />
                </div>
              )}
              <div className="sm:col-span-2">
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Add admin"}</Button>
              </div>
            </form>
          </AdminTableCard>
        </div>
      )}

      <AdminTableCard
        title={`Admins${admins.length ? ` (${admins.length})` : ""}`}
        columns={[
          { key: "who", label: "Name" },
          { key: "access", label: "Access", width: "220px" },
          { key: "created", label: "Created", width: "130px" },
          { key: "actions", label: "Actions", width: "330px", className: "text-right pr-2" },
        ]}
      >
        {loading && <div className="p-4 text-sm text-neutral-500">Loading…</div>}
        {error && <div className="p-4 text-sm text-red-600">{error}</div>}
        {!loading && !error && (
          <ul className="divide-y divide-neutral-200">
            {admins.map((a, idx) => {
              const isEditing = editingId === a.id;
              const isMe = a.id === meId;
              return (
                <li
                  key={a.id}
                  className={`grid grid-cols-1 items-center gap-3 px-4 py-3 lg:grid-cols-[1fr_220px_130px_330px] ${
                    idx % 2 === 0 ? "bg-white" : "bg-[#F5F5F5]"
                  }`}
                >
                  {/* Name + email */}
                  <div className="min-w-0">
                    {isEditing ? (
                      <div className="space-y-1.5">
                        <input className={inputClass} value={editName} onChange={(e) => setEditName(e.target.value)} aria-label="Name" />
                        <input className={inputClass} value={editEmail} onChange={(e) => setEditEmail(e.target.value)} aria-label="Email" />
                      </div>
                    ) : (
                      <>
                        <div className="text-sm font-semibold text-[var(--black-white-90)]">
                          {a.name}
                          {isMe && <span className="ml-2 rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-medium text-neutral-700">you</span>}
                        </div>
                        <div className="truncate text-xs text-neutral-500">{a.email}</div>
                      </>
                    )}
                  </div>

                  {/* Role / markets / security */}
                  <div>
                    {a.role === "SUPER_ADMIN" ? (
                      <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">SUPER ADMIN</span>
                    ) : isEditing ? (
                      <MarketCheckboxes markets={markets} value={editMarketIds} onChange={setEditMarketIds} />
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {(a.markets?.length ? a.markets : [{ code: "none" }]).map((m) => (
                          <span key={m.code} className="rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] font-medium text-neutral-700">
                            {m.code.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {a.totpEnabled && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800">2FA</span>}
                      {a.role === "SUPER_ADMIN" && !a.totpEnabled && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">2FA at next login</span>
                      )}
                      {a.mustChangePassword && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">temporary password</span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-neutral-500">
                    {a.createdAt ? new Date(a.createdAt).toLocaleDateString("en-GB") : "—"}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {isEditing ? (
                      <>
                        <Button size="sm" onClick={() => saveEdit(a)}>Save</Button>
                        <Button size="sm" variant="secondary" onClick={cancelEdit}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => startEdit(a)}>Edit</Button>
                        {!isMe && <Button size="sm" variant="secondary" onClick={() => resetPassword(a)}>Reset password</Button>}
                        {!isMe && a.totpEnabled && <Button size="sm" variant="secondary" onClick={() => reset2fa(a)}>Reset 2FA</Button>}
                        {!isMe && <Button size="sm" variant="dangerOutline" onClick={() => deleteAdmin(a.id)}>Delete</Button>}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </AdminTableCard>

      {tempPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold">Temporary password for {tempPassword.name}</h3>
            <p className="mt-1 text-sm text-neutral-600">
              Send it to them through a safe channel. It is shown only now; they must change it at their next login.
            </p>
            <code className="my-3 block rounded bg-neutral-100 px-3 py-2 text-center text-lg tracking-wider">{tempPassword.password}</code>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => navigator.clipboard?.writeText(tempPassword.password).then(() => toast.success("Copied."))}
              >
                Copy
              </Button>
              <Button className="flex-1" onClick={() => setTempPassword(null)}>Done</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MarketCheckboxes({ markets, value, onChange }) {
  function toggle(id) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }
  return (
    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
      {markets.map((m) => (
        <label key={m.id} className="inline-flex items-center gap-1.5 text-sm text-neutral-700">
          <input type="checkbox" checked={value.includes(m.id)} onChange={() => toggle(m.id)} />
          {m.code.toUpperCase()}
        </label>
      ))}
    </div>
  );
}
