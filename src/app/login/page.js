"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CodeInput, RecoveryCodesBox, SetupQr } from "@/components/admin-shared/TwoFactorParts";

// Koraci: "credentials" → (za naloge sa 2FA) "totp" ili "enroll" → "codes"
// (rezervni kodovi posle prvog podešavanja) → admin.
export default function AdminLoginPage() {
  const [step, setStep] = useState("credentials");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState("");
  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [setup, setSetup] = useState(null); // { qr, secret }
  const [recoveryCodes, setRecoveryCodes] = useState(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const router = useRouter();

  function goToAdmin(mustChange) {
    router.push(mustChange ? "/admin/account" : "/admin/weekly-plan");
  }

  function backToStart(message) {
    if (message) toast.error(message);
    setStep("credentials");
    setChallenge("");
    setCode("");
    setSetup(null);
  }

  async function onSubmitCredentials(e) {
    e.preventDefault();
    if (!email.trim() || !pwd.trim()) {
      toast.error("Enter email and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pwd }),
      });
      if (res.status === 429) throw new Error("Too many attempts. Try again in a few minutes.");
      if (!res.ok) throw new Error("Incorrect email or password.");
      const data = await res.json();
      setPwd("");

      if (data.step === "done") {
        toast.success("Login successful.");
        goToAdmin(data.mustChangePassword);
        return;
      }
      setChallenge(data.challenge);
      if (data.step === "enroll") {
        const s = await fetch("/api/auth/2fa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ challenge: data.challenge, action: "setup" }),
        });
        if (!s.ok) throw new Error(await s.text());
        setSetup(await s.json());
      }
      setStep(data.step);
    } catch (err) {
      toast.error(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitCode(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge,
          action: "verify",
          ...(useRecovery ? { recoveryCode } : { code }),
        }),
      });
      if (res.status === 401) {
        const msg = await res.text();
        if (msg.startsWith("Login expired")) return backToStart(msg);
        throw new Error("Invalid code. Try again.");
      }
      if (res.status === 429) throw new Error("Too many attempts. Try again in a few minutes.");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      if (data.recoveryCodes) {
        setRecoveryCodes(data.recoveryCodes);
        setMustChangePassword(data.mustChangePassword);
        setStep("codes");
        return;
      }
      toast.success("Login successful.");
      goToAdmin(data.mustChangePassword);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid md:grid-cols-2">
      {/* Left image */}
      <div className="bg-red-700 relative flex items-center justify-center">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-90"
          style={{ backgroundImage: "url('/img/Login.png')" }}
        />
        <div className="absolute inset-0 bg-red-900/60" />
      </div>

      {/* Right form */}
      <div className="bg-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white shadow-lg rounded-xl p-6">
          {step === "credentials" && (
            <form onSubmit={onSubmitCredentials}>
              <h1 className="text-xl font-semibold text-[var(--black-white)] mb-4">Admin login</h1>

              <label className="block mb-3">
                <span className="text-sm font-roboto font-medium text-[var(--black-white)]">Email</span>
                <input
                  type="email"
                  className="mt-1 w-full border border-[#BDBDBD] rounded px-3 py-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </label>

              <label className="block mb-3">
                <span className="text-sm font-roboto font-medium text-[var(--black-white)]">Password</span>
                <input
                  type="password"
                  className="mt-1 w-full border border-[#BDBDBD] rounded px-3 py-2"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  autoComplete="current-password"
                />
              </label>

              <SubmitButton loading={loading} label="Login" />
              <p className="mt-3 text-xs text-neutral-500">
                Forgot your password? Ask a super admin to reset it — you&apos;ll get a temporary one.
              </p>
            </form>
          )}

          {step === "totp" && (
            <form onSubmit={onSubmitCode}>
              <h1 className="text-xl font-semibold mb-1">Two-factor authentication</h1>
              {useRecovery ? (
                <label className="block mb-3">
                  <span className="text-sm text-neutral-600">Enter one of your backup codes.</span>
                  <input
                    autoFocus
                    className="mt-1 w-full border border-[#BDBDBD] rounded px-3 py-2 text-center tracking-widest"
                    placeholder="xxxx-xxxx"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                  />
                </label>
              ) : (
                <label className="block mb-3">
                  <span className="text-sm text-neutral-600">Enter the 6-digit code from your authenticator app.</span>
                  <CodeInput value={code} onChange={setCode} />
                </label>
              )}
              <SubmitButton loading={loading} label="Verify" />
              <div className="mt-3 flex justify-between text-xs">
                <button type="button" className="text-neutral-600 underline" onClick={() => setUseRecovery((v) => !v)}>
                  {useRecovery ? "Use authenticator code" : "Lost your phone? Use a backup code"}
                </button>
                <button type="button" className="text-neutral-500" onClick={() => backToStart()}>
                  Back
                </button>
              </div>
            </form>
          )}

          {step === "enroll" && setup && (
            <form onSubmit={onSubmitCode}>
              <h1 className="text-xl font-semibold mb-1">Set up two-factor authentication</h1>
              <p className="text-sm text-neutral-600 mb-3">
                Required for super admins. Scan this QR code with an authenticator app (Google Authenticator,
                Microsoft Authenticator…), then enter the 6-digit code it shows.
              </p>
              <SetupQr qr={setup.qr} secret={setup.secret} />
              <label className="block my-3">
                <span className="text-sm text-neutral-600">Code from the app</span>
                <CodeInput value={code} onChange={setCode} autoFocus={false} />
              </label>
              <SubmitButton loading={loading} label="Turn on and continue" />
            </form>
          )}

          {step === "codes" && recoveryCodes && (
            <>
              <h1 className="text-xl font-semibold mb-2">Two-factor authentication is on</h1>
              <RecoveryCodesBox codes={recoveryCodes} onDone={() => goToAdmin(mustChangePassword)} />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function SubmitButton({ loading, label }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full bg-[var(--green-primary)] uppercase hover:bg-green-700 transition text-white rounded py-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? "Loading..." : label}
    </button>
  );
}
