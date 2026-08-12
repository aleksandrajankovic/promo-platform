// src/lib/sanitize.js
import sanitizeHtml from "sanitize-html";
import { sanitizeLink } from "@/lib/validate";

const ALLOWED_TAGS = [
  // tekst
  "p", "br", "b", "i", "em", "strong", "u", "s", "span",
  // naslovi
  "h1", "h2", "h3", "h4",
  // liste
  "ul", "ol", "li",
  // linkovi i slike
  "a", "img",
  // layout
  "div",
];

const ALLOWED_ATTRIBUTES = {
  a: ["href", "target", "rel"],
  img: ["src", "alt", "width", "height", "style"],
  div: ["style"],
  span: ["style", "data-fs", "data-color"],
  p: ["style"],
  h1: ["style"],
  h2: ["style"],
  h3: ["style"],
  h4: ["style"],
  li: ["style"],
};

export function sanitizeRichHtml(html) {
  if (!html || typeof html !== "string") return null;

  const clean = sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    // force rel="noopener noreferrer" na sve linkove
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          rel: "noopener noreferrer",
          target: attribs.target || "_blank",
        },
      }),
    },
  });

  return clean || null;
}

// Čitanje uvek preferira translations[lang].richHtml/link nad "ravnim" poljima na redu
// (vidi getTextFromTranslations u lib/calendar/calendarPage.js) — pa ceo translations
// objekat mora biti sanitizovan po jeziku pre upisa u bazu, ne samo ravna polja.
export function sanitizeTranslations(translations) {
  if (!translations || typeof translations !== "object") return null;

  const out = {};
  for (const [lang, t] of Object.entries(translations)) {
    if (!t || typeof t !== "object") continue;
    out[lang] = {
      ...t,
      richHtml: sanitizeRichHtml(t.richHtml ?? null),
      link: sanitizeLink(t.link ?? ""),
    };
  }

  return Object.keys(out).length ? out : null;
}

// Uklanja opasne konstrukte iz uploadovanog SVG-a (<script>, on*= handlere,
// javascript:/data: linkove) bez re-parsiranja/re-serijalizacije dokumenta —
// namerno string-based, jer parseri zasnovani na HTML5 (npr. sanitize-html)
// lowercase-uju atribute poput viewBox/preserveAspectRatio i tako lome SVG.
export function sanitizeSvg(svgText) {
  if (!svgText || typeof svgText !== "string") return null;

  let out = svgText;
  out = out.replace(/<script[\s\S]*?<\/script\s*>/gi, "");
  out = out.replace(/<script\b[^>]*>/gi, ""); // fallback za nezatvorene tagove
  out = out.replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
  out = out.replace(/((?:xlink:)?href|src)\s*=\s*"\s*(?:javascript|data):[^"]*"/gi, "");
  out = out.replace(/((?:xlink:)?href|src)\s*=\s*'\s*(?:javascript|data):[^']*'/gi, "");

  return out;
}
