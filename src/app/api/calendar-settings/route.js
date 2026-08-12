// src/app/api/calendar-settings/route.js
export const runtime = "nodejs";

import { revalidateTag } from "next/cache";
import prisma from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

const VALID_POS = ["left", "center", "right"];
const VALID_THEMES = ["default", "default-horizontal", "football"];
const DEFAULT_SEO_META = {
  sr: { title: "Kalendar Promocija | Meridianbet", description: "Otkrijte dnevne promocije i iskoristite ekskluzivne nagrade uz Meridianbet Kalendar Promocija." },
};

export async function GET(req) {
  const session = await getAdminFromRequest(req);
  if (!session) return new Response("unauthorized", { status: 401 });

  const row = await prisma.calendarSettings.findFirst();
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
  });
}

export async function PUT(req) {
  const session = await getAdminFromRequest(req);
  if (!session) return new Response("unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({}));

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
    const t = body.calendarTitle;
    patch.calendarTitle = {
      sr: (typeof t?.sr === "string" ? t.sr.trim() : "") || "PRAZNIČNE MISIJE",
      en: (typeof t?.en === "string" ? t.en.trim() : "") || "HOLIDAY MISSIONS",
    };
  }

  if ("theme" in body)
    patch.theme = VALID_THEMES.includes(body.theme) ? body.theme : "default";

  if ("seoMeta" in body) {
    const s = body.seoMeta;
    patch.seoMeta = {
      sr: {
        title:       (typeof s?.sr?.title       === "string" ? s.sr.title.trim()       : "") || DEFAULT_SEO_META.sr.title,
        description: (typeof s?.sr?.description === "string" ? s.sr.description.trim() : "") || DEFAULT_SEO_META.sr.description,
      },
    };
  }

  if ("countdownTargetIso" in body) {
    const raw = (body.countdownTargetIso || "").trim();
    patch.countdownTargetIso = raw && !Number.isNaN(new Date(raw).getTime()) ? raw : null;
  }

  if ("countdownLabel" in body)
    patch.countdownLabel = (body.countdownLabel || "").trim() || null;

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
    where:  { id: 1 },
    update: patch,
    create: { id: 1, ...patch },
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
  });
}
