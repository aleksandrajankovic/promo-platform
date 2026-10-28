"use client";
// Zajednički delovi SpecialEditor-a i WeeklyEditor-a — stanje forme (jezici
// tržišta, prevodi, migracija starih flat redova) i polja koja oba editora
// prikazuju isto. Razlike (datum vs. dan u nedelji, knockout faza) ostaju u
// samim editorima.

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import RichEditor from "@/components/admin-shared/RichEditor";
import ImageGalleryModal from "./ImageGalleryModal";
import { monthHref } from "@/lib/calendar/calendarUrls";
import { getAllowedCategories } from "@/lib/calendar/promoCategoryStyles";
import { isValidLink } from "@/lib/validate";
import { confirmDialog } from "./ui/ConfirmDialog";
import Button from "./ui/Button";

const LOCALE_LABELS = {
  sr: "Srpski", en: "English", sw: "Swahili", pt: "Portuguese", ba: "Bosanski", el: "Greek",
};

// Knockout vrednosti (Quarterfinal/Semifinal/Final) namerno nisu ovde — one
// idu preko posebnog knockoutPhase polja, koje ima samo SpecialPromotion.
const CATEGORIES = [
  { value: "SPORT", label: "Sport" },
  { value: "CASINO", label: "Casino" },
  { value: "MISSIONS", label: "Missions" },
  { value: "ALL", label: "All" },
  { value: "GOLD", label: "Golden Ball" },
];

// Kategorije koje API prihvata za datu temu meseca (Golden Ball samo u football).
export function categoryOptionsFor(theme) {
  const allowed = getAllowedCategories(theme);
  return CATEGORIES.filter((c) => allowed.includes(c.value));
}

