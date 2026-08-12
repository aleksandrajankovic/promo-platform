// src/components/CalendarJsonLd.js
import { BASE_URL } from "@/lib/calendar/calendarPage";

function pad(n) {
  return String(n).padStart(2, "0");
}

export default function CalendarJsonLd({ specials = [] }) {
  const events = specials
    .filter((s) => s.active && s.title)
    .map((s) => {
      const date = `${s.year}-${pad(s.month + 1)}-${pad(s.day)}`;
      const event = {
        "@type": "Event",
        name: s.title,
        startDate: date,
        endDate: date,
        eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
        eventStatus: "https://schema.org/EventScheduled",
        location: {
          "@type": "VirtualLocation",
          url: BASE_URL,
        },
        organizer: {
          "@type": "Organization",
          name: "Meridianbet",
          url: "https://meridianbet.rs",
        },
      };
      if (s.link && s.link !== "#") event.url = s.link;
      return event;
    });

  if (!events.length) return null;

  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: events.map((event, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: event,
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
