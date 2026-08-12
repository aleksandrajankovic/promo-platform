"use client";

import { useEffect, useState } from "react";

function calcRemaining(target) {
  const diff = target - Date.now();
  if (diff <= 0) return null;
  return {
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000)  / 60000),
    seconds: Math.floor((diff % 60000)    / 1000),
  };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

export default function CountdownTimer({ targetIso, label = "Do prve promocije" }) {
  const target = new Date(targetIso).getTime();
  const [remaining, setRemaining] = useState(() => calcRemaining(target));

  useEffect(() => {
    if (!remaining) return;
    const id = setInterval(() => {
      setRemaining(calcRemaining(target));
    }, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!remaining) return null;

  const units = [
    { value: remaining.days,    label: remaining.days === 1 ? "dan" : "dana" },
    { value: remaining.hours,   label: "sati" },
    { value: remaining.minutes, label: "min" },
    { value: remaining.seconds, label: "sek" },
  ];

  return (
    <div className="flex flex-col items-center gap-3 mb-6 md:mb-8">
      <p className="text-white/50 text-[11px] uppercase tracking-[0.18em]">{label}</p>

      <div
        className="flex items-center gap-2 px-5 py-3 rounded-2xl"
        style={{
          background: "rgba(255, 255, 255, 0.07)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.13)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
        }}
      >
        {units.map((u, i) => (
          <div key={u.label} className="flex items-center gap-2">
            {i > 0 && (
              <span className="text-white/25 text-lg font-light mb-3 select-none">:</span>
            )}
            <div className="flex flex-col items-center w-10 md:w-12">
              <span className="text-white font-bold text-2xl md:text-3xl tabular-nums leading-none">
                {pad(u.value)}
              </span>
              <span className="text-white/40 text-[10px] uppercase tracking-wider mt-1">
                {u.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
