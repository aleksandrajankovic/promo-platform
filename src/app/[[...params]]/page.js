// src/app/[[...params]]/page.js
// Jedina ruta za javni kalendar. Next.js ne dozvoljava dva dinamička segmenta
// sa različitim imenima na istom nivou ([year] i [locale] ne mogu da budu
// susedi), pa se i "/", "/[year]/[month]", "/[locale]" i "/[locale]/[year]/[month]"
// parsiraju ovde na osnovu broja i oblika segmenata. Default jezik tržišta
// nikad ne dobija prefiks (isti URL-ovi kao pre); svaki drugi jezik dobija
// pravi path segment, ne query param — vidi calendarUrls.localeMonthHref.
import { notFound, redirect, permanentRedirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import CalendarPageView from "@/components/calendar/CalendarPageView";
import { resolveMarketByHostCached } from "@/lib/marketScope";
import {
  buildCalendarMetadata,
  loadCalendarPageData,
  monthFromUrl,
  isValidYear,
  isValidMonth,
  isCurrentMonth,
  localeMonthHref,
} from "@/lib/calendar/calendarPage";

// Eksplicitno - danas dinamicko samo posredno preko headers()/cookies()
// poziva ispod; ruta zavisi od host header-a (market po domenu), pa buduca
// izmena koja ukloni te pozive ne sme tiho da ukljuci full-route cache.
export const dynamic = "force-dynamic";

const isNumeric = (s) => /^\d+$/.test(s);

// Vraća { locale, year, month } (year/month su URL-oblika, 1-12) ili null ako
// oblik segmenata ne odgovara nijednoj poznatoj ruti.
function parseSegments(segs) {
  if (segs.length === 0) return { locale: null, year: null, month: null };

  if (segs.length === 1) {
    if (isNumeric(segs[0])) return null; // gola godina bez meseca — nema smisla
    return { locale: segs[0], year: null, month: null };
  }

  if (segs.length === 2) {
    if (isNumeric(segs[0]) && isNumeric(segs[1])) {
      return { locale: null, year: Number(segs[0]), month: Number(segs[1]) };
    }
    return null;
  }

  if (segs.length === 3) {
    if (!isNumeric(segs[0]) && isNumeric(segs[1]) && isNumeric(segs[2])) {
      return { locale: segs[0], year: Number(segs[1]), month: Number(segs[2]) };
    }
    return null;
  }

  return null;
}

// Rešava sve zajedničko za generateMetadata i samu stranicu: market, locale,
// validaciju i konačan (year, month) u internom (0-11) obliku.
async function resolveRequest(paramsPromise, hostHeader, cookieHeader) {
  const p = await paramsPromise;
  const segs = p?.params || [];
  const parsed = parseSegments(segs);
  if (!parsed) return { notFound: true };

  const market = await resolveMarketByHostCached(hostHeader, cookieHeader);
  if (!market) return { notFound: true };

  const locales = market.locales?.length ? market.locales : [market.defaultLocale || "sr"];
  const defaultLocale = market.defaultLocale || locales[0];

  if (parsed.locale) {
    if (!locales.includes(parsed.locale)) return { notFound: true };
    if (parsed.locale === defaultLocale) {
      // Default jezik ne sme da živi i na svom prefiksu — dva URL-a za isti
      // sadržaj je upravo ono što je ovaj dizajn trebalo da izbegne.
      const year = parsed.year != null ? parsed.year : null;
      const month = parsed.month != null ? monthFromUrl(parsed.month) : null;
      const now = new Date();
      const target =
        year != null && month != null
          ? localeMonthHref(null, defaultLocale, year, month, now)
          : "/";
      return { redirectTo: target };
    }
  }

  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();

  if (parsed.year != null) {
    const urlMonth = parsed.month;
    const parsedMonth = monthFromUrl(urlMonth);
    if (!isValidYear(parsed.year) || !isValidMonth(parsedMonth)) return { notFound: true };
    year = parsed.year;
    month = parsedMonth;

    // Tekući mesec ima kanonski URL bez eksplicitnog [year]/[month] — izbegavamo duplikat.
    if (isCurrentMonth(year, month, now)) {
      return { redirectTo: localeMonthHref(parsed.locale, defaultLocale, year, month, now) };
    }
  }

  const lang = parsed.locale || defaultLocale;
  return { market, year, month, lang, defaultLocale };
}

export async function generateMetadata({ params }) {
  const h = await headers();
  const resolved = await resolveRequest(params, h.get("host"), h.get("cookie"));
  if (resolved.notFound || resolved.redirectTo) return {};
  return buildCalendarMetadata(resolved.market, resolved.year, resolved.month, resolved.lang);
}

export default async function CalendarPage({ params, searchParams }) {
  const h = await headers();
  const resolved = await resolveRequest(params, h.get("host"), h.get("cookie"));

  if (resolved.notFound) notFound();
  if (resolved.redirectTo) redirect(resolved.redirectTo);

  const { market, year, month, lang, defaultLocale } = resolved;

  const sp = await searchParams;

  const locales = market.locales?.length ? market.locales : [defaultLocale];
  const langRaw = Array.isArray(sp?.lang) ? sp.lang[0] : sp?.lang;
  const validLang = langRaw && locales.includes(langRaw) ? langRaw : null;

  // Legacy podrška: stari linkovi tipa /?y=2026&m=5[&lang=en] (samo na "/", bez
  // segmenata) — trajan (308) redirect, isto obrazloženje kao ?lang= blok ispod:
  // ne gubi SEO rang koji je Google već možda dodelio starim URL-ovima. lang se
  // čita OVDE (ranije se gubio jer je ovaj blok redirect-ovao pre nego što se
  // stiglo do posebne ?lang= provere, pa je /?y=..&lang=en tiho padao na default).
  const yRaw = Array.isArray(sp?.y) ? sp.y[0] : sp?.y;
  const mRaw = Array.isArray(sp?.m) ? sp.m[0] : sp?.m;
  if (yRaw !== undefined || mRaw !== undefined) {
    const y = Number.parseInt(yRaw, 10);
    const m = Number.parseInt(mRaw, 10);
    if (isValidYear(y) && isValidMonth(m)) {
      permanentRedirect(localeMonthHref(validLang, defaultLocale, y, m));
    }
  }

  // Legacy podrška: TZ/CY su ranije birali jezik preko ?lang=en na golom URL-u —
  // trajan (308) redirect na novi /en/... oblik.
  if (validLang) {
    permanentRedirect(localeMonthHref(validLang, defaultLocale, year, month));
  }

  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("admin_auth");
  const isAdmin = !!adminCookie?.value;

  const data = await loadCalendarPageData({ market, year, month, isAdmin, lang });

  return (
    <CalendarPageView
      year={year}
      month={month}
      isAdmin={isAdmin}
      lang={lang}
      locale={lang}
      defaultLocale={defaultLocale}
      locales={locales}
      today={new Date()}
      {...data}
    />
  );
}
