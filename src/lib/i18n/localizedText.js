// src/lib/i18n/localizedText.js
// Tekst koji admin unosi po jeziku tržišta ({ sr: "...", en: "..." }).

// Spaja izmene u postojeći objekat: ključ sa praznim tekstom se briše (tada
// važi podrazumevani tekst iz rečnika), jezici van tržišta se ignorišu.
// Vraća null kad ne ostane nijedan jezik.
export function mergeLocalizedText(existing, incoming, allowedLangs) {
  const out = { ...(existing && typeof existing === "object" ? existing : {}) };
  if (incoming && typeof incoming === "object") {
    for (const lang of allowedLangs) {
      if (!(lang in incoming)) continue;
      const value = typeof incoming[lang] === "string" ? incoming[lang].trim() : "";
      if (value) out[lang] = value;
      else delete out[lang];
    }
  }
  return Object.keys(out).length ? out : null;
}

// Isto za SEO: { lang: { title, description } }; jezik bez oba polja se briše.
export function mergeLocalizedSeo(existing, incoming, allowedLangs) {
  const out = { ...(existing && typeof existing === "object" ? existing : {}) };
  if (incoming && typeof incoming === "object") {
    for (const lang of allowedLangs) {
      if (!(lang in incoming)) continue;
      const s = incoming[lang] || {};
      const title = typeof s.title === "string" ? s.title.trim() : "";
      const description = typeof s.description === "string" ? s.description.trim() : "";
      if (title || description) out[lang] = { ...(title && { title }), ...(description && { description }) };
      else delete out[lang];
    }
  }
  return Object.keys(out).length ? out : null;
}
