// src/app/api/calendar-settings/route.js
export const runtime = "nodejs";

import { revalidateTag } from "next/cache";
import prisma from "@/lib/db";
import { requireAdminMarket, MarketScopeError } from "@/lib/marketScope";

const VALID_POS = ["left", "center", "right"];
const VALID_THEMES = ["default", "default-horizontal", "football"];
const DEFAULT_SEO_META = {
  sr: { title: "Kalendar Promocija | Meridianbet", description: "Otkrijte dnevne promocije i iskoristite ekskluzivne nagrade uz Meridianbet Kalendar Promocija." },
};

export async function GET(req) {
  let market;
  try {
    ({ market } = await requireAdminMarket(req));
  } catch (err) {
    if (err instanceof MarketScopeError) return new Response(err.message, { status: err.status });
    throw err;
  }

  const row = await prisma.calendarSettings.findUnique({ where: { marketId: market.id } });
  return Response.json({
    bgImageUrl:       row?.bgImageUrl       || "/img/bg-calendar.png",
    bgImageUrlMobile: row?.bgImageUrlMobile || "/img/bg-calendar-mobile.png",
    monthBackgrounds: row?.monthBackgrounds || {},
    calendarPosition: row?.calendarPosition || "left",
    calendarTitle:    row?.calendarTitle    || { sr: "PRAZNIČNE MISIJE", en: "HOLIDAY MISSIONS" },
    logoUrl:          row?.logoUrl          || "/img/meridianbet-ng.png",
    theme:            row?.theme            || "default",
    seoMeta:          row?.seoMeta          || DEFAULT_SEO_META,
    countdownTargetIso: row?.countdownTargetIso || "",
    countdownLabel:     row?.countdownLabel     || "",
    leaderboard: {
      enabled: !!row?.leaderboard?.enabled,
      feedUrl: row?.leaderboard?.feedUrl || "",
    },
    scratchCoverUrl: row?.scratchCoverUrl || "/img/scratchCard.png",
  });
}

export async function PUT(req) {
  let market;
  try {
    ({ market } = await requireAdminMarket(req));
  } catch (err) {
    if (err instanceof MarketScopeError) return new Response(err.message, { status: err.status });
    throw err;
  }

  const body = await req.json().catch(() => ({}));

  // Postojeći red — calendarTitle/seoMeta su JSON kolone sa po jednim ključem
  // po jeziku; upisujemo samo ključ jezika koji se menja, ne ceo objekat,
  // da izmena za jedan jezik ne obriše ono što je sačuvano za drugi.
  const existing = await prisma.calendarSettings.findUnique({ where: { marketId: market.id } });

  // Partial update — only touch fields present in the request body
  const patch = {};

  if ("bgImageUrl" in body)
    patch.bgImageUrl = (body.bgImageUrl || "").trim() || null;

  if ("bgImageUrlMobile" in body)
    patch.bgImageUrlMobile = (body.bgImageUrlMobile || "").trim() || null;

  if ("calendarPosition" in body)
    patch.calendarPosition = VALID_POS.includes(body.calendarPosition) ? body.calendarPosition : "left";

  if ("logoUrl" in body)
    patch.logoUrl = (body.logoUrl || "").trim() || null;

  if ("calendarTitle" in body) {
    const lang = market.defaultLocale || "sr";
    const t = body.calendarTitle?.[lang] ?? body.calendarTitle?.sr ?? body.calendarTitle;
    const title = (typeof t === "string" ? t.trim() : "") || "PRAZNIČNE MISIJE";
    patch.calendarTitle = { ...(existing?.calendarTitle || {}), [lang]: title };
  }

  if ("theme" in body)
    patch.theme = VALID_THEMES.includes(body.theme) ? body.theme : "default";

  if ("seoMeta" in body) {
    const lang = market.defaultLocale || "sr";
    const s = body.seoMeta?.[lang] ?? body.seoMeta;
    patch.seoMeta = {
      ...(existing?.seoMeta || {}),
      [lang]: {
        title:       (typeof s?.title       === "string" ? s.title.trim()       : "") || DEFAULT_SEO_META.sr.title,
        description: (typeof s?.description === "string" ? s.description.trim() : "") || DEFAULT_SEO_META.sr.description,
      },
    };
  }

  if ("countdownTargetIso" in body) {
    const raw = (body.countdownTargetIso || "").trim();
    patch.countdownTargetIso = raw && !Number.isNaN(new Date(raw).getTime()) ? raw : null;
  }

  if ("countdownLabel" in body)
    patch.countdownLabel = (body.countdownLabel || "").trim() || null;

  if ("scratchCoverUrl" in body)
    patch.scratchCoverUrl = (body.scratchCoverUrl || "").trim() || null;

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
          const desktop  = (val.desktop  || "").trim() || null;
          const mobile   = (val.mobile   || "").trim() || null;
          const position = VALID_POS.includes(val.position) ? val.position : null;
          const titleSr  = (val.titleSr  || "").trim() || null;
          const inactive = val.inactive === true ? true : null;
          const theme    = VALID_THEMES.includes(val.theme) ? val.theme : null;
          if (desktop || mobile || position || titleSr || inactive || theme)
            out[key] = { desktop, mobile, position, titleSr, inactive, theme };
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

  revalidateTag("calendar");
  return Response.json({
    bgImageUrl:       row.bgImageUrl       || "/img/bg-calendar.png",
    bgImageUrlMobile: row.bgImageUrlMobile || "/img/bg-calendar-mobile.png",
    monthBackgrounds: row.monthBackgrounds || {},
    calendarPosition: row.calendarPosition || "left",
    calendarTitle:    row.calendarTitle    || { sr: "PRAZNIČNE MISIJE", en: "HOLIDAY MISSIONS" },
    logoUrl:          row.logoUrl          || "/img/meridianbet-ng.png",
    theme:            row.theme            || "default",
    seoMeta:          row.seoMeta          || DEFAULT_SEO_META,
    countdownTargetIso: row.countdownTargetIso || "",
    countdownLabel:     row.countdownLabel     || "",
    leaderboard: {
      enabled: !!row.leaderboard?.enabled,
      feedUrl: row.leaderboard?.feedUrl || "",
    },
    scratchCoverUrl: row.scratchCoverUrl || "/img/scratchCard.png",
  });
}
