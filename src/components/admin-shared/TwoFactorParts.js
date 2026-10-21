"use client";
// Delovi 2FA ekrana koje dele login i My account.

import { useState } from "react";
import toast from "react-hot-toast";

export function CodeInput({ value, onChange, autoFocus = true }) {
  return (
    <input
      inputMode="numeric"
      autoComplete="one-time-code"
      autoFocus={autoFocus}
      maxLength={7}
      placeholder="123 456"
      className="mt-1 w-full border border-[#BDBDBD] rounded px-3 py-2 text-center text-lg tracking-[0.3em] tabular-nums"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^\d ]/g, ""))}
    />
  );
}

// QR kod + tajna za ručni unos (ako kamera ne radi)
export function SetupQr({ qr, secret }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <img src={qr} alt="QR code for your authenticator app" className="h-[220px] w-[220px] rounded border" />
      <details className="w-full text-xs text-neutral-600">
        <summary className="cursor-pointer text-center">Can&apos;t scan? Enter the key manually</summary>
        <code className="mt-1 block break-all rounded bg-neutral-100 px-2 py-1 text-center">{secret}</code>
      </details>
    </div>
  );
}

// Rezervni kodovi — prikazuju se samo jednom
export function RecoveryCodesBox({ codes, onDone, doneLabel = "I saved them — continue" }) {
  const [confirmed, setConfirmed] = useState(false);
  const text = codes.join("\n");

  return (
    <div>
      <p className="text-sm text-neutral-700">
        Save these backup codes somewhere safe (e.g. a password manager). Each one works <b>once</b>, if you
        lose your phone. They won&apos;t be shown again.
      </p>
      <pre className="my-3 grid grid-cols-2 gap-x-6 gap-y-1 rounded bg-neutral-100 px-4 py-3 text-sm tabular-nums">
        {codes.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </pre>
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          className="rounded border border-neutral-300 px-3 py-1.5 text-xs hover:bg-neutral-50"
          onClick={() => navigator.clipboard?.writeText(text).then(() => toast.success("Copied."))}
        >
          Copy
        </button>
        <a
          className="rounded border border-neutral-300 px-3 py-1.5 text-xs hover:bg-neutral-50"
          href={`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`}
          download="promo-platform-backup-codes.txt"
        >
          Download
        </a>
      </div>
      <label className="mb-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        I have saved my backup codes
      </label>
      <button
        type="button"
        disabled={!confirmed}
        onClick={onDone}
        className="w-full rounded bg-[var(--green-primary)] py-2 text-white uppercase disabled:opacity-50"
      >
        {doneLabel}
      </button>
    </div>
  );
}
