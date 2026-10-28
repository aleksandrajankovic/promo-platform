// src/app/api/weekly-plan/route.js
export const runtime = "nodejs";

import { revalidateTag } from "next/cache";
import prisma from "@/lib/db";
import { requireAdminMarketOrResponse } from "@/lib/marketScope";
import { sanitizeRichHtml, sanitizeTranslations } from "@/lib/sanitize";
import { sanitizeLink } from "@/lib/validate";
import { getAllowedWeeklyCategories } from "@/lib/calendar/promoCategoryStyles";
import { resolveMonthTheme } from "@/lib/calendar/monthTheme";
import { AUTHOR_INCLUDE, auditEntry, diffPromo, updateAction, weeklyLabel } from "@/lib/audit";
import { EditConflictError, conflictResponse, parseExpectedUpdatedAt } from "@/lib/editConflict";

// GET /api/weekly-plan?year=YYYY&month=MM — u praksi je konzumuje samo admin UI
// (autentifikovan), zato ide kroz isti marketScope kao ostale admin rute.
export async function GET(req) {
  const { market, errorResponse } = await requireAdminMarketOrResponse(req);
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(req.url);
  const year = Number.parseInt(searchParams.get("year") ?? "", 10);
  const month = Number.parseInt(searchParams.get("month") ?? "", 10);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return new Response("Bad params", { status: 400 });
  }

  const rows = await prisma.weeklyPlan.findMany({
    where: { marketId: market.id, year, month },
    orderBy: { weekday: "asc" },
    include: AUTHOR_INCLUDE,
  });

  return Response.json(rows);
}

// PATCH /api/weekly-plan — bulk activate/deactivate svih dana u mesecu
export async function PATCH(req) {
  const { session, market, errorResponse } = await requireAdminMarketOrResponse(req);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  const year = Number.parseInt(body.year, 10);
  const month = Number.parseInt(body.month, 10);
  const { active } = body;

  if (!Number.isInteger(year) || !Number.isInteger(month) || typeof active !== "boolean") {
    return new Response("bad payload", { status: 400 });
  }

  // samo dani kojima se status stvarno menja — po jedan zapis u istoriji
  const rows = await prisma.weeklyPlan.findMany({
    where: { marketId: market.id, year, month, active: !active },
    select: { id: true, year: true, month: true, weekday: true, title: true },
  });
  await prisma.$transaction([
    prisma.weeklyPlan.updateMany({
      where: { id: { in: rows.map((r) => r.id) } },
      data: { active, updatedById: session.adminId },
    }),
    prisma.promoAuditLog.createMany({
      data: rows.map((r) =>
        auditEntry({
          session, marketId: market.id, entity: "weekly", entityId: r.id,
          action: active ? "activate" : "deactivate", label: weeklyLabel(r),
        })
      ),
    }),
  ]);

  revalidateTag("calendar", { expire: 0 });
  return Response.json({ updated: rows.length });
}

