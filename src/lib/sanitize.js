// src/lib/sanitize.js
import sanitizeHtml from "sanitize-html";
import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import { sanitizeLink } from "@/lib/validate";

// Jedna DOMPurify instanca za ceo proces — jsdom window se pravi jednom pri
// učitavanju modula, ne po zahtevu (ovo je long-lived Node proces u Docker-u,
// ne serverless/edge, pa nema cold-start cene po pozivu).
const svgPurify = DOMPurify(new JSDOM("").window);

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

// Uklanja opasne konstrukte iz uploadovanog SVG-a preko pravog DOM parsera
// (DOMPurify + jsdom), ne string/regex blocklist-a — regex pristup ne hvata
// SMIL atribut injection (<set attributeName="onmouseover" .../>), entity-
// obfuskovane URI šeme, ni <style> blokove. sanitize-html (koji se koristi za
// rich tekst gore) nije opcija ovde jer lowercase-uje atribute poput
// viewBox/preserveAspectRatio i tako lomi SVG — DOMPurify preko jsdom-a
// ispravno čuva SVG foreign-content adjustment (case-sensitive atribute).
export function sanitizeSvg(svgText) {
  if (!svgText || typeof svgText !== "string") return null;

  // DOMPurify-jev default ALLOWED_URI_REGEXP je već allowlist (http(s)/mailto/
  // tel/... ili relativni URL) — javascript:/data: nisu na listi pa se
  // automatski odbacuju, nema potrebe za ručnim override-om (manji rizik od
  // greške u sopstvenom regex-u nego oslanjanje na upstream, održavan pattern).
  const clean = svgPurify.sanitize(svgText, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ["script", "style", "foreignObject"],
  });

  return clean || null;
}
