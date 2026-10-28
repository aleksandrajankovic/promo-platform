"use client";
// Prozor za potvrdu umesto window.confirm / toast potvrde.
//   const ok = await confirmDialog({ title, message, confirmLabel, tone: "danger" });
// <ConfirmHost /> je u admin layout-u; bez njega pada nazad na window.confirm.

import { useEffect, useRef, useState } from "react";
import Button from "./Button";

let show = null;

export function confirmDialog({ title, message = "", confirmLabel = "Confirm", cancelLabel = "Cancel", tone = "primary" }) {
  if (!show) return Promise.resolve(window.confirm([title, message].filter(Boolean).join("\n\n")));
  return new Promise((resolve) => show({ title, message, confirmLabel, cancelLabel, tone, resolve }));
}

export function ConfirmHost() {
  const [request, setRequest] = useState(null);
  const confirmRef = useRef(null);

  useEffect(() => {
    show = setRequest;
    return () => {
      show = null;
    };
  }, []);

  useEffect(() => {
    if (request) confirmRef.current?.focus();
  }, [request]);

  if (!request) return null;

  function close(result) {
    request.resolve(result);
    setRequest(null);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          close(false);
        }
      }}
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <h3 id="confirm-title" className="text-base font-semibold text-neutral-900">{request.title}</h3>
        {request.message && <p className="mt-2 whitespace-pre-line text-sm text-neutral-600">{request.message}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => close(false)}>{request.cancelLabel}</Button>
          <Button ref={confirmRef} variant={request.tone === "danger" ? "danger" : "primary"} onClick={() => close(true)}>
            {request.confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
