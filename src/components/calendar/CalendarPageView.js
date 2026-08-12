// src/components/CalendarPageView.js
import CalendarGrid from "@/components/calendar/CalendarGrid";
import CalendarEnhancer from "@/components/calendar/CalendarEnhancer";
import MonthPagination from "@/components/calendar/MonthPagination";
import SnowOverlay from "@/components/calendar/SnowOverlay";
import AdminLogoutButton from "@/components/calendar/AdminLogoutButton";
import LeaderboardButton from "@/components/calendar/LeaderboardButton";
import CountdownTimer from "@/components/calendar/CountdownTimer";
import CalendarJsonLd from "@/components/calendar/CalendarJsonLd";
import { bebasNeue, exo2Black } from "@/app/fonts";

export default function CalendarPageView({
  year,
  month,
  isAdmin,
  lang,
  today,
  weekly,
  specials,
  baseUrl,
  logoUrl,
  bgImageUrl,
  bgImageUrlMobile,
  pos,
  calendarTitle,
  theme,
  isMonthInactive,
  prevMonth,
  nextMonth,
  openDay,
  countdownTargetIso,
  countdownLabel,
  leaderboard,
}) {
  const mainJustify =
    pos === "center" ? "md:justify-center" :
    pos === "right"  ? "md:justify-end" :
                       "md:justify-start";
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
      <CalendarJsonLd specials={specials} baseUrl={baseUrl} />

      {/* Preload hero pozadine — ubrzava LCP jer browser inače otkriva CSS background-image tek posle CSSOM parsinga */}
      <link rel="preload" as="image" href={bgImageUrl} media="(min-width: 768px)" fetchPriority="high" />
      <link rel="preload" as="image" href={bgImageUrlMobile} media="(max-width: 767px)" fetchPriority="high" />

      {/* TOP HEADER BAR */}
      <div className="min-h-[100dvh] flex flex-col overflow-hidden">
        <header
          className={
            theme === "football"
              ? "absolute inset-x-0 top-0 z-20 flex items-center justify-center px-4 py-6 md:py-7"
              : "w-full bg-[linear-gradient(90deg,#A6080E_0%,#D11101_100%)] px-4 md:px-16 py-2 flex items-center justify-between shrink-0"
          }
        >
          <a
            href="https://meridianbet.rs"
            target="_blank"
            rel="noreferrer"
            aria-label="Meridianbet Calendar main site"
          >
            <img
              src={logoUrl}
              alt="Meridianbet"
              className={theme === "football" ? "h-8 md:h-10 w-auto" : "h-5 md:h-[25px] w-auto"}
            />
          </a>

          <div className={theme === "football" ? "absolute right-4 hidden md:block" : ""}>
            {leaderboard?.enabled && <LeaderboardButton feedUrl={leaderboard.feedUrl} />}
          </div>

        </header>

        <main
          className={`relative z-0 w-full flex-1 bg-no-repeat bg-cover bg-center calendar-bg overflow-hidden md:overflow-auto flex justify-center ${mainJustify}`}
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
            className={`relative z-10 w-full max-w-6xl px-4 sm:px-6 md:px-10 lg:px-16 pt-4 pb-4 md:pt-6 md:pb-10 ${innerMargin}`}
          >
            <h1
              className={`${
                theme === "football"
                  ? `text-[28px] md:text-[44px] font-black tracking-[0.06em] ${exo2Black.className}`
                  : "text-3xl md:text-5xl font-extrabold tracking-tight"
              } text-white text-center ${headingAlign} ${
                theme === "football" ? "mt-10 mb-4 [@media(min-height:800px)]:mb-10 md:mt-10 md:mb-10" : "my-[30px]"
              }`}
            >
              {calendarTitle}
            </h1>

            <CountdownTimer targetIso={countdownTargetIso} label={countdownLabel} />

            {theme === "football" && (
              <div className="md:hidden flex justify-center mb-4">
                {leaderboard?.enabled && <LeaderboardButton feedUrl={leaderboard.feedUrl} />}
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
                    <span>⚠ Mesec deaktiviran — nije vidljiv korisnicima</span>
                    <a
                      href="/admin/calendar-style/monthly"
                      className="underline hover:text-white transition-colors"
                    >
                      Izmeni
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
                  className="text-sm"
                />
              </div>
            )}

            <div className={theme === "football" ? "mt-2 md:mt-1" : "mt-6"}>
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
              />
            </div>

            <CalendarEnhancer adminPreview={isAdmin} lang={lang} openDay={openDay} />

            {/* DESKTOP PAGINATION */}
            <div className={`hidden md:flex items-center justify-center ${theme === "football" ? "mt-4" : ""}`}>
              <MonthPagination
                year={year}
                month={month}
                prevMonth={prevMonth}
                nextMonth={nextMonth}
                className="text-base"
                labelClassName={theme === "football" ? bebasNeue.className : ""}
              />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
