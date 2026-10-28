// src/components/CalendarPageView.js
import CalendarGrid from "@/components/calendar/CalendarGrid";
import CalendarEnhancer from "@/components/calendar/CalendarEnhancer";
import MonthPagination from "@/components/calendar/MonthPagination";
import SnowOverlay from "@/components/calendar/SnowOverlay";
import AdminLogoutButton from "@/components/calendar/AdminLogoutButton";
import LeaderboardButton from "@/components/calendar/LeaderboardButton";
import CountdownTimer from "@/components/calendar/CountdownTimer";
import CalendarJsonLd from "@/components/calendar/CalendarJsonLd";
import LocaleSwitcher from "@/components/calendar/LocaleSwitcher";
import { bebasNeue, exo2Black } from "@/app/fonts";
import { t } from "@/lib/i18n/messages";

export default function CalendarPageView({
  year,
  month,
  isAdmin,
  lang,
  locale,
  defaultLocale,
  locales,
  today,
  weekly,
  specials,
  baseUrl,
  mainSiteUrl,
  timezone,
  scratchCoverUrl,
  scratchCursorUrl,
  logoUrl,
  bgImageUrl,
  bgImageUrlMobile,
  pos,
  calendarTitle,
  topOffset,
  topOffsetMobile,
  dayFrom,
  dayTo,
  theme,
  isMonthInactive,
  prevMonth,
  nextMonth,
  openDay,
  countdownTargetIso,
  countdownLabel,
  leaderboard,
}) {
  const innerMargin =
    pos === "center" ? "mx-auto" :
    pos === "right"  ? "mx-auto md:mx-0 md:ml-auto" :
                       "mx-auto md:mx-0 md:mr-auto";
  const headingAlign =
    pos === "center" ? "md:text-center" :
    pos === "right"  ? "md:text-right" :
                       "md:text-left";

  return (
    <>
      <CalendarJsonLd specials={specials} baseUrl={baseUrl} mainSiteUrl={mainSiteUrl} timezone={timezone} />

      {/* Preload hero pozadine — ubrzava LCP jer browser inače otkriva CSS background-image tek posle CSSOM parsinga */}
      <link rel="preload" as="image" href={bgImageUrl} media="(min-width: 768px)" fetchPriority="high" />
      <link rel="preload" as="image" href={bgImageUrlMobile} media="(max-width: 767px)" fetchPriority="high" />

      <div className="relative min-h-[100dvh] flex flex-col overflow-hidden">
        {/* Bez header trake — logo centriran na celu stranicu, preko pozadine
            (sadržaj ispod ima pt-14/md:pt-16 da ga ne preklopi), kontrole desno. */}
        <div className="absolute inset-x-0 top-4 md:top-6 z-20 flex justify-center pointer-events-none">
          <a
            href={mainSiteUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={t(lang, "mainSite")}
            className="pointer-events-auto"
          >
            <img src={logoUrl} alt="Meridianbet" className="h-8 md:h-10 w-auto" />
          </a>
        </div>

        <div className="absolute right-4 top-4 md:top-6 z-20 flex items-center gap-2">
          {leaderboard?.enabled && (
            <div className="hidden md:block">
              <LeaderboardButton feedUrl={leaderboard.feedUrl} lang={lang} />
            </div>
          )}
          {locales?.length > 1 && (
            <LocaleSwitcher year={year} month={month} locale={locale} defaultLocale={defaultLocale} locales={locales} />
          )}
        </div>

        <main
          className={`relative z-0 w-full flex-1 bg-no-repeat bg-cover bg-center calendar-bg overflow-hidden md:overflow-auto flex flex-col`}
          style={{ backgroundImage: `url("${bgImageUrl}")` }}
        >
          {/* MOBILE BG */}
          <div
            className="pointer-events-none absolute inset-0 md:hidden bg-no-repeat bg-cover bg-center -z-10 calendar-mobile-bg"
            style={{
              backgroundImage: `url("${bgImageUrlMobile}")`,
            }}
          />

          <SnowOverlay />

          <div
            className={`relative z-10 w-full max-w-6xl px-4 sm:px-6 md:px-10 lg:px-16 pt-14 pb-4 md:pt-16 md:pb-0 ${innerMargin}`}
          >
            <h1
              className={`${
                theme === "football"
                  ? `text-[28px] md:text-[44px] font-black tracking-[0.06em] ${exo2Black.className}`
                  : "text-3xl md:text-5xl font-extrabold tracking-tight"
              } text-white text-center ${headingAlign} ${
                theme === "football" ? "mt-6 mb-4 [@media(min-height:800px)]:mb-10 md:mt-8 md:mb-10" : "my-[30px]"
              }`}
            >
              {calendarTitle}
            </h1>

            <CountdownTimer targetIso={countdownTargetIso} label={countdownLabel} lang={lang} />

            {leaderboard?.enabled && (
              <div className="md:hidden flex justify-center mb-4">
                <LeaderboardButton feedUrl={leaderboard.feedUrl} lang={lang} />
              </div>
            )}

            {isAdmin && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded bg-amber-500/20 text-amber-200 px-3 py-1 text-sm">
                  <span>Admin preview</span>
                  <a
                    href="/admin"
                    className="underline hover:text-white transition-colors"
                    title="Go to dashboard"
                  >
                    Dashboard
                  </a>
                  <AdminLogoutButton />
                </div>
                {isMonthInactive && (
                  <div className="inline-flex items-center gap-1.5 rounded bg-red-700/40 text-red-200 border border-red-500/40 px-3 py-1 text-sm">
                    <span>⚠ Month deactivated — not visible to users</span>
                    <a
                      href="/admin/calendar-style"
                      className="underline hover:text-white transition-colors"
                    >
                      Edit
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* MOBILE PAGINATION — skriva se za football temu (paginacija je unutar CalendarMobileFootball) */}
            {theme !== "football" && (
              <div className="mt-6 flex items-center justify-center md:hidden">
                <MonthPagination
                  year={year}
                  month={month}
                  prevMonth={prevMonth}
                  nextMonth={nextMonth}
                  locale={locale}
                  defaultLocale={defaultLocale}
                  className="text-sm"
                />
              </div>
            )}

            {/* dodatni razmak iznad kalendara (podešava se po mesecu) — npr. kad
                pozadina ima svoj naslov; posebno za desktop i mobilni */}
            <div
              className={`${theme === "football" ? "mt-2 md:mt-1" : "mt-6"}${
                topOffset ? " md:[padding-top:var(--cal-top-offset)]" : ""
              }${topOffsetMobile ? " max-md:[padding-top:var(--cal-top-offset-m)]" : ""}`}
              style={{
                ...(topOffset && { "--cal-top-offset": `${topOffset}vh` }),
                ...(topOffsetMobile && { "--cal-top-offset-m": `${topOffsetMobile}svh` }),
              }}
            >
              <CalendarGrid
                year={year}
                month={month}
                weekly={weekly}
                specials={specials}
                adminPreview={isAdmin}
                lang={lang}
                theme={theme}
                prevMonth={prevMonth}
                nextMonth={nextMonth}
                today={today}
                openDay={openDay}
                timezone={timezone}
                scratchCoverUrl={scratchCoverUrl}
                scratchCursorUrl={scratchCursorUrl}
                dayFrom={dayFrom}
                dayTo={dayTo}
                defaultLocale={defaultLocale}
              />
            </div>

            <CalendarEnhancer adminPreview={isAdmin} lang={lang} openDay={openDay} />

          </div>

          {/* DESKTOP PAGINATION — van kontejnera kalendara, centrirana na celu
              stranicu (kao logo), bez obzira na poravnanje kalendara. */}
          <div className={`relative z-10 hidden md:flex items-center justify-center md:pb-10 ${theme === "football" ? "mt-4" : ""}`}>
            <MonthPagination
              year={year}
              month={month}
              prevMonth={prevMonth}
              nextMonth={nextMonth}
              locale={locale}
              defaultLocale={defaultLocale}
              className="text-base"
              labelClassName={theme === "football" ? bebasNeue.className : ""}
            />
          </div>
        </main>
      </div>
    </>
  );
}