export const WEEKDAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Stanje forme zajedničko za oba editora. Tržište (i time koji jezici imaju
// smisla) zavisi od trenutnog izbora u admin market switcher-u.
export function usePromoEditorForm(seed, initial) {
  const [form, setForm] = useState(seed);
  const [market, setMarket] = useState(null);
  const [activeLang, setActiveLang] = useState("sr");
  const [themeSettings, setThemeSettings] = useState(null);

  // Tema meseca (per-month override > globalna) — određuje koje kategorije i
  // knockout opcije imaju smisla; isto pravilo kao resolveMonthTheme na API-ju.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/calendar-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((cs) => {
        if (!cancelled && cs) setThemeSettings({ theme: cs.theme, monthBackgrounds: cs.monthBackgrounds || {} });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // null dok se podešavanja ne učitaju
  function themeFor(year, month) {
    if (!themeSettings) return null;
    return themeSettings.monthBackgrounds[`${year}-${month}`]?.theme || themeSettings.theme || "default";
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/current-market")
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => {
        if (cancelled || !m) return;
        setMarket(m);
        setActiveLang(m.defaultLocale);

        // Stari flat redovi (pre translations polja) — prebaci top-level
        // title/richHtml/... u translations[defaultLocale] jednom, na otvaranju.
        setForm((prev) => {
          if (prev.translations?.[m.defaultLocale]) return prev;
          if (!initial?.title && !initial?.richHtml) return prev;
          return {
            ...prev,
            translations: {
              ...prev.translations,
              [m.defaultLocale]: {
                title: initial?.title ?? "",
                button: initial?.button ?? "",
                link: initial?.link ?? "",
                rich: initial?.rich ?? null,
                richHtml: initial?.richHtml ?? "",
              },
            },
          };
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // dirty = korisnik je nešto promenio (automatsko prebacivanje starih redova
  // u prevode pri otvaranju ide preko setForm direktno i ne računa se)
  const [dirty, setDirty] = useState(false);
  function updateForm(update) {
    setDirty(true);
    setForm(update);
  }

  function setField(key, value) {
    updateForm((prev) => ({ ...prev, [key]: value }));
  }

  function setTranslationField(lang, key, value) {
    updateForm((prev) => {
      const prevTranslations = prev.translations || {};
      return {
        ...prev,
        translations: {
          ...prevTranslations,
          [lang]: { ...(prevTranslations[lang] || {}), [key]: value },
        },
      };
    });
  }

  const currentT = form.translations?.[activeLang] || {};

  // Proverava naslov i opis aktivnog jezika; vraća false (uz toast) ako fale.
  function validateActiveTranslation() {
    if (!currentT.title?.trim()) {
      toast.error("Title is required for the active language.");
      return false;
    }
    if (!currentT.richHtml?.trim()) {
      toast.error("Description is required for the active language.");
      return false;
    }
    if (!isValidLink(currentT.link)) {
      toast.error("Button link must start with https://, http:// or /.");
      return false;
    }
    return true;
  }

  // Polja sadržaja za API — lokalizovani sadržaj + top-level kopija aktivnog
  // jezika (defaultLang = aktivni tab).
  function contentPayload() {
    const translations = form.translations || {};
    return {
      translations,
      defaultLang: activeLang,
      title: currentT.title || "",
      button: currentT.button || "",
      link: currentT.link || form.link || "",
      rich: currentT.rich || null,
      richHtml: currentT.richHtml || "",
      icon: form.icon ?? "",
      active: !!form.active,
      scratch: !!form.scratch,
      flipCard: !!form.flipCard,
      buttonColor: form.buttonColor || "green",
      category: form.category || "ALL",
    };
  }

  // Sufiks " (EN)" uz labele polja — samo kad tržište ima više jezika.
  const langSuffix = market?.locales?.length > 1 ? ` (${activeLang.toUpperCase()})` : "";

  return {
    form, setForm: updateForm, setField, setTranslationField, dirty,
    market, activeLang, setActiveLang, currentT, langSuffix,
    validateActiveTranslation, contentPayload, themeFor,
  };
}

// 409 sa API-ja: neko je u međuvremenu snimio (ili obrisao) ovu promociju.
// Pita da li da se njegove izmene prepišu; true = pošalji ponovo bez provere.
export async function askOverwrite(conflict) {
  if (conflict?.deleted) {
    toast.error("This promotion was deleted by another admin while you were editing.");
    return false;
  }
  const who = conflict?.updatedBy || "Another admin";
  const when = conflict?.updatedAt
    ? new Date(conflict.updatedAt).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "";
  return confirmDialog({
    title: "Someone else changed this promotion",
    message: `${who} saved changes${when ? ` at ${when}` : ""} while you were editing. Saving now will overwrite their changes.\n\nTo see their version instead, keep editing, then close the editor and open it again.`,
    confirmLabel: "Overwrite",
    cancelLabel: "Keep editing",
    tone: "danger",
  });
}

export function openCalendarPreview(year, month) {
  const y = year || new Date().getFullYear();
  const m = typeof month === "number" ? month : new Date().getMonth();
  window.open(monthHref(y, m), "_blank", "noopener,noreferrer");
}

// Editor kao panel sa desne strane preko liste — nema skrolovanja do forme
// ispod tabele, a zaglavlje (status, Save/Cancel) ostaje zalepljeno na vrhu.
// ready=false dok se ne učitaju jezici tržišta — polja se tada ne prikazuju,
// inače bi tekst otkucan u tom trenutku otišao pod pogrešan jezik
export function EditorShell({ heading, active, onToggleActive, onPreview, onCancel, onSave, saving, dirty = false, ready = true, children }) {
  // zatvaranje sa nesnimljenim izmenama traži potvrdu (Cancel, Esc)
  async function requestClose() {
    if (dirty) {
      const ok = await confirmDialog({
        title: "Discard unsaved changes?",
        message: "Your changes in this editor will be lost.",
        confirmLabel: "Discard",
        cancelLabel: "Keep editing",
        tone: "danger",
      });
      if (!ok) return;
    }
    onCancel();
  }

  useEffect(() => {
    function onKeyDown(e) {
      // Esc zatvara samo editor, ne kad je preko njega otvoren drugi prozor (galerija)
      if (e.key === "Escape" && document.querySelectorAll('[aria-modal="true"]').length === 1) requestClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // zatvaranje taba, osvežavanje ili odlazak na drugu adresu — upozorenje browsera
  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(e) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // zaključaj skrol stranice ispod panela dok je otvoren
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/30" aria-hidden="true" />
      <div className="relative h-full w-full max-w-3xl overflow-y-auto bg-neutral-50 shadow-2xl">
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-white px-5 py-3">
          <div className="flex items-center gap-3">{heading}</div>

          <div className="flex items-center gap-3">
            <ActiveSwitch active={active} onToggle={onToggleActive} />
            <button
              type="button"
              onClick={onPreview}
              className="text-xs text-neutral-600 underline decoration-neutral-300 hover:text-neutral-900"
            >
              Preview ↗
            </button>
            <Button size="sm" variant="secondary" onClick={requestClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={onSave} disabled={saving || !ready}>
              {saving ? "Saving..." : dirty ? "Save •" : "Save"}
            </Button>
          </div>
        </div>

        <div className="space-y-4 p-5">
          {ready ? children : <p className="py-10 text-center text-sm text-neutral-500">Loading…</p>}
        </div>
      </div>
    </div>
  );
}

function ActiveSwitch({ active, onToggle }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!active}
      onClick={onToggle}
      className="flex items-center gap-2 text-xs text-neutral-700"
      title="Inactive promotions are not shown on the calendar"
    >
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
          active ? "bg-admin-primary" : "bg-neutral-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${
            active ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
      {active ? "Active" : "Inactive"}
    </button>
  );
}

export function Section({ title, children }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

// Jezički tabovi — samo kad tržište ima više od jednog jezika
export function LanguageTabs({ market, activeLang, onChange }) {
  if (!(market?.locales?.length > 1)) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-neutral-100">
      {market.locales.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => onChange(code)}
          className={`px-3 py-1.5 text-xs border-b-2 ${
            activeLang === code
              ? "border-admin-brand text-admin-brand font-semibold"
              : "border-transparent text-neutral-600 hover:text-neutral-900"
          }`}
        >
          {LOCALE_LABELS[code] || code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

// Scratch + flip card prekidači
export function CardEffectToggles({ form, setField }) {
  return (
    <>
      <label className="flex items-center gap-2 text-sm text-neutral-800">
        <input
          type="checkbox"
          checked={!!form.scratch}
          onChange={(e) => setField("scratch", e.target.checked)}
        />
        Enable scratch card
      </label>
      <label className="flex items-center gap-2 text-sm text-neutral-800">
        <input
          type="checkbox"
          checked={!!form.flipCard}
          onChange={(e) => setField("flipCard", e.target.checked)}
        />
        Enable flip card
      </label>
    </>
  );
}

export function TextField({ label, value, onChange, placeholder, error, className = "" }) {
  return (
    <label className={`block text-sm text-neutral-800 ${className}`}>
      <span className="mb-1 inline-block">{label}</span>
      <input
        className={`w-full border rounded px-2.5 py-1.5 text-sm ${error ? "border-red-500" : "border-[#D0D0D0]"}`}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={!!error}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

// Link polje sa proverom odmah pri unosu (API bi nevažeći link tiho obrisao).
export function LinkField({ label, value, onChange, className = "" }) {
  return (
    <TextField
      label={label}
      value={value}
      onChange={onChange}
      placeholder="https://..."
      className={className}
      error={isValidLink(value) ? null : "Must start with https://, http:// or /"}
    />
  );
}

const BUTTON_COLOR_SWATCHES = [
  { value: "yellow", swatch: "bg-[#FFCB05]", check: "text-black", label: "Yellow button" },
  { value: "green", swatch: "bg-[#17BB00]", check: "text-white", label: "Green button" },
];

export function ButtonColorPicker({ value, onChange, className = "" }) {
  return (
    <div className={`flex flex-col items-start ${className}`}>
      <span className="mb-1 inline-block text-sm text-neutral-800">Button Color</span>
      <div className="flex items-center gap-2">
        {BUTTON_COLOR_SWATCHES.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            className={`h-7 w-7 rounded-full flex items-center justify-center border transition ${
              value === c.value ? "border-black" : "border-transparent"
            }`}
            aria-label={c.label}
          >
            <span className={`h-6 w-6 rounded-full ${c.swatch} flex items-center justify-center`}>
              {value === c.value && <span className={`${c.check} text-[10px] leading-none`}>✓</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Red "pill" dugmića sa jednim izborom (kategorija, knockout faza).
export function PillSelector({ label, options, value, onChange }) {
  return (
    <div>
      <span className="mb-1 inline-block text-sm text-neutral-800">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => onChange(opt.value)}
              className={
                "px-3 py-1 rounded-full text-[11px] font-medium border transition " +
                (selected
                  ? "bg-admin-primary text-white border-admin-primary"
                  : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100")
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function IconField({ value, onChange }) {
  const [showGallery, setShowGallery] = useState(false);
  return (
    <div>
      <label className="block text-sm text-neutral-800">
        <span className="mb-1 inline-block">Icon</span>

        <div className="flex flex-wrap items-center gap-3">
          <input
            className="flex-1 min-w-0 border border-[#D0D0D0] rounded px-2.5 py-1.5 text-sm"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="/uploads/promo-icon.webp"
          />
          <Button size="sm" variant="secondary" className="shrink-0" onClick={() => setShowGallery(true)}>
            Choose from gallery
          </Button>
        </div>

        {value && (
          <div className="mt-2 flex items-center gap-3">
            <img
              src={value}
              alt="icon preview"
              className="w-8 h-8 object-contain border border-neutral-200 rounded bg-white"
            />
            <code className="text-xs text-neutral-500 break-all">{value}</code>
          </div>
        )}
      </label>

      {showGallery && (
        <ImageGalleryModal
          onSelect={(url) => {
            onChange(url);
            setShowGallery(false);
          }}
          onClose={() => setShowGallery(false)}
        />
      )}
    </div>
  );
}

export function DescriptionField({ label, activeLang, currentT, setTranslationField, placeholder }) {
  return (
    <div>
      <span className="text-sm text-neutral-800 block mb-1.5">{label}</span>
      <div className="border border-[#D0D0D0] rounded">
        <RichEditor
          key={activeLang} // remount kad promeniš jezik
          initialJSON={currentT.rich || null}
          initialHTML={currentT.richHtml || ""}
          placeholder={placeholder}
          onChange={({ json, html }) => {
            setTranslationField(activeLang, "rich", json);
            setTranslationField(activeLang, "richHtml", html);
          }}
        />
      </div>
    </div>
  );
}
