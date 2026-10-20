import { Roboto, Roboto_Condensed} from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { headers } from "next/headers";
import { resolveMarketByHostCached } from "@/lib/marketScope";
import { getBaseUrl, getMainSiteUrl } from "@/lib/calendar/calendarPage";

// Dinamičko po host-u (resolveMarketByHost) — eksplicitno, ne oslanjati se na
// implicitno ponašanje headers()/cookies() poziva.
export const dynamic = "force-dynamic";

// Root layout nema pristup route params-ima u App Router-u, pa ne zna koji je
// stvarni jezik trenutne stranice (npr. TZ-ova /en/... ruta) — middleware.js
// prosleđuje prvi path segment kroz x-first-segment header; ovde se proverava
// protiv market.locales pre upotrebe, ne veruje se slepo.
function resolveLocale(market, firstSegment) {
  const defaultLocale = market?.defaultLocale || "sr";
  if (firstSegment && market?.locales?.includes(firstSegment)) return firstSegment;
  return defaultLocale;
}

const DEFAULT_TITLE_BY_LOCALE = {
  sr: "Kalendar Promocija | Meridianbet",
  en: "Promo Calendar | Meridianbet",
};
const DEFAULT_DESCRIPTION_BY_LOCALE = {
  sr: "Budite u toku sa dnevnim ponudama, otkrijte nove promocije i iskoristite ekskluzivne nagrade uz Meridianbet Kalendar Promocija.",
  en: "Stay up to date with daily offers, discover new promotions, and claim exclusive rewards with the Meridianbet Promo Calendar.",
};

const roboto = Roboto({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
});
const robotoCondensed = Roboto_Condensed({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto-condensed",
});

export async function generateMetadata() {
  const h = await headers();
  const market = await resolveMarketByHostCached(h.get("host"), h.get("cookie"));
  const baseUrl = getBaseUrl(market);
  const lang = resolveLocale(market, h.get("x-first-segment"));
  const title = DEFAULT_TITLE_BY_LOCALE[lang] || DEFAULT_TITLE_BY_LOCALE.sr;
  const description = DEFAULT_DESCRIPTION_BY_LOCALE[lang] || DEFAULT_DESCRIPTION_BY_LOCALE.sr;

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    alternates: { canonical: "/" },
    openGraph: {
      title,
      description,
      url: "/",
      siteName: "Meridianbet",
      images: [
        {
          url: "https://cloud.merbet.com/Preview-image/calendar-universal.png",
          width: 1200,
          height: 630,
          alt: "Kalendar Promocija",
        },
      ],
      locale: lang,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://cloud.merbet.com/Preview-image/calendar-universal.png"],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function RootLayout({ children }) {
  const h = await headers();
  const market = await resolveMarketByHostCached(h.get("host"), h.get("cookie"));
  const baseUrl = getBaseUrl(market);
  const lang = resolveLocale(market, h.get("x-first-segment"));

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Meridianbet",
    url: getMainSiteUrl(market),
    logo: `${baseUrl}/img/meridianbet-ng.png`,
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Kalendar Promocija | Meridianbet",
    url: `${baseUrl}/`,
    inLanguage: lang,
  };

  return (
    <html lang={lang}>
      <head>
        {market && (
          <>
            <script
              type="application/ld+json"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
            />
            <script
              type="application/ld+json"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
            />
          </>
        )}
      </head>
      <body
        className={`${roboto.variable} ${robotoCondensed.variable} min-h-screen`}
      >
        {children}
        <Toaster
          position="top-right"
          toastOptions={{ style: { background: "#fff", color: "#333" } }}
        />
      </body>
    </html>
  );
}
