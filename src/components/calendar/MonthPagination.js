// src/components/MonthPagination.js
import { localeMonthHref } from "@/lib/calendar/calendarUrls";
import { monthName, t } from "@/lib/i18n/messages";

export default function MonthPagination({
  year,
  month,
  prevMonth,
  nextMonth,
  locale,
  defaultLocale,
  className = "",
  labelClassName = "",
}) {
  const monthLabel = monthName(locale || defaultLocale, month);
  const href = (m) => localeMonthHref(locale, defaultLocale, m.y, m.m);

  return (
    <div className={`inline-flex items-center gap-4 rounded-full bg-black/40 px-4 py-2 text-white ${className}`}>
      {prevMonth ? (
        <a
          href={href(prevMonth)}
          className="p-1 hover:opacity-80"
          aria-label={t(locale || defaultLocale, "prevMonth")}
        >
          ‹
        </a>
      ) : (
        <span className="p-1 opacity-20 cursor-default" aria-hidden="true">‹</span>
      )}

      <span className={`min-w-[140px] text-center font-semibold ${labelClassName}`}>
        {monthLabel} <span className="ml-1 opacity-80">{year}</span>
      </span>

      {nextMonth ? (
        <a
          href={href(nextMonth)}
          className="p-1 hover:opacity-80"
          aria-label={t(locale || defaultLocale, "nextMonth")}
        >
          ›
        </a>
      ) : (
        <span className="p-1 opacity-20 cursor-default" aria-hidden="true">›</span>
      )}
    </div>
  );
}