export async function PUT(req) {
  const { session, market, errorResponse } = await requireAdminMarketOrResponse(req);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  const year = Number.parseInt(body.year, 10);
  const month = Number.parseInt(body.month, 10);
  const weekday = Number.parseInt(body.weekday, 10);

  const MIN_YEAR = 2024, MAX_YEAR = new Date().getFullYear() + 5;
  if (
    !Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR ||
    !Number.isInteger(month) || month < 0 || month > 11 ||
    !Number.isInteger(weekday) || weekday < 0 || weekday > 6
  ) {
    return new Response("Bad payload", { status: 400 });
  }

  const {
    icon, link, buttonColor, active, scratch, flipCard,
    title, button, rich, richHtml,
    translations: rawTranslations, defaultLang, category,
  } = body;

  const theme = await resolveMonthTheme(market.id, year, month);
  const allowed = getAllowedWeeklyCategories(theme);
  if (category && !allowed.includes(category)) {
    return new Response(`category "${category}" not allowed outside football theme`, { status: 400 });
  }

  const translations = rawTranslations || {};
  const mainLang = defaultLang || market.defaultLocale || "sr";
  const mainT = translations[mainLang] || {};

  const data = {
    marketId: market.id,
    year, month, weekday,
    title: mainT.title ?? title ?? "",
    button: mainT.button ?? button ?? "",
    rich: mainT.rich ?? rich ?? null,
    richHtml: sanitizeRichHtml(mainT.richHtml ?? richHtml ?? null),
    link: sanitizeLink(mainT.link ?? link ?? ""),
    icon: icon ?? null,
    active: Boolean(active ?? true),
    scratch: !!scratch,
    flipCard: !!flipCard,
    buttonColor: buttonColor || "green",
    translations: sanitizeTranslations(translations),
    category: category || "ALL",
  };

  const where = { marketId_year_month_weekday: { marketId: market.id, year, month, weekday } };
  const existing = await prisma.weeklyPlan.findUnique({ where });

  // editor je video stanje dana (prazan ili sa updatedAt); ako se razlikuje
  // od trenutnog, neko je u međuvremenu snimio/obrisao — 409, bez upisa
  const expected = parseExpectedUpdatedAt(body);
  const sawEmpty = expected === null;
  if (expected !== undefined && (sawEmpty ? !!existing : !existing)) {
    return conflictResponse(existing && (await prisma.weeklyPlan.findUnique({ where, include: AUTHOR_INCLUDE })));
  }

  let row;
  try {
    row = await prisma.$transaction(async (tx) => {
      if (!existing) {
        const created = await tx.weeklyPlan.create({
          data: { ...data, createdById: session.adminId, updatedById: session.adminId },
          include: AUTHOR_INCLUDE,
        });
        await tx.promoAuditLog.create({
          data: auditEntry({
            session, marketId: market.id, entity: "weekly", entityId: created.id,
            action: "create", label: weeklyLabel(created),
          }),
        });
        return created;
      }

      const changes = diffPromo(existing, data);
      const { count } = await tx.weeklyPlan.updateMany({
        where: { id: existing.id, ...(expected && { updatedAt: expected }) },
        data: { ...data, updatedById: session.adminId },
      });
      if (count === 0) throw new EditConflictError();
      const updated = await tx.weeklyPlan.findUnique({ where: { id: existing.id }, include: AUTHOR_INCLUDE });
      if (Object.keys(changes).length) {
        await tx.promoAuditLog.create({
          data: auditEntry({
            session, marketId: market.id, entity: "weekly", entityId: updated.id,
            action: updateAction(changes), label: weeklyLabel(updated), changes,
          }),
        });
      }
      return updated;
    });
  } catch (err) {
    // istovremeno kreiranje istog dana pada na unique ograničenju (P2002)
    if (!(err instanceof EditConflictError) && err?.code !== "P2002") throw err;
    return conflictResponse(await prisma.weeklyPlan.findUnique({ where, include: AUTHOR_INCLUDE }));
  }

  revalidateTag("calendar", { expire: 0 });
  return Response.json(row);
}

export async function DELETE(req) {
  const { session, market, errorResponse } = await requireAdminMarketOrResponse(req);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  const year = Number.parseInt(body.year, 10);
  const month = Number.parseInt(body.month, 10);
  const weekday = Number.parseInt(body.weekday, 10);

  if (
    ![year, month, weekday].every(Number.isInteger) ||
    weekday < 0 || weekday > 6
  ) {
    return new Response("Bad payload", { status: 400 });
  }

  const where = { marketId_year_month_weekday: { marketId: market.id, year, month, weekday } };
  const existing = await prisma.weeklyPlan.findUnique({ where });
  if (!existing) return new Response(null, { status: 204 });

  try {
    await prisma.$transaction([
      prisma.weeklyPlan.delete({ where }),
      prisma.promoAuditLog.create({
        data: auditEntry({
          session, marketId: market.id, entity: "weekly", entityId: existing.id,
          action: "delete", label: weeklyLabel(existing),
        }),
      }),
    ]);
  } catch (err) {
    // P2025 = već ne postoji — i dalje vraćamo 204. Svaka druga greška mora
    // da se propagira, ne da se tiho prikaže adminu kao uspešno brisanje.
    if (err?.code !== "P2025") throw err;
  }

  revalidateTag("calendar", { expire: 0 });
  return new Response(null, { status: 204 });
}
