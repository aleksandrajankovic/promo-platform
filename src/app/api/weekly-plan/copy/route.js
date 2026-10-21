// POST /api/weekly-plan/copy { year, month } — kopira Weekly Plan prethodnog
// meseca u dati mesec kao neaktivne nacrte; postojeći dani se ne diraju.
export const runtime = "nodejs";

import { revalidateTag } from "next/cache";
import prisma from "@/lib/db";
import { requireAdminMarketOrResponse } from "@/lib/marketScope";
import { getAllowedWeeklyCategories } from "@/lib/calendar/promoCategoryStyles";
import { resolveMonthTheme } from "@/lib/calendar/monthTheme";
import { planWeeklyCopy, previousMonth } from "@/lib/calendar/weeklyCopy";
import { AUTHOR_INCLUDE, auditEntry, weeklyLabel } from "@/lib/audit";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function POST(req) {
  const { session, market, errorResponse } = await requireAdminMarketOrResponse(req);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  const year = Number.parseInt(body.year, 10);
  const month = Number.parseInt(body.month, 10);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 0 || month > 11) {
    return new Response("Bad payload", { status: 400 });
  }

  const from = previousMonth(year, month);
  const fromLabel = `${MONTHS[from.month]} ${from.year}`;
  const [sourceRows, targetRows, theme] = await Promise.all([
    prisma.weeklyPlan.findMany({ where: { marketId: market.id, year: from.year, month: from.month } }),
    prisma.weeklyPlan.findMany({ where: { marketId: market.id, year, month }, select: { weekday: true } }),
    resolveMonthTheme(market.id, year, month),
  ]);
  if (!sourceRows.length) return new Response(`${fromLabel} has no weekly promotions to copy.`, { status: 404 });

  const plan = planWeeklyCopy({
    sourceRows, targetRows, year, month, marketId: market.id,
    allowedCategories: getAllowedWeeklyCategories(theme),
  });

  const created = await prisma.$transaction(async (tx) => {
    const rows = [];
    for (const data of plan) {
      const row = await tx.weeklyPlan.create({
        data: { ...data, createdById: session.adminId, updatedById: session.adminId },
        include: AUTHOR_INCLUDE,
      });
      await tx.promoAuditLog.create({
        data: auditEntry({
          session, marketId: market.id, entity: "weekly", entityId: row.id,
          action: "create", label: `${weeklyLabel(row)} (copied from ${fromLabel})`,
        }),
      });
      rows.push(row);
    }
    return rows;
  });

  // kopije su neaktivne, javni kalendar se ne menja; keš se osvežava kao i
  // posle svake druge izmene, radi doslednosti
  revalidateTag("calendar", { expire: 0 });
  return Response.json({ created, fromLabel, skipped: sourceRows.length - plan.length });
}
