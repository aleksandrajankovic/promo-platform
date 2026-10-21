// src/lib/marketScope.js
// Centralno mesto koje odlučuje "za koje tržište je ovaj request" —
// za javne stranice po hostname-u, za admin rute po sesiji (+ eksplicitni
// izbor za super admina, preko ?market= ili admin_market kolačića).
import { cache } from "react";
import { unstable_cache } from "next/cache";
import prisma from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { withRetry } from "@/lib/withRetry";

export class MarketScopeError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function getCookieValue(cookieHeader, name) {
  const header = cookieHeader || "";
  const match = header.match(new RegExp(`${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// Tržište po domenu/kodu se praktično ne menja (seed skripta), a traži se na
// svakom javnom zahtevu — keš između zahteva, osvežava se na 5 minuta.
const MARKET_CACHE = { revalidate: 300, tags: ["markets"] };
const findMarketByDomain = unstable_cache(
  (domain) => withRetry(() => prisma.market.findUnique({ where: { domain } })),
  ["market-by-domain"],
  MARKET_CACHE
);
const findMarketByCode = unstable_cache(
  (code) => withRetry(() => prisma.market.findUnique({ where: { code } })),
  ["market-by-code"],
  MARKET_CACHE
);

// Javne stranice (kalendar, sitemap) — tržište se određuje po domenu na koji
// je request stigao. To je i jedino relevantno u produkciji: svaki market ima
// svoj pravi domen, ne postoji "biranje" tržišta na javnoj strani.
//
// Van produkcije (lokalni razvoj, gde host uvek ostaje localhost) dodata su
// dva fallback-a, u redosledu: (1) admin_market kolačić — da front lokalno
// prati tržište koje trenutno biraš u admin market switcher-u, bez potrebe
// da se .env menja i server restartuje za svaku proveru; (2) DEV_DEFAULT_MARKET
// iz .env, ako kolačić uopšte nije postavljen. Nijedan od ova dva fallback-a
// se ne primenjuje kad je NODE_ENV=production — pravi posetioci nikad ne bi
// smeli da im admin kolačić (ako ga slučajno imaju) promeni šta vide.
export async function resolveMarketByHost(hostHeader, cookieHeader) {
  const hostname = (hostHeader || "").split(":")[0].toLowerCase();

  // Ovo je efektivno PRVI DB upit na svakom javnom zahtevu (pre calendarSettings
  // u loadCalendarPageData) — withRetry ovde štiti od Neon cold-start-a isto
  // kao i dalje u lancu, jer bez ovoga prvi request posle neaktivnosti baze puca
  // ovde, pre nego što uopšte stigne do već zaštićenog koda.
  let market = hostname ? await findMarketByDomain(hostname) : null;

  if (!market && process.env.NODE_ENV !== "production") {
    const cookieCode = getCookieValue(cookieHeader, "admin_market");
    if (cookieCode) {
      market = await findMarketByCode(cookieCode);
    }
  }

  if (!market && process.env.DEV_DEFAULT_MARKET) {
    market = await findMarketByCode(process.env.DEV_DEFAULT_MARKET);
  }

  return market;
}

// resolveMarketByHost se poziva do 4× po javnom page load-u (layout metadata,
// layout render, page metadata, page render) sa istim (host, cookie) parom —
// cache() dedupuje sve pozive u istom requestu na jedan DB upit. Isti pattern
// koji promo/[iso]/[slug]/page.js već koristi za svoj resolveDayEntry.
export const resolveMarketByHostCached = cache(resolveMarketByHost);

// Učitava admina iz baze za sesiju iz kolačića i proverava da ta sesija još
// važi — jedino mesto gde se to radi, koriste ga sve admin rute:
// - nalog postoji (role/tržišta se uvek čitaju sveže, ne iz JWT-a)
// - sesija je izdata posle poslednje promene/reseta lozinke
// - super admin, i svaki nalog sa uključenom 2FA, mora imati sesiju potvrđenu
//   kodom (mfa u tokenu) — stari tokeni bez toga više ne prolaze
// - nalog sa privremenom lozinkom sme samo na promenu lozinke
//   (allowPasswordChange: true za /api/admin/me i /api/admin/account/*)
export async function loadSessionAdmin(req, { allowPasswordChange = false } = {}) {
  const session = await getAdminFromRequest(req);
  if (!session) throw new MarketScopeError("unauthorized", 401);

  const admin = await withRetry(() =>
    prisma.adminUser.findUnique({
      where: { id: session.adminId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        mustChangePassword: true,
        passwordChangedAt: true,
        totpEnabled: true,
        markets: { orderBy: { code: "asc" } },
      },
    })
  );
  if (!admin) throw new MarketScopeError("unauthorized", 401);

  // iat je u sekundama; token izdat u istoj sekundi kad i promena (nova sesija
  // posle promene lozinke) mora da prođe, zato poređenje po sekundama
  if (admin.passwordChangedAt && (session.iat ?? 0) < Math.floor(admin.passwordChangedAt.getTime() / 1000)) {
    throw new MarketScopeError("session expired", 401);
  }
  if ((admin.role === "SUPER_ADMIN" || admin.totpEnabled) && !session.mfa) {
    throw new MarketScopeError("two-factor authentication required", 401);
  }
  if (admin.mustChangePassword && !allowPasswordChange) {
    throw new MarketScopeError("password change required", 403);
  }

  return { session: { ...session, role: admin.role, name: admin.name }, admin };
}

// Admin/API rute — vraća { session, market }. Izbor tržišta dolazi iz
// ?market= (eksplicitno) ili admin_market kolačića (zapamćen izbor iz market
// switcher-a), u tom redosledu prioriteta. SUPER_ADMIN može da izabere bilo
// koje tržište; ADMIN samo neko od svojih dodeljenih — eksplicitan ?market=
// van te liste je 403, a zastareo/tuđ kolačić (ili nikakav izbor) pada na
// prvo dodeljeno tržište.
//
// role/tržišta se NE veruju iz JWT payload-a — čitaju se sveže iz baze na
// svaki poziv. Token može da živi do 8h; ako se admin-u u međuvremenu
// promene tržišta (ili ga neko unapredi u super admina), promena mora da
// važi odmah, ne tek posle ponovnog logina.
export async function requireAdminMarket(req) {
  const { session, admin } = await loadSessionAdmin(req);

  const { searchParams } = new URL(req.url);
  const explicitCode = searchParams.get("market");
  const cookieCode = getCookieValue(req.headers.get("cookie"), "admin_market");

  if (admin.role !== "SUPER_ADMIN") {
    if (!admin.markets.length) {
      throw new MarketScopeError("admin has no assigned market", 403);
    }
    if (explicitCode) {
      const market = admin.markets.find((m) => m.code === explicitCode);
      if (!market) throw new MarketScopeError("Forbidden", 403);
      return { session, market };
    }
    const market = admin.markets.find((m) => m.code === cookieCode) || admin.markets[0];
    return { session, market };
  }

  const code = explicitCode || cookieCode;
  if (!code) {
    throw new MarketScopeError("super admin must specify ?market=", 400);
  }

  const market = await withRetry(() => prisma.market.findUnique({ where: { code } }));
  if (!market) throw new MarketScopeError("unknown market", 404);
  return { session, market };
}

// Body polje marketIds (user management) -> očišćen niz jedinstvenih id-jeva.
export function normalizeMarketIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((id) => String(id || "").trim()).filter(Boolean))];
}

// Rute koje nisu market-scoped (npr. upravljanje admin nalozima) ali i dalje
// treba da provere ulogu — ista logika, sveže iz baze, ne iz JWT-a.
export async function requireSuperAdminSession(req) {
  const { session, admin } = await loadSessionAdmin(req);
  if (admin.role !== "SUPER_ADMIN") throw new MarketScopeError("Forbidden", 403);
  return session;
}

// Rute za sopstveni nalog (lozinka, 2FA) — svaki ulogovan admin, uključujući
// i onog koji tek treba da promeni privremenu lozinku.
export async function requireAccountSessionOrResponse(req) {
  try {
    return await loadSessionAdmin(req, { allowPasswordChange: true });
  } catch (err) {
    if (err instanceof MarketScopeError) {
      return { errorResponse: new Response(err.message, { status: err.status }) };
    }
    throw err;
  }
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

// Isto kao requireSuperAdminSession, ali vraća Response umesto da baci grešku.
export async function requireSuperAdminSessionOrResponse(req) {
  try {
    return { session: await requireSuperAdminSession(req) };
  } catch (err) {
    if (err instanceof MarketScopeError) {
      return { errorResponse: new Response(err.message, { status: err.status }) };
    }
    throw err;
  }
}
