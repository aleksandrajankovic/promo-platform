"use client";
// My account — sopstvena lozinka i 2FA. Nalog sa privremenom lozinkom (posle
// reseta) dolazi ovde automatski i ne može dalje dok je ne promeni.

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import AdminTableCard from "../components/AdminTableCard";
import Button from "../components/ui/Button";
import { CodeInput, RecoveryCodesBox, SetupQr } from "@/components/admin-shared/TwoFactorParts";

const MIN_PASSWORD_LENGTH = 10;

export default function AccountPage() {
  const [me, setMe] = useState(null);

  async function loadMe() {
    const res = await fetch("/api/admin/me", { cache: "no-store" });
    if (res.ok) setMe(await res.json());
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => !cancelled && data && setMe(data));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!me) return <p className="text-sm text-neutral-500">Loading…</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">My account</h1>
        <p className="text-sm text-neutral-500">
          {me.name} · {me.email} · {me.role === "SUPER_ADMIN" ? "Super admin" : `Admin (${me.markets.map((m) => m.code.toUpperCase()).join(", ")})`}
        </p>
      </div>

      {me.mustChangePassword && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You signed in with a temporary password. Choose your own password to continue.
        </div>
      )}

      <PasswordCard me={me} onChanged={loadMe} />
      <TwoFactorCard me={me} onChanged={loadMe} />
    </div>
  );
}

function PasswordCard({ me, onChanged }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (next.length < MIN_PASSWORD_LENGTH) return toast.error(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    if (next !== confirm) return toast.error("New passwords don't match.");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/account/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Password changed. Other sessions were signed out.");
      setCurrent("");
      setNext("");
      setConfirm("");
      if (me.mustChangePassword) {
        // namerno puno učitavanje, ne router.push: header drži mustChangePassword
        // u stanju i vraćao bi korisnika ovde dok se /api/admin/me ne pročita ponovo
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/admin/weekly-plan";
        return;
      }
      onChanged();
    } catch (err) {
      toast.error(err.message || "Could not change password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminTableCard title="Password">
      <form onSubmit={onSubmit} className="space-y-3 p-4">
        <Field label={me.mustChangePassword ? "Temporary password" : "Current password"} value={current} onChange={setCurrent} autoComplete="current-password" />
        <Field label={`New password (min. ${MIN_PASSWORD_LENGTH} characters)`} value={next} onChange={setNext} autoComplete="new-password" />
        <Field label="Repeat new password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Change password"}
        </Button>
      </form>
    </AdminTableCard>
  );
}

function Field({ label, value, onChange, autoComplete }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 inline-block text-neutral-800">{label}</span>
      <input
        type="password"
        className="w-full rounded border border-[#D0D0D0] px-2.5 py-1.5 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
      />
    </label>
  );
}

function TwoFactorCard({ me, onChanged }) {
  const [setup, setSetup] = useState(null); // { qr, secret }
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState(null);
  const [pendingAction, setPendingAction] = useState(null); // "regenerate" | "disable"
  const [busy, setBusy] = useState(false);
  const isSuper = me.role === "SUPER_ADMIN";

  async function call(action, extra = {}) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/account/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (!res.ok) throw new Error(res.status === 401 ? "Invalid code." : await res.text());
      return res.status === 204 ? {} : await res.json();
    } finally {
      setBusy(false);
    }
  }

  async function startSetup() {
    try {
      setSetup(await call("setup"));
      setCode("");
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function confirmCode(action) {
    try {
      const data = await call(action, { code });
      setCode("");
      setSetup(null);
      setPendingAction(null);
      if (action === "disable") {
        toast.success("Two-factor authentication turned off.");
        onChanged();
      } else {
        setCodes(data.recoveryCodes);
      }
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <AdminTableCard title="Two-factor authentication (2FA)">
      <div className="space-y-3 p-4 text-sm">
        {codes ? (
          <RecoveryCodesBox
            codes={codes}
            doneLabel="Done"
            onDone={() => {
              setCodes(null);
              onChanged();
            }}
          />
        ) : me.totpEnabled ? (
          <>
            <p>
              <span className="mr-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">On</span>
              Signing in asks for a code from your authenticator app.
              {isSuper && " Required for super admins."}
            </p>
            {pendingAction ? (
              <div className="max-w-xs space-y-2">
                <span className="text-neutral-600">Enter a code from your app to confirm.</span>
                <CodeInput value={code} onChange={setCode} />
                <div className="flex gap-2">
                  <Button size="sm" disabled={busy} onClick={() => confirmCode(pendingAction)}>
                    Confirm
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setPendingAction(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setPendingAction("regenerate")}>
                  New backup codes
                </Button>
                {!isSuper && (
                  <Button size="sm" variant="dangerOutline" onClick={() => setPendingAction("disable")}>
                    Turn off
                  </Button>
                )}
              </div>
            )}
          </>
        ) : setup ? (
          <div className="max-w-xs space-y-3">
            <p className="text-neutral-600">Scan the QR code with an authenticator app, then enter the code it shows.</p>
            <SetupQr qr={setup.qr} secret={setup.secret} />
            <CodeInput value={code} onChange={setCode} autoFocus={false} />
            <div className="flex gap-2">
              <Button size="sm" disabled={busy} onClick={() => confirmCode("enable")}>
                Turn on
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setSetup(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p>
              <span className="mr-2 rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-700">Off</span>
              Optional for your account — adds a code from your phone to every sign-in.
            </p>
            <Button size="sm" disabled={busy} onClick={startSetup}>
              Turn on 2FA
            </Button>
          </>
        )}
      </div>
    </AdminTableCard>
  );
}
