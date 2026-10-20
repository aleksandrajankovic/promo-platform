// src/lib/calendar/specialPayload.js
// Zajednička validacija + priprema podataka za POST /api/special i
// PUT /api/special/:id — ranije duplirano u obe rute, pa su se pravila
// razišla (npr. naslov od samih razmaka, podrazumevani "active").
import { sanitizeRichHtml, sanitizeTranslations } from "@/lib/sanitize";
import { sanitizeLink } from "@/lib/validate";
import { getAllowedCategories } from "@/lib/calendar/promoCategoryStyles";
import { resolveMonthTheme } from "@/lib/calendar/monthTheme";

const MIN_YEAR = 2024;

// Vraća { error: Response } ili { data } spreman za prisma create/update.
// "active" je undefined kad nije poslat — create ga onda postavlja na true,
// a update ga ne dira (Prisma preskače undefined polja).
export async function prepareSpecialData(body, market) {
  const {
    year, month, day, icon, link, buttonColor, active, scratch, flipCard,
    title, button, rich, richHtml,
    translations: rawTranslations, defaultLang, category, knockoutPhase,
  } = body || {};

  const translations = rawTranslations || {};
  const mainLang = defaultLang || market.defaultLocale || "sr";
  const mainT = translations[mainLang] || {};

  const maxYear = new Date().getFullYear() + 5;
  if (
    !Number.isInteger(year) || year < MIN_YEAR || year > maxYear ||
    !Number.isInteger(month) || month < 0 || month > 11 ||
    !Number.isInteger(day) || day < 1 || day > 31
  ) {
    return { error: new Response("Invalid date", { status: 400 }) };
  }
  if (!(String(title ?? "").trim() || String(mainT.title ?? "").trim())) {
    return { error: new Response("Title is required", { status: 400 }) };
  }

  const theme = await resolveMonthTheme(market.id, year, month);
  if (category && !getAllowedCategories(theme).includes(category)) {
    return { error: new Response(`category "${category}" not allowed outside football theme`, { status: 400 }) };
  }
  if (knockoutPhase && theme !== "football") {
    return { error: new Response("knockoutPhase only allowed for football theme", { status: 400 }) };
  }

  return {
    data: {
      marketId: market.id,
      year, month, day,
      title: mainT.title ?? title ?? "",
      button: mainT.button ?? button ?? "",
      link: sanitizeLink(mainT.link ?? link ?? ""),
      rich: mainT.rich ?? rich ?? null,
      richHtml: sanitizeRichHtml(mainT.richHtml ?? richHtml ?? null),
      icon: icon ?? "",
      active: typeof active === "boolean" ? active : undefined,
      scratch: !!scratch,
      flipCard: !!flipCard,
      buttonColor: buttonColor || "green",
      translations: sanitizeTranslations(translations),
      category: category || "ALL",
      knockoutPhase: knockoutPhase || null,
    },
  };
}
