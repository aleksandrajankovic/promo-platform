"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!window.confirm(`Reset the password for ${admin.name}? They will be signed out and must set a new password at their next login.`)) return;
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
    if (!window.confirm(`Turn off two-factor authentication for ${admin.name}? Use this only if they lost their phone and backup codes.${admin.role === "SUPER_ADMIN" ? " They will have to set it up again at their next login." : ""}`)) return;
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
    if (!window.confirm("Delete this admin user?")) return;

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

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4 text-slate-900">
          Users
        </h1>

        {/* Forma za dodavanje admina */}
        <section className="mb-8 bg-white rounded-xl shadow p-5">
          <h2 className="text-lg font-medium mb-3 text-slate-900">
            Add new admin
          </h2>

          <form
            onSubmit={onSubmit}
            className="grid gap-4 sm:grid-cols-2 sm:gap-6"
          >
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">
                Name
              </label>
              <input
                type="text"
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--green-primary)]"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--green-primary)]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                type="password"
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--green-primary)]"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-slate-700">
                Role
              </label>
              <select
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="ADMIN">Admin (selected markets)</option>
                <option value="SUPER_ADMIN">Super admin (all markets)</option>
              </select>
            </div>

            {role === "ADMIN" && (
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700">
                  Markets
                </label>
                <MarketCheckboxes markets={markets} value={marketIds} onChange={setMarketIds} />
              </div>
            )}

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-lg bg-[var(--green-primary)] text-white text-sm font-semibold px-4 py-2 uppercase tracking-wide hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Add admin"}
              </button>
            </div>
          </form>
        </section>

        {/* Lista admina */}
        <section className="bg-white rounded-xl shadow p-5">
          <h2 className="text-lg font-medium mb-3 text-slate-900">
            Existing admins
          </h2>

          {loading ? (
            <p className="text-sm text-slate-600">Loading...</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : admins.length === 0 ? (
            <p className="text-sm text-slate-600">No admins yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-2 px-3 font-medium text-slate-700">
                      ID
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-slate-700">
                      Name
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-slate-700">
                      Email
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-slate-700">
                      Role / markets
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-slate-700">
                      Created
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-slate-700">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {admins.map((a) => {
                    const isEditing = editingId === a.id;
                    return (
                      <tr
                        key={a.id}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <td className="py-2 px-3 text-slate-800">{a.id}</td>

                        <td className="py-2 px-3 text-slate-800">
                          {isEditing ? (
                            <input
                              className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                            />
                          ) : (
                            a.name
                          )}
                        </td>

                        <td className="py-2 px-3 text-slate-700">
                          {isEditing ? (
                            <input
                              className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                            />
                          ) : (
                            a.email
                          )}
                        </td>

                        <td className="py-2 px-3">
                          {a.role === "SUPER_ADMIN" ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              SUPER
                            </span>
                          ) : isEditing ? (
                            <MarketCheckboxes markets={markets} value={editMarketIds} onChange={setEditMarketIds} />
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {(a.markets?.length ? a.markets : [{ code: "admin" }]).map((m) => (
                                <span
                                  key={m.code}
                                  className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                                >
                                  {m.code.toUpperCase()}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="mt-1 flex flex-wrap gap-1">
                            {a.totpEnabled && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800">2FA</span>
                            )}
                            {a.role === "SUPER_ADMIN" && !a.totpEnabled && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">2FA at next login</span>
                            )}
                            {a.mustChangePassword && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">temporary password</span>
                            )}
                          </div>
                        </td>

                        <td className="py-2 px-3 text-slate-500">
                          {a.createdAt
                            ? new Date(a.createdAt).toLocaleString()
                            : "-"}
                        </td>

                        <td className="py-2 px-3">
                          {isEditing ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => saveEdit(a)}
                                className="text-xs px-3 py-1 rounded bg-[var(--green-primary)] text-white hover:brightness-110"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="text-xs px-3 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => startEdit(a)}
                                className="text-xs px-3 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
                              >
                                Edit
                              </button>
                              {a.id !== meId && (
                                <button
                                  type="button"
                                  onClick={() => resetPassword(a)}
                                  className="text-xs px-3 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                                >
                                  Reset password
                                </button>
                              )}
                              {a.id !== meId && a.totpEnabled && (
                                <button
                                  type="button"
                                  onClick={() => reset2fa(a)}
                                  className="text-xs px-3 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                                >
                                  Reset 2FA
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => deleteAdmin(a.id)}
                                className="text-xs px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {tempPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold">Temporary password for {tempPassword.name}</h3>
            <p className="mt-1 text-sm text-slate-600">
              Send it to them through a safe channel. It is shown only now; they must change it at their next login.
            </p>
            <code className="my-3 block rounded bg-slate-100 px-3 py-2 text-center text-lg tracking-wider">{tempPassword.password}</code>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded border border-slate-300 py-2 text-sm hover:bg-slate-50"
                onClick={() => navigator.clipboard?.writeText(tempPassword.password).then(() => toast.success("Copied."))}
              >
                Copy
              </button>
              <button
                type="button"
                className="flex-1 rounded bg-[var(--green-primary)] py-2 text-sm text-white"
                onClick={() => setTempPassword(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function MarketCheckboxes({ markets, value, onChange }) {
  function toggle(id) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }
  return (
    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
      {markets.map((m) => (
        <label key={m.id} className="inline-flex items-center gap-1.5 text-sm text-slate-700">
          <input type="checkbox" checked={value.includes(m.id)} onChange={() => toggle(m.id)} />
          {m.code.toUpperCase()}
        </label>
      ))}
    </div>
  );
}
