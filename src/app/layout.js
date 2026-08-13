import { Roboto, Roboto_Condensed} from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { headers } from "next/headers";
import { resolveMarketByHost } from "@/lib/marketScope";
import { getBaseUrl, getMainSiteUrl } from "@/lib/calendar/calendarPage";

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

const DEFAULT_TITLE = "Kalendar Promocija | Meridianbet";
const DEFAULT_DESCRIPTION =
  "Budite u toku sa dnevnim ponudama, otkrijte nove promocije i iskoristite ekskluzivne nagrade uz Meridianbet Kalendar Promocija.";

export async function generateMetadata() {
  const h = await headers();
  const market = await resolveMarketByHost(h.get("host"), h.get("cookie"));
  const baseUrl = getBaseUrl(market);
  const lang = market?.defaultLocale || "sr";

  return {
    metadataBase: new URL(baseUrl),
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    alternates: { canonical: "/" },
    openGraph: {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
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
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
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
  const market = await resolveMarketByHost(h.get("host"), h.get("cookie"));
  const baseUrl = getBaseUrl(market);
  const lang = market?.defaultLocale || "sr";

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
