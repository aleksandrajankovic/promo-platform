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
