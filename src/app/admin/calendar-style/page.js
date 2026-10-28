"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import ImageGalleryModal from "../components/ImageGalleryModal";
import TabNav from "./components/TabNav";
import BrandingLayoutTab from "./components/BrandingLayoutTab";
import ScratchTab from "./components/ScratchTab";
import SeoTab from "./components/SeoTab";
import EngagementTab from "./components/EngagementTab";
import { LanguageTabs } from "../components/PromoEditorFields";
import { t as tr } from "@/lib/i18n/messages";

const TABS = [
  { key: "branding", label: "Branding & Layout" },
  { key: "scratch", label: "Scratch & Interactions" },
  { key: "seo", label: "SEO / Meta" },
  { key: "engagement", label: "Engagement" },
];

export default function CalendarStylePage() {
  const now = new Date();
  const [activeTab, setActiveTab] = useState("branding");

  // Global defaults
  const [bgUrl, setBgUrl]                       = useState("");
  const [bgUrlMobile, setBgUrlMobile]           = useState("");
  const [calendarPosition, setCalendarPosition] = useState("left");
  // tekstovi po jeziku tržišta: { sw: "...", en: "..." }
  const [titles, setTitles]                     = useState({});
  const [logoUrl, setLogoUrl]                   = useState("/img/meridianbet-ng.png");
  const [theme, setTheme]                       = useState("default");
  const [seo, setSeo]                           = useState({});
  const [countdownTargetIso, setCountdownTargetIso] = useState("");
  const [countdownLabels, setCountdownLabels]       = useState({});
  const [leaderboardEnabled, setLeaderboardEnabled] = useState(false);
  const [leaderboardFeedUrl, setLeaderboardFeedUrl] = useState("");
  const [scratchCoverUrl, setScratchCoverUrl]   = useState("/img/scratchCard.png");
  const [scratchCursorUrl, setScratchCursorUrl] = useState("/img/coin.png");

  // Per-month overrides
  const [monthBackgrounds, setMonthBackgrounds] = useState({});
  const [selYear, setSelYear]   = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth());

  const [loading, setLoading]                   = useState(true);
  const [saving, setSaving]                     = useState(false);
  const [showGallery, setShowGallery]           = useState(false);
  const [galleryTarget, setGalleryTarget]       = useState(null);
  // jezik koji se trenutno uređuje (tabovi, ako tržište ima više jezika)
  const [market, setMarket]                     = useState(null);
  const [lang, setLang]                         = useState("sr");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/current-market").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/calendar-settings").then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
    ])
      .then(([m, d]) => {
        setMarket(m);
        setLang(m?.defaultLocale || "sr");
        applySettings(d);
      })
      .catch(() => toast.error("Error loading settings."))
      .finally(() => setLoading(false));
  }, []);

  function applySettings(d) {
    setBgUrl(d.bgImageUrl || "/img/bg-calendar.png");
    setBgUrlMobile(d.bgImageUrlMobile || "/img/bg-calendar-mobile.png");
    setCalendarPosition(d.calendarPosition || "left");
    setTitles(d.calendarTitle || {});
    setLogoUrl(d.logoUrl || "/img/meridianbet-ng.png");
    setTheme(d.theme || "default");
    setSeo(d.seoMeta || {});
    setCountdownTargetIso(d.countdownTargetIso || "");
    setCountdownLabels(typeof d.countdownLabel === "string" ? {} : d.countdownLabel || {});
    setLeaderboardEnabled(!!d.leaderboard?.enabled);
    setLeaderboardFeedUrl(d.leaderboard?.feedUrl || "");
    setScratchCoverUrl(d.scratchCoverUrl || "/img/scratchCard.png");
    setScratchCursorUrl(d.scratchCursorUrl || "/img/coin.png");
    setMonthBackgrounds(d.monthBackgrounds || {});
  }

  // vrednosti i setteri za izabrani jezik — tabovi ispod rade sa jednim tekstom
  const langs = market?.locales?.length ? market.locales : [lang];
  const titleForLang = titles[lang] || "";
  const setTitleForLang = (v) => setTitles((prev) => ({ ...prev, [lang]: v }));
  const seoTitle = seo[lang]?.title || "";
  const seoDesc = seo[lang]?.description || "";
  const setSeoField = (field) => (v) => setSeo((prev) => ({ ...prev, [lang]: { ...prev[lang], [field]: v } }));
  const countdownLabel = countdownLabels[lang] || "";
  const setCountdownLabel = (v) => setCountdownLabels((prev) => ({ ...prev, [lang]: v }));

  // prazna polja za sve jezike tržišta se šalju kao "" da API obriše prevod
  function perLang(map, empty) {
    return Object.fromEntries(langs.map((l) => [l, map[l] ?? empty]));
  }

  function openGallery(target) {
    setGalleryTarget(target);
    setShowGallery(true);
  }

  function handleGallerySelect(url) {
    if (galleryTarget === "desktop") setBgUrl(url);
    else if (galleryTarget === "mobile") setBgUrlMobile(url);
    else if (galleryTarget === "logo") setLogoUrl(url);
    else if (galleryTarget === "scratchCover") setScratchCoverUrl(url);
    else if (galleryTarget === "scratchCursor") setScratchCursorUrl(url);
    else if (galleryTarget === "monthDesktop") {
      const key = `${selYear}-${selMonth}`;
      setMonthBackgrounds((prev) => ({ ...prev, [key]: { ...prev[key], desktop: url } }));
    } else if (galleryTarget === "monthMobile") {
      const key = `${selYear}-${selMonth}`;
      setMonthBackgrounds((prev) => ({ ...prev, [key]: { ...prev[key], mobile: url } }));
    }
    setShowGallery(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/calendar-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bgImageUrl: bgUrl,
          bgImageUrlMobile: bgUrlMobile,
          calendarPosition,
          calendarTitle: perLang(titles, ""),
          logoUrl,
          theme,
          seoMeta: perLang(seo, {}),
          countdownTargetIso,
          countdownLabel: perLang(countdownLabels, ""),
          leaderboard: { enabled: leaderboardEnabled, feedUrl: leaderboardFeedUrl },
          scratchCoverUrl,
          scratchCursorUrl,
          monthBackgrounds,
        }),
      });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
      applySettings(await res.json());
      toast.success("Calendar style saved.");
    } catch (e) {
      toast.error(`Error: ${e.message || "Saving failed."}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Calendar Styling</h1>
        <p className="text-sm text-neutral-500">
          Global defaults apply to every month unless you set an override for a specific month.
        </p>
      </div>

      {loading ? (
        <div className="p-4 text-sm">Loading…</div>
      ) : (
        <>
          {langs.length > 1 && (
            <div className="mb-4 rounded-lg border border-neutral-200 bg-white px-4 pt-2 shadow-sm">
              <LanguageTabs market={market} activeLang={lang} onChange={setLang} />
              <p className="pb-2 text-xs text-neutral-500">
                Titles, SEO and the countdown label are edited per language. Images, theme and layout are shared.
              </p>
            </div>
          )}
          <TabNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

          {activeTab === "branding" && (
            <BrandingLayoutTab
              logoUrl={logoUrl} setLogoUrl={setLogoUrl}
              titleSr={titleForLang} setTitleSr={setTitleForLang} lang={lang}
              defaultLang={market?.defaultLocale || "sr"}
              titlePlaceholder={tr(lang, "calendarTitle")}
              theme={theme} setTheme={setTheme}
              calendarPosition={calendarPosition} setCalendarPosition={setCalendarPosition}
              bgUrl={bgUrl} setBgUrl={setBgUrl}
              bgUrlMobile={bgUrlMobile} setBgUrlMobile={setBgUrlMobile}
              monthBackgrounds={monthBackgrounds} setMonthBackgrounds={setMonthBackgrounds}
              selYear={selYear} setSelYear={setSelYear}
              selMonth={selMonth} setSelMonth={setSelMonth}
              openGallery={openGallery}
            />
          )}

          {activeTab === "scratch" && (
            <ScratchTab
              scratchCoverUrl={scratchCoverUrl} setScratchCoverUrl={setScratchCoverUrl}
              scratchCursorUrl={scratchCursorUrl} setScratchCursorUrl={setScratchCursorUrl}
              openGallery={openGallery}
            />
          )}

          {activeTab === "seo" && (
            <SeoTab
              seoTitleSr={seoTitle} setSeoTitleSr={setSeoField("title")}
              seoDescSr={seoDesc} setSeoDescSr={setSeoField("description")}
              lang={lang}
            />
          )}

          {activeTab === "engagement" && (
            <EngagementTab
              countdownTargetIso={countdownTargetIso} setCountdownTargetIso={setCountdownTargetIso}
              countdownLabel={countdownLabel} setCountdownLabel={setCountdownLabel}
              countdownPlaceholder={tr(lang, "countdownDefault")}
              lang={lang}
              leaderboardEnabled={leaderboardEnabled} setLeaderboardEnabled={setLeaderboardEnabled}
              leaderboardFeedUrl={leaderboardFeedUrl} setLeaderboardFeedUrl={setLeaderboardFeedUrl}
            />
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="mt-6 px-[18px] py-[7px] rounded bg-[#17BB00] text-white text-xs font-condensed hover:brightness-110 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </>
      )}

      {showGallery && (
        <ImageGalleryModal
          onSelect={handleGallerySelect}
          onClose={() => setShowGallery(false)}
        />
      )}
    </>
  );
}
