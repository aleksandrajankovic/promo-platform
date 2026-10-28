// src/components/calendar/LocaleSwitcher.js
"use client";

import { t } from "@/lib/i18n/messages";
import { useState, useRef, useEffect } from "react";
import { localeMonthHref } from "@/lib/calendar/calendarUrls";

const LANG_META = {
  sw: { flag: "/img/sw.svg", alt: "Swahili", label: "SW" },
  en: { flag: "/img/en.svg", alt: "English", label: "EN" },
  sr: { flag: "/img/sr.svg", alt: "Srpski", label: "SR" },
  el: { flag: "/img/el.svg", alt: "Greek", label: "EL" },
};

// Prikazuje se samo kad tržište ima više od jednog jezika (parent to proverava).
// Linkovi idu kroz localeMonthHref — isti mehanizam kao i ostatak platforme
// (default jezik bez prefiksa, ostali sa "/en", ne stari "?lang=en").
export default function LocaleSwitcher({ year, month, locale, defaultLocale, locales }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const activeMeta = LANG_META[locale] || { flag: null, alt: locale, label: locale?.toUpperCase() };

  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={wrapperRef} className="relative z-30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center justify-center w-[38px] h-[38px] bg-[#284755]/50 border border-[#396F85]/40 shadow-[0_8px_24px_rgba(0,0,0,0.6)] backdrop-blur-sm hover:bg-[#284755]/70 transition ${
          open ? "rounded-t-[6px] rounded-b-none" : "rounded-[6px]"
        }`}
        aria-label={t(locale, "changeLanguage")}
      >
        {activeMeta.flag ? (
          <img src={activeMeta.flag} alt={activeMeta.alt} className="w-[22px] h-[22px] rounded-[4px] object-cover" />
        ) : (
          <span className="text-white text-xs font-semibold">{activeMeta.label}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full flex flex-col bg-[#284755]/50 rounded-b-[6px] shadow-[0_8px_24px_rgba(0,0,0,0.7)] backdrop-blur-sm">
          {locales.map((loc) => {
            const meta = LANG_META[loc] || { flag: null, alt: loc, label: loc.toUpperCase() };
            const isActive = loc === locale;
            return (
              <a
                key={loc}
                href={localeMonthHref(loc, defaultLocale, year, month)}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-center w-[38px] h-[38px] transition ${
                  isActive ? "bg-[#346275]" : "hover:bg-[#346275]"
                }`}
              >
                {meta.flag ? (
                  <img src={meta.flag} alt={meta.alt} className="w-[22px] h-[22px] rounded-[4px] object-cover" />
                ) : (
                  <span className="text-white text-xs font-semibold">{meta.label}</span>
                )}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
