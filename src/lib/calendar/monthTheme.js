// src/lib/calendar/monthTheme.js
// Samo za server (API rute) — namerno odvojeno od promoCategoryStyles.js, koji
// uvoze i klijentske komponente; Prisma import tamo bi završio u browser bundle-u.
import prisma from "@/lib/db";

// Deljeno između special/route.js i weekly-plan/route.js — koje kategorije su
// dozvoljene zavisi od teme meseca (per-month override > global default).
export async function resolveMonthTheme(marketId, year, month) {
  const settings = await prisma.calendarSettings.findUnique({ where: { marketId } });
  const monthBg = settings?.monthBackgrounds?.[`${year}-${month}`];
  return monthBg?.theme || settings?.theme || "default";
}
