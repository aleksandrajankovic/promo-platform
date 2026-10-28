import { useMemo, useSyncExternalStore } from "react";

const KEY = 'mb-cal-progress';

export function getOpenedDays(year, month) {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || '{}');
    return new Set(stored[`${year}-${month}`] || []);
  } catch {
    return new Set();
  }
}

export function markDayOpened(year, month, day) {
  if (typeof window === 'undefined') return;
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || '{}');
    const k = `${year}-${month}`;
    const days = new Set(stored[k] || []);
    if (days.has(day)) return;
    days.add(day);
    stored[k] = [...days];
    localStorage.setItem(KEY, JSON.stringify(stored));
    window.dispatchEvent(
      new CustomEvent('mb-day-opened', { detail: { year, month, day } })
    );
  } catch {}
}

// Otvoreni dani iz localStorage-a kao React "spoljni izvor": na serveru prazno,
// u browseru se čita i osvežava na otvaranje dana (i iz drugog taba).
function subscribeOpenedDays(onChange) {
  window.addEventListener("mb-day-opened", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("mb-day-opened", onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useOpenedDays(year, month) {
  // snapshot je string da bi se poredio po vrednosti (useSyncExternalStore traži stabilan rezultat)
  const raw = useSyncExternalStore(
    subscribeOpenedDays,
    () => JSON.stringify([...getOpenedDays(year, month)]),
    () => "[]"
  );
  return useMemo(() => new Set(JSON.parse(raw)), [raw]);
}
