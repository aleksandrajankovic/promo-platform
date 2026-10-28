"use client";

import { useMemo, useState } from "react";
import AdminTableCard from "../../components/AdminTableCard";
import { MONTH_NAMES, POSITION_OPTIONS, THEME_OPTIONS } from "./constants";

function ImagePlaceholderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M21 16l-5.5-5.5a1.5 1.5 0 0 0-2.12 0L5 19" />
    </svg>
  );
}

// Fallback za slomljen <img> (npr. lokalno nedostupan /uploads/... fajl koji
// još nije povučen sa produkcionog servera) — bez ovoga browser prikazuje
// ružnu "polomljenu" ikonicu i alt tekst preko sive pozadine.
function BgPreview({ src, alt, emptyLabel }) {
  const [broken, setBroken] = useState(false);
  const showImage = src && !broken;

  return showImage ? (
    <img src={src} alt={alt} className="w-full h-full object-cover" onError={() => setBroken(true)} />
  ) : (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-neutral-400">
      <ImagePlaceholderIcon />
      <span className="text-xs px-2 text-center">{src ? "Image not available" : emptyLabel}</span>
    </div>
  );
}

function PositionIcon({ value }) {
  return (
    <span className="flex gap-0.5 items-end h-6" aria-hidden="true">
      {value === "left" && (
        <>
          <span className="w-6 h-full bg-current rounded-sm opacity-80" />
          <span className="w-2 h-4 bg-current rounded-sm opacity-20" />
          <span className="w-2 h-4 bg-current rounded-sm opacity-20" />
        </>
      )}
      {value === "center" && (
        <>
          <span className="w-2 h-4 bg-current rounded-sm opacity-20" />
          <span className="w-6 h-full bg-current rounded-sm opacity-80" />
          <span className="w-2 h-4 bg-current rounded-sm opacity-20" />
        </>
      )}
      {value === "right" && (
        <>
          <span className="w-2 h-4 bg-current rounded-sm opacity-20" />
          <span className="w-2 h-4 bg-current rounded-sm opacity-20" />
          <span className="w-6 h-full bg-current rounded-sm opacity-80" />
        </>
      )}
    </span>
  );
}

