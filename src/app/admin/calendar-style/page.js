"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import ImageGalleryModal from "../components/ImageGalleryModal";
import TabNav from "./components/TabNav";
import BrandingLayoutTab from "./components/BrandingLayoutTab";
import ScratchTab from "./components/ScratchTab";
import SeoTab from "./components/SeoTab";
import EngagementTab from "./components/EngagementTab";

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
  const [titleSr, setTitleSr]                   = useState("PRAZNIČNE MISIJE");
  const [logoUrl, setLogoUrl]                   = useState("/img/meridianbet-ng.png");
  const [theme, setTheme]                       = useState("default");
  const [seoTitleSr, setSeoTitleSr]             = useState("");
  const [seoDescSr, setSeoDescSr]               = useState("");
  const [countdownTargetIso, setCountdownTargetIso] = useState("");
  const [countdownLabel, setCountdownLabel]         = useState("");
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
  // "sr" je samo placeholder dok se ne ucita pravo trziste — ne sme da ostane
  // fiksno, jer /api/calendar-settings cuva seoMeta/calendarTitle pod
  // market.defaultLocale ključem (npr. "pt" za BR), ne uvek pod "sr".
  const [lang, setLang]                         = useState("sr");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/current-market").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/calendar-settings").then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
    ])
      .then(([market, d]) => {
        const resolvedLang = market?.defaultLocale || "sr";
        setLang(resolvedLang);
        setBgUrl(d.bgImageUrl || "/img/bg-calendar.png");
        setBgUrlMobile(d.bgImageUrlMobile || "/img/bg-calendar-mobile.png");
        setCalendarPosition(d.calendarPosition || "left");
        setTitleSr(d.calendarTitle?.[resolvedLang] || d.calendarTitle?.sr || "PRAZNIČNE MISIJE");
        setLogoUrl(d.logoUrl || "/img/meridianbet-ng.png");
        setTheme(d.theme || "default");
        setSeoTitleSr(d.seoMeta?.[resolvedLang]?.title || "");
        setSeoDescSr(d.seoMeta?.[resolvedLang]?.description || "");
        setCountdownTargetIso(d.countdownTargetIso || "");
        setCountdownLabel(d.countdownLabel || "");
        setLeaderboardEnabled(!!d.leaderboard?.enabled);
        setLeaderboardFeedUrl(d.leaderboard?.feedUrl || "");
        setScratchCoverUrl(d.scratchCoverUrl || "/img/scratchCard.png");
        setScratchCursorUrl(d.scratchCursorUrl || "/img/coin.png");
        setMonthBackgrounds(d.monthBackgrounds || {});
      })
      .catch(() => toast.error("Error loading settings."))
      .finally(() => setLoading(false));
  }, []);

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
          calendarTitle: { [lang]: titleSr },
          logoUrl,
          theme,
          seoMeta: { [lang]: { title: seoTitleSr, description: seoDescSr } },
          countdownTargetIso,
          countdownLabel,
          leaderboard: { enabled: leaderboardEnabled, feedUrl: leaderboardFeedUrl },
          scratchCoverUrl,
          scratchCursorUrl,
          monthBackgrounds,
        }),
      });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
      const d = await res.json();
      setBgUrl(d.bgImageUrl || "/img/bg-calendar.png");
      setBgUrlMobile(d.bgImageUrlMobile || "/img/bg-calendar-mobile.png");
      setCalendarPosition(d.calendarPosition || "left");
      setTitleSr(d.calendarTitle?.[lang] || d.calendarTitle?.sr || "PRAZNIČNE MISIJE");
      setLogoUrl(d.logoUrl || "/img/meridianbet-ng.png");
      setTheme(d.theme || "default");
      setSeoTitleSr(d.seoMeta?.[lang]?.title || "");
      setSeoDescSr(d.seoMeta?.[lang]?.description || "");
      setCountdownTargetIso(d.countdownTargetIso || "");
      setCountdownLabel(d.countdownLabel || "");
      setLeaderboardEnabled(!!d.leaderboard?.enabled);
      setLeaderboardFeedUrl(d.leaderboard?.feedUrl || "");
      setScratchCoverUrl(d.scratchCoverUrl || "/img/scratchCard.png");
      setScratchCursorUrl(d.scratchCursorUrl || "/img/coin.png");
      setMonthBackgrounds(d.monthBackgrounds || {});
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
          <TabNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

          {activeTab === "branding" && (
            <BrandingLayoutTab
              logoUrl={logoUrl} setLogoUrl={setLogoUrl}
              titleSr={titleSr} setTitleSr={setTitleSr} lang={lang}
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
              seoTitleSr={seoTitleSr} setSeoTitleSr={setSeoTitleSr}
              seoDescSr={seoDescSr} setSeoDescSr={setSeoDescSr}
              lang={lang}
            />
          )}

          {activeTab === "engagement" && (
            <EngagementTab
              countdownTargetIso={countdownTargetIso} setCountdownTargetIso={setCountdownTargetIso}
              countdownLabel={countdownLabel} setCountdownLabel={setCountdownLabel}
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
