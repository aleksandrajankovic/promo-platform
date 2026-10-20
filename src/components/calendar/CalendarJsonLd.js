// src/components/calendar/CalendarJsonLd.js
import { isDateLocked } from "@/lib/calendar/calendarGridHelpers";

function pad(n) {
  return String(n).padStart(2, "0");
}

export default function CalendarJsonLd({ specials = [], baseUrl, mainSiteUrl, timezone = "Europe/Belgrade" }) {
  const offers = specials
    .filter((s) => s.active && s.title)
    // Ne otkrivaj zaključane (buduće) dane u structured data-i — isto pravilo
    // kao "daily reveal" mehanika na samoj stranici (vidi isLocked u
    // calendarGridHelpers.js). Bez ovoga bi Google video sutrašnju promociju
    // pre nego što je iko od korisnika vidi.
    .filter((s) => !isDateLocked(s.year, s.month, s.day, timezone))
    .map((s) => {
      const date = `${s.year}-${pad(s.month + 1)}-${pad(s.day)}`;
      const offer = {
        "@type": "Offer",
        name: s.title,
        validFrom: date,
        validThrough: date,
        url: s.link && s.link !== "#" ? s.link : baseUrl,
        seller: {
          "@type": "Organization",
          name: "Meridianbet",
          url: mainSiteUrl,
        },
      };
      return offer;
    });

  if (!offers.length) return null;

  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: offers.map((offer, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: offer,
    })),
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
