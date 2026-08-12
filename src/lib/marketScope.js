// src/lib/marketScope.js
// Centralno mesto koje odlučuje "za koje tržište je ovaj request" —
// za javne stranice po hostname-u, za admin rute po sesiji (+ eksplicitni
// izbor za super admina, preko ?market= ili admin_market kolačića).
import prisma from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export class MarketScopeError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// Javne stranice (kalendar, sitemap) — tržište se određuje po domenu na koji
// je request stigao. DEV_DEFAULT_MARKET je fallback za lokalni razvoj gde
// hostname (localhost) ne odgovara nijednom pravom Market.domain.
export async function resolveMarketByHost(hostHeader) {
  const hostname = (hostHeader || "").split(":")[0].toLowerCase();

  let market = hostname
    ? await prisma.market.findUnique({ where: { domain: hostname } })
    : null;

  if (!market && process.env.DEV_DEFAULT_MARKET) {
    market = await prisma.market.findUnique({
      where: { code: process.env.DEV_DEFAULT_MARKET },
    });
  }

  return market;
}

function getCookie(req, name) {
  const header = req.headers.get("cookie") || "";
  const match = header.match(new RegExp(`${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// Admin/API rute — vraća { session, market }. Za ADMIN, market je uvek
// session.marketId (klijent ne može da ga promeni). Za SUPER_ADMIN, market
// dolazi iz ?market= (eksplicitno) ili admin_market kolačića (zapamćen izbor
// iz market switcher-a), u tom redosledu prioriteta.
//
// role/marketId se NE veruju iz JWT payload-a — čitaju se sveže iz baze na
// svaki poziv. Token može da živi do 8h; ako se admin-u u međuvremenu
// promeni tržište (ili ga neko unapredi u super admina), promena mora da
// važi odmah, ne tek posle ponovnog logina.
export async function requireAdminMarket(req) {
  const session = await getAdminFromRequest(req);
  if (!session) throw new MarketScopeError("unauthorized", 401);

  const admin = await prisma.adminUser.findUnique({
    where: { id: session.adminId },
    select: { role: true, marketId: true },
  });
  if (!admin) throw new MarketScopeError("unauthorized", 401);

  if (admin.role !== "SUPER_ADMIN") {
    if (!admin.marketId) {
      throw new MarketScopeError("admin has no assigned market", 403);
    }
    const market = await prisma.market.findUnique({ where: { id: admin.marketId } });
    if (!market) throw new MarketScopeError("assigned market not found", 500);
    return { session: { ...session, role: admin.role, marketId: admin.marketId }, market };
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("market") || getCookie(req, "admin_market");
  if (!code) {
    throw new MarketScopeError("super admin must specify ?market=", 400);
  }

  const market = await prisma.market.findUnique({ where: { code } });
  if (!market) throw new MarketScopeError("unknown market", 404);
  return { session, market };
}

// Rute koje nisu market-scoped (npr. upravljanje admin nalozima) ali i dalje
// treba da provere ulogu — ista logika, sveže iz baze, ne iz JWT-a.
export async function requireSuperAdminSession(req) {
  const session = await getAdminFromRequest(req);
  if (!session) throw new MarketScopeError("unauthorized", 401);

  const admin = await prisma.adminUser.findUnique({
    where: { id: session.adminId },
    select: { role: true },
  });
  if (!admin) throw new MarketScopeError("unauthorized", 401);
  if (admin.role !== "SUPER_ADMIN") throw new MarketScopeError("Forbidden", 403);

  return session;
}

// Isto kao requireAdminMarket, ali vraća Response umesto da baci grešku —
// zgodno za rute koje žele jednolinijski early-return.
export async function requireAdminMarketOrResponse(req) {
  try {
    return await requireAdminMarket(req);
  } catch (err) {
    if (err instanceof MarketScopeError) {
      return { errorResponse: new Response(err.message, { status: err.status }) };
    }
    throw err;
  }
}
