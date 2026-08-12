import { buildCalendarData } from "@/lib/calendar/calendarGridHelpers";
import { renderModalHTML } from "@/lib/calendar/promoModalHtml";
import CalendarDayCell from "./CalendarDayCell";
import CalendarGhostCell from "./CalendarGhostCell";
import CalendarMobileStack from "./CalendarMobileStack";
import CalendarMobileVertical from "./CalendarMobileVertical";
import CalendarDayBall from "./CalendarDayBall";
import CalendarGhostBall from "./CalendarGhostBall";
import CalendarMobileFootball from "./CalendarMobileFootball";

export default function CalendarGrid({
  year,
  month,
  weekly = [],
  specials = [],
  adminPreview = false,
  lang = "pt",
  theme = "default",
  prevMonth = null,
  nextMonth = null,
  today,
  openDay = null,
}) {
  const { cells, daysPayload } = buildCalendarData({
    year,
    month,
    weekly,
    specials,
    adminPreview,
    lang,
    today: today ?? new Date(),
  });

  const isFootball = theme === "football";

  // Kad je poznat dan koji treba otvoren pri učitavanju (/promo/[iso]/[slug]),
  // renderujemo sadržaj popup-a direktno na serveru — vidljiv bez izvršavanja JS-a.
  const openEntry = openDay != null ? daysPayload.find((d) => d.day === openDay && d.hasPromo) : null;
  const openHtml = openEntry ? renderModalHTML(openEntry, lang, theme) : null;

  return (
    <section
      id="calendar-root"
      className={`w-full ${adminPreview ? "admin-preview" : ""}`}
    >

      {/* DESKTOP GRID */}
      <div
        className={`hidden md:block rounded-4xl bg-transparent ${
          isFootball
            ? "mx-auto max-w-[1120px] py-2 lg:py-3"
            : "max-w-full py-5 md:py-6 lg:py-7"
        }`}
      >
        <div className="flex flex-col">
          <div
            className={`grid grid-cols-7 gap-1.5 md:gap-2 ${
              isFootball
                ? "auto-rows-[70px] md:auto-rows-[78px] lg:auto-rows-[96px] xl:auto-rows-[104px]"
                : "auto-rows-[52px] md:auto-rows-[70px] lg:auto-rows-[95px]"
            }`}
            data-cal-grid
          >
            {cells.map((cell) => {
              if (cell.type === "prev" || cell.type === "next") {
                return isFootball
                  ? <CalendarGhostBall key={cell.key} cell={cell} />
                  : <CalendarGhostCell key={cell.key} cell={cell} />;
              }

              if (cell.type === "day") {
                if (isFootball) {
                  if (!cell.hasPromo && !cell.isFutureForUx && !cell.isToday) {
                    return <CalendarGhostBall key={cell.key} cell={cell} />;
                  }
                  return (
                    <CalendarDayBall
                      key={cell.key}
                      cell={cell}
                      adminPreview={adminPreview}
                    />
                  );
                }

                // default theme — original logic untouched
                if (cell.isFutureForUx) {
                  return (
                    <CalendarDayCell
                      key={cell.key}
                      cell={cell}
                      lang={lang}
                      adminPreview={adminPreview}
                    />
                  );
                }

                if (!cell.hasPromo) {
                  return <CalendarGhostCell key={cell.key} cell={cell} />;
                }

                return (
                  <CalendarDayCell
                    key={cell.key}
                    cell={cell}
                    lang={lang}
                    adminPreview={adminPreview}
                  />
                );
              }

              return null;
            })}
          </div>
        </div>
      </div>

      {/* MOBILE */}
      <div className="md:hidden flex justify-center min-h-[calc(100vh-200px)]">
        {isFootball
          ? <CalendarMobileFootball
              adminPreview={adminPreview}
              year={year}
              month={month}
              prevMonth={prevMonth}
              nextMonth={nextMonth}
            />
          : theme === "default-horizontal"
            ? <CalendarMobileStack adminPreview={adminPreview} lang={lang} />
            : <CalendarMobileVertical adminPreview={adminPreview} />
        }
      </div>

      {/* MODAL */}
      <div
        id="promo-modal"
        role="presentation"
        className={`fixed inset-0 z-40 ${openHtml ? "" : "hidden"} bg-black/70 px-4`}
      >
        <div className="w-full h-full flex items-center justify-center pointer-events-none">
        <div
          id="promo-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="promo-title"
          className="
            relative
            w-full max-w-[480px]
            max-h-[80vh]
            bg-[#05070D]
            rounded-2xl
            shadow-xl
            transform-gpu transition-all duration-200 ease-out
            flex flex-col
            p-4 sm:p-6
            pointer-events-auto
          "
        >
          <span id="promo-title" className="sr-only">Detalji promocije</span>

          <button
            id="promo-close"
            className="
              absolute right-3 top-3
              h-8 w-8
              flex items-center justify-center
              rounded-full
              text-white/70 hover:text-white
              bg-white/5 hover:bg-white/10
            "
            aria-label="Zatvori"
          >
            ✕
          </button>

          {openHtml ? (
            <div
              id="promo-content"
              className="mt-6 overflow-y-auto pr-2"
              dangerouslySetInnerHTML={{ __html: openHtml }}
            />
          ) : (
            <div id="promo-content" className="mt-6 overflow-y-auto pr-2" />
          )}
        </div>
        </div>
      </div>

      {/* JSON payload za JS logiku */}
      <script
        id="calendar-data"
        type="application/json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            days: daysPayload,
            adminPreview,
            year,
            month,
            lang,
            theme,
          }),
        }}
      />
    </section>
  );
}
