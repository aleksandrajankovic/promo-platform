// src/app/api/calendar-settings/route.js
export const runtime = "nodejs";

import { revalidateTag } from "next/cache";
import prisma from "@/lib/db";
import { requireAdminMarketOrResponse } from "@/lib/marketScope";
import { mergeLocalizedSeo, mergeLocalizedText } from "@/lib/i18n/localizedText";
import { checkImageUrl } from "@/lib/validate";

const VALID_POS = ["left", "center", "right"];
const VALID_THEMES = ["default", "default-horizontal", "football"];

// Prazni naslov/SEO/natpis se NE popunjavaju podrazumevanim tekstom (ranije je
// to bio srpski tekst i za TZ/BR...) — javna strana tada koristi rečnik za
// jezik stranice (src/lib/i18n/messages.js).
function toResponse(row) {
  return {
    bgImageUrl:       row?.bgImageUrl       || "/img/bg-calendar.png",
    bgImageUrlMobile: row?.bgImageUrlMobile || "/img/bg-calendar-mobile.png",
    monthBackgrounds: row?.monthBackgrounds || {},
    calendarPosition: row?.calendarPosition || "left",
    calendarTitle:    row?.calendarTitle    || {},
    logoUrl:          row?.logoUrl          || "/img/meridianbet-ng.png",
    theme:            row?.theme            || "default",
    seoMeta:          row?.seoMeta          || {},
    countdownTargetIso: row?.countdownTargetIso || "",
    countdownLabel:     row?.countdownLabel     || {},
    leaderboard: {
      enabled: !!row?.leaderboard?.enabled,
      feedUrl: row?.leaderboard?.feedUrl || "",
    },
    scratchCoverUrl: row?.scratchCoverUrl || "/img/scratchCard.png",
    scratchCursorUrl: row?.scratchCursorUrl || "/img/coin.png",
  };
}

function marketLangs(market) {
  return market.locales?.length ? market.locales : [market.defaultLocale || "sr"];
}

export async function GET(req) {
  const { market, errorResponse } = await requireAdminMarketOrResponse(req);
  if (errorResponse) return errorResponse;

  const row = await prisma.calendarSettings.findUnique({ where: { marketId: market.id } });
  return Response.json(toResponse(row));
}

export async function PUT(req) {
  const { market, errorResponse } = await requireAdminMarketOrResponse(req);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));

  // Postojeći red — calendarTitle/seoMeta su JSON kolone sa po jednim ključem
  // po jeziku; upisujemo samo ključ jezika koji se menja, ne ceo objekat,
  // da izmena za jedan jezik ne obriše ono što je sačuvano za drugi.
  const existing = await prisma.calendarSettings.findUnique({ where: { marketId: market.id } });

  // Partial update — only touch fields present in the request body
  const patch = {};

  // URL-ovi slika: nevažeći se odbija (400) umesto da se upiše u style/src
  const IMAGE_FIELDS = ["bgImageUrl", "bgImageUrlMobile", "logoUrl", "scratchCoverUrl", "scratchCursorUrl"];
  for (const field of IMAGE_FIELDS) {
    if (!(field in body)) continue;
    const { url, error } = checkImageUrl(body[field]);
    if (error) return new Response(`${field} ${error}`, { status: 400 });
    patch[field] = url;
  }

  if ("calendarPosition" in body)
    patch.calendarPosition = VALID_POS.includes(body.calendarPosition) ? body.calendarPosition : "left";


  if ("calendarTitle" in body) {
    patch.calendarTitle = mergeLocalizedText(existing?.calendarTitle, body.calendarTitle, marketLangs(market));
  }

  if ("theme" in body)
    patch.theme = VALID_THEMES.includes(body.theme) ? body.theme : "default";

  if ("seoMeta" in body)
    patch.seoMeta = mergeLocalizedSeo(existing?.seoMeta, body.seoMeta, marketLangs(market));

  if ("countdownTargetIso" in body) {
    const raw = (body.countdownTargetIso || "").trim();
    patch.countdownTargetIso = raw && !Number.isNaN(new Date(raw).getTime()) ? raw : null;
  }

  if ("countdownLabel" in body) {
    // stari klijent šalje string — tumači se kao tekst za podrazumevani jezik
    const incoming = typeof body.countdownLabel === "string"
      ? { [market.defaultLocale || "sr"]: body.countdownLabel }
      : body.countdownLabel;
    patch.countdownLabel = mergeLocalizedText(existing?.countdownLabel, incoming, marketLangs(market));
  }



  if ("leaderboard" in body) {
    const lb = body.leaderboard || {};
    patch.leaderboard = {
      enabled: lb.enabled === true,
      feedUrl: typeof lb.feedUrl === "string" ? lb.feedUrl.trim() : "",
    };
  }

  if ("monthBackgrounds" in body) {
    let cleaned = null;
    const raw = body.monthBackgrounds;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const out = {};
      for (const [key, val] of Object.entries(raw)) {
        if (val && typeof val === "object") {
          const desktopCheck = checkImageUrl(val.desktop);
          const mobileCheck  = checkImageUrl(val.mobile);
          if (desktopCheck.error || mobileCheck.error) {
            return new Response(`month ${key} background ${desktopCheck.error || mobileCheck.error}`, { status: 400 });
          }
          const desktop  = desktopCheck.url;
          const mobile   = mobileCheck.url;
          const position = VALID_POS.includes(val.position) ? val.position : null;
          const titleSr  = (val.titleSr  || "").trim() || null;
          const inactive = val.inactive === true ? true : null;
          const theme    = VALID_THEMES.includes(val.theme) ? val.theme : null;
          // naslov meseca po jeziku (titleSr ostaje kao stari naslov za podrazumevani jezik)
          const titles   = mergeLocalizedText(null, val.titles, marketLangs(market));
          // dodatni razmak iznad kalendara, u % visine ekrana (0–40), posebno desktop/mobilni
          const pct = (v) => { const n = Math.round(Number(v)); return n > 0 ? Math.min(n, 40) : null; };
          const topOffset       = pct(val.topOffset);
          const topOffsetMobile = pct(val.topOffsetMobile);
          // skraćen mesec: prikazuju se samo dani od-do (1–31)
          const day = (v) => { const n = Math.round(Number(v)); return n >= 1 && n <= 31 ? n : null; };
          const dayFrom = day(val.dayFrom);
          const dayTo   = day(val.dayTo);
          if (desktop || mobile || position || titleSr || titles || inactive || theme || topOffset || topOffsetMobile || dayFrom || dayTo)
            out[key] = { desktop, mobile, position, titleSr, titles, inactive, theme, topOffset, topOffsetMobile, dayFrom, dayTo };
        }
      }
      cleaned = Object.keys(out).length ? out : null;
    }
    patch.monthBackgrounds = cleaned;
  }

  const row = await prisma.calendarSettings.upsert({
    where:  { marketId: market.id },
    update: patch,
    create: { marketId: market.id, ...patch },
  });

  revalidateTag("calendar", { expire: 0 });
  return Response.json(toResponse(row));
}