export default function BrandingLayoutTab({
  logoUrl, setLogoUrl,
  titleSr, setTitleSr, lang, defaultLang = "sr", titlePlaceholder = "",
  theme, setTheme,
  calendarPosition, setCalendarPosition,
  bgUrl, setBgUrl,
  bgUrlMobile, setBgUrlMobile,
  monthBackgrounds, setMonthBackgrounds,
  selYear, setSelYear,
  selMonth, setSelMonth,
  openGallery,
}) {
  const now = new Date();
  const currentKey = `${selYear}-${selMonth}`;
  const currentBg = monthBackgrounds[currentKey] || {};
  const monthLabel = `${MONTH_NAMES[selMonth]} ${selYear}`;

  function setField(field, value) {
    setMonthBackgrounds((prev) => ({
      ...prev,
      [currentKey]: { ...prev[currentKey], [field]: value },
    }));
  }

  // Naslov meseca po jeziku: titles[lang]; stari titleSr važi za podrazumevani
  // jezik dok se ne izmeni (tada se prebacuje u titles i briše).
  const monthTitle = currentBg.titles?.[lang] ?? (lang === defaultLang ? currentBg.titleSr || "" : "");
  function setMonthTitle(value) {
    setMonthBackgrounds((prev) => {
      const bg = prev[currentKey] || {};
      return {
        ...prev,
        [currentKey]: {
          ...bg,
          titles: { ...(bg.titles || {}), [lang]: value },
          ...(lang === defaultLang ? { titleSr: null } : {}),
        },
      };
    });
  }

  function clearKey(key) {
    setMonthBackgrounds((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  const configuredKeys = useMemo(
    () => Object.keys(monthBackgrounds).filter((k) => {
      const v = monthBackgrounds[k];
      return v?.desktop || v?.mobile || v?.position || v?.titleSr || (v?.titles && Object.keys(v.titles).length) || v?.inactive || v?.theme
        || v?.topOffset || v?.topOffsetMobile || v?.dayFrom || v?.dayTo;
    }),
    [monthBackgrounds]
  );

  return (
    <div className="space-y-6">
      {/* ── MONTH CONTEXT BAR — picked once, applies to every "override" section below ── */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
        <p className="text-sm font-medium text-neutral-800 mb-2">Month overrides apply to:</p>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="border border-[#D0D0D0] rounded px-2.5 py-1.5 text-sm"
            value={selMonth}
            onChange={(e) => setSelMonth(Number(e.target.value))}
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={i} value={i}>{name}</option>
            ))}
          </select>
          <input
            type="number"
            className="w-24 border border-[#D0D0D0] rounded px-2.5 py-1.5 text-sm"
            value={selYear}
            min={2024}
            max={now.getFullYear() + 2}
            onChange={(e) => setSelYear(Number(e.target.value))}
          />
          {monthBackgrounds[currentKey] && (
            <button
              type="button"
              onClick={() => clearKey(currentKey)}
              className="text-xs text-red-500 hover:text-red-700 underline"
            >
              Clear all overrides for {monthLabel}
            </button>
          )}
        </div>
        <p className="text-xs text-neutral-500 mt-2">
          Every "Override for {monthLabel}" section below (Title, Theme, Position, Visible days & spacing, Background) and the deactivate switch apply to this month. Change the month here, it updates everywhere at once.
        </p>
      </div>

      {/* ── DEACTIVATE MONTH ── */}
      <AdminTableCard title="Deactivate Month">
        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-800">Hide {monthLabel} from all users</p>
            <p className="text-xs text-neutral-500 mt-0.5">Admin preview still works while deactivated.</p>
          </div>
          <button
            type="button"
            onClick={() => setField("inactive", currentBg.inactive ? null : true)}
            className={[
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
              currentBg.inactive ? "bg-red-600" : "bg-neutral-300",
            ].join(" ")}
            role="switch"
            aria-checked={!!currentBg.inactive}
          >
            <span
              className={[
                "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200",
                currentBg.inactive ? "translate-x-5" : "translate-x-0",
              ].join(" ")}
            />
          </button>
        </div>
      </AdminTableCard>

      {/* ── LOGO (global only) ── */}
      <AdminTableCard title="Logo">
        <div className="p-4 space-y-4">
          <p className="text-sm text-neutral-500">Logo displayed in the top-left header bar.</p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="flex-1 min-w-0 border border-[#D0D0D0] rounded px-2.5 py-1.5 text-sm"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="/img/meridianbet-ng.png"
            />
            <button
              type="button"
              onClick={() => openGallery("logo")}
              className="shrink-0 inline-flex items-center justify-center px-4 py-2.5 rounded bg-[#1F2933] text-white text-xs hover:brightness-110 whitespace-nowrap"
            >
              Choose from gallery
            </button>
          </div>
          {logoUrl && (
            <div className="mt-1 h-14 flex items-center bg-[#D11101] rounded-lg px-4 max-w-xs">
              <img src={logoUrl} alt="logo preview" className="h-9 w-auto object-contain" />
            </div>
          )}
        </div>
      </AdminTableCard>

      {/* ── CALENDAR TITLE ── */}
      <AdminTableCard title="Calendar Title">
        <div className="p-4 space-y-4">
          <p className="text-sm text-neutral-500">
            Global default heading shown above the calendar ({lang.toUpperCase()}). Leave empty for &quot;{titlePlaceholder}&quot;.
          </p>
          <input
            className="w-full border border-[#D0D0D0] rounded px-2.5 py-2 text-sm"
            value={titleSr}
            onChange={(e) => setTitleSr(e.target.value)}
            placeholder={titlePlaceholder}
          />
          <div className="pt-2 border-t border-neutral-100">
            <p className="text-xs text-neutral-400 mb-1">Preview ({lang.toUpperCase()}):</p>
            <p className="text-2xl font-extrabold tracking-tight text-neutral-800">{titleSr || titlePlaceholder}</p>
          </div>

          <div className="mt-5 pt-4 border-t border-neutral-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-neutral-800">Override for {monthLabel}</p>
              {monthTitle && (
                <button type="button" onClick={() => setMonthTitle("")} className="text-xs text-red-500 hover:text-red-700 underline">
                  Clear override
                </button>
              )}
            </div>
            <input
              className="w-full border border-[#D0D0D0] rounded px-2.5 py-1.5 text-sm"
              value={monthTitle}
              onChange={(e) => setMonthTitle(e.target.value)}
              placeholder={`Leave empty to use the global title ("${titleSr || titlePlaceholder}")`}
            />
          </div>
        </div>
      </AdminTableCard>

      {/* ── CALENDAR THEME ── */}
      <AdminTableCard title="Calendar Theme">
        <div className="p-4 space-y-4">
          <p className="text-sm text-neutral-500">
            Global default visual style. "Football" shows balls instead of cards.
          </p>
          <div className="flex gap-3 flex-wrap">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={[
                  "px-5 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors",
                  theme === opt.value
                    ? "border-[#AC1C09] bg-red-50 text-[#AC1C09]"
                    : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-neutral-100">
            <p className="text-sm font-medium text-neutral-800 mb-2">Override for {monthLabel}</p>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setField("theme", null)}
                className={[
                  "px-3 py-2 rounded border text-xs transition-colors",
                  !currentBg.theme
                    ? "border-[#AC1C09] bg-red-50 text-[#AC1C09]"
                    : "border-neutral-200 text-neutral-500 hover:border-neutral-400",
                ].join(" ")}
              >
                Use global default
              </button>
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setField("theme", opt.value)}
                  className={[
                    "px-4 py-2 rounded border-2 text-xs font-medium transition-colors",
                    currentBg.theme === opt.value
                      ? "border-[#AC1C09] bg-red-50 text-[#AC1C09]"
                      : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </AdminTableCard>

      {/* ── CALENDAR POSITION ── */}
      <AdminTableCard title="Calendar Position">
        <div className="p-4 space-y-4">
          <p className="text-sm text-neutral-500">
            Global default desktop alignment of the calendar content. Has no effect on mobile.
          </p>
          <div className="flex gap-3 flex-wrap">
            {POSITION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCalendarPosition(opt.value)}
                className={[
                  "flex flex-col items-center gap-2 px-6 py-4 rounded-lg border-2 text-sm font-medium transition-colors",
                  calendarPosition === opt.value
                    ? "border-[#AC1C09] bg-red-50 text-[#AC1C09]"
                    : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400",
                ].join(" ")}
              >
                <PositionIcon value={opt.value} />
                {opt.label}
              </button>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-neutral-100">
            <p className="text-sm font-medium text-neutral-800 mb-2">Override for {monthLabel}</p>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setField("position", null)}
                className={[
                  "px-3 py-2 rounded border text-xs transition-colors",
                  !currentBg.position
                    ? "border-[#AC1C09] bg-red-50 text-[#AC1C09]"
                    : "border-neutral-200 text-neutral-500 hover:border-neutral-400",
                ].join(" ")}
              >
                Use global default
              </button>
              {POSITION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setField("position", opt.value)}
                  className={[
                    "flex flex-col items-center gap-1.5 px-4 py-2.5 rounded border-2 text-xs font-medium transition-colors",
                    currentBg.position === opt.value
                      ? "border-[#AC1C09] bg-red-50 text-[#AC1C09]"
                      : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400",
                  ].join(" ")}
                >
                  <PositionIcon value={opt.value} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </AdminTableCard>

      {/* ── VISIBLE DAYS + SPACE ABOVE (per month) ── */}
      <AdminTableCard title={`Visible days & spacing — ${monthLabel}`}>
        <div className="p-4 space-y-5">
          <div>
            <p className="text-sm font-medium text-neutral-800 mb-1">Visible days</p>
            <p className="text-xs text-neutral-400 mb-2">
              Show only part of the month, e.g. a campaign from 15 to 31. Leave empty to show the whole month.
            </p>
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <span>From</span>
              <NumberInput min={1} max={31} placeholder="1" value={currentBg.dayFrom} onChange={(v) => setField("dayFrom", v)} />
              <span>to</span>
              <NumberInput min={1} max={31} placeholder="31" value={currentBg.dayTo} onChange={(v) => setField("dayTo", v)} />
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100">
            <p className="text-sm font-medium text-neutral-800 mb-1">Space above calendar</p>
            <p className="text-xs text-neutral-400 mb-2">
              Pushes the calendar down, e.g. when the background has its own title. % of screen height, 0–40.
            </p>
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <span>Desktop</span>
              <NumberInput min={0} max={40} placeholder="0" value={currentBg.topOffset} onChange={(v) => setField("topOffset", v)} />
              <span>%</span>
              <span className="ml-3">Mobile</span>
              <NumberInput min={0} max={40} placeholder="0" value={currentBg.topOffsetMobile} onChange={(v) => setField("topOffsetMobile", v)} />
              <span>%</span>
            </div>
          </div>
        </div>
      </AdminTableCard>

      {/* ── BACKGROUND ── */}
      <AdminTableCard title="Background Image">
        <div className="p-4 space-y-6">
          <p className="text-sm text-neutral-500">Global fallback background used on all months unless overridden.</p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-neutral-800 mb-1">Desktop</label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="flex-1 min-w-0 border border-[#D0D0D0] rounded px-2.5 py-1.5 text-sm"
                  value={bgUrl}
                  onChange={(e) => setBgUrl(e.target.value)}
                  placeholder="/img/bg-calendar.png"
                />
                <button
                  type="button"
                  onClick={() => openGallery("desktop")}
                  className="shrink-0 inline-flex items-center justify-center px-3 py-2 rounded bg-[#1F2933] text-white text-xs hover:brightness-110 whitespace-nowrap"
                >
                  Gallery
                </button>
              </div>
              <div className="mt-3 border border-neutral-200 rounded-lg overflow-hidden shrink-0 h-[284px] aspect-video bg-neutral-100">
                <BgPreview key={bgUrl} src={bgUrl} alt="desktop bg preview" emptyLabel="No background set" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-neutral-800 mb-1">Mobile</label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="flex-1 min-w-0 border border-[#D0D0D0] rounded px-2.5 py-1.5 text-sm"
                  value={bgUrlMobile}
                  onChange={(e) => setBgUrlMobile(e.target.value)}
                  placeholder="/img/bg-calendar-mobile.png"
                />
                <button
                  type="button"
                  onClick={() => openGallery("mobile")}
                  className="shrink-0 inline-flex items-center justify-center px-3 py-2 rounded bg-[#1F2933] text-white text-xs hover:brightness-110 whitespace-nowrap"
                >
                  Gallery
                </button>
              </div>
              <div className="mt-3 border border-neutral-200 rounded-lg overflow-hidden w-40 aspect-9/16 bg-neutral-100">
                <BgPreview key={bgUrlMobile} src={bgUrlMobile} alt="mobile bg preview" emptyLabel="No background set" />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-neutral-800">Override for {monthLabel}</p>
              {(currentBg.desktop || currentBg.mobile) && (
                <button
                  type="button"
                  onClick={() => { setField("desktop", null); setField("mobile", null); }}
                  className="text-xs text-red-500 hover:text-red-700 underline"
                >
                  Clear override
                </button>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Desktop</label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    className="flex-1 min-w-0 border border-[#D0D0D0] rounded px-2.5 py-1.5 text-sm"
                    value={currentBg.desktop || ""}
                    onChange={(e) => setField("desktop", e.target.value)}
                    placeholder="Leave empty to use global background"
                  />
                  <button
                    type="button"
                    onClick={() => openGallery("monthDesktop")}
                    className="shrink-0 inline-flex items-center justify-center px-3 py-2 rounded bg-[#1F2933] text-white text-xs hover:brightness-110 whitespace-nowrap"
                  >
                    Gallery
                  </button>
                </div>
                <div className="mt-3 border border-neutral-200 rounded-lg overflow-hidden shrink-0 h-[284px] aspect-video bg-neutral-100">
                  <BgPreview key={currentBg.desktop || ""} src={currentBg.desktop} alt="month desktop bg preview" emptyLabel="Uses global background" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-neutral-600 mb-1">Mobile</label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    className="flex-1 min-w-0 border border-[#D0D0D0] rounded px-2.5 py-1.5 text-sm"
                    value={currentBg.mobile || ""}
                    onChange={(e) => setField("mobile", e.target.value)}
                    placeholder="Leave empty to use global background"
                  />
                  <button
                    type="button"
                    onClick={() => openGallery("monthMobile")}
                    className="shrink-0 inline-flex items-center justify-center px-3 py-2 rounded bg-[#1F2933] text-white text-xs hover:brightness-110 whitespace-nowrap"
                  >
                    Gallery
                  </button>
                </div>
                <div className="mt-3 border border-neutral-200 rounded-lg overflow-hidden w-40 aspect-9/16 bg-neutral-100">
                  <BgPreview key={currentBg.mobile || ""} src={currentBg.mobile} alt="month mobile bg preview" emptyLabel="Uses global background" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminTableCard>

      {/* ── CONFIGURED OVERRIDES SUMMARY ── */}
      {configuredKeys.length > 0 && (
        <AdminTableCard title="Configured Month Overrides">
          <div className="p-4">
            <ul className="space-y-1">
              {configuredKeys.map((k) => {
                const [ky, km] = k.split("-").map(Number);
                const bg = monthBackgrounds[k];
                const tags = [
                  bg.inactive && "⚠ deactivated",
                  bg.theme === "football" && "⚽ football",
                  bg.theme === "default-horizontal" && "↔ horizontal",
                  (bg.titleSr || (bg.titles && Object.keys(bg.titles).length)) && "title",
                  bg.position && `position: ${bg.position}`,
                  (bg.dayFrom || bg.dayTo) && `days: ${bg.dayFrom || 1}–${bg.dayTo || 31}`,
                  bg.topOffset && `space above: ${bg.topOffset}%`,
                  bg.topOffsetMobile && `space above (mobile): ${bg.topOffsetMobile}%`,
                  bg.desktop && "desktop bg",
                  bg.mobile && "mobile bg",
                ].filter(Boolean).join(", ");
                return (
                  <li key={k} className="flex items-center gap-3 text-xs text-neutral-700">
                    <button
                      type="button"
                      onClick={() => { setSelYear(ky); setSelMonth(km); }}
                      className="underline hover:text-black"
                    >
                      {MONTH_NAMES[km]} {ky}
                    </button>
                    <span className="text-neutral-400">{tags}</span>
                    <button
                      type="button"
                      onClick={() => clearKey(k)}
                      className="text-red-400 hover:text-red-600"
                      aria-label="Remove overrides"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </AdminTableCard>
      )}
    </div>
  );
}

function NumberInput({ value, onChange, min, max, placeholder }) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      className="w-20 border border-[#D0D0D0] rounded px-2.5 py-1.5 text-sm"
      value={value || ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      placeholder={placeholder}
    />
  );
}
