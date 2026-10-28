// src/lib/i18n/messages.js
// Fiksni tekstovi javnog kalendara po jeziku tržišta. Tekst koji unosi admin
// (naslov, SEO, natpis odbrojavanja, promocije) ne ide ovde — on je u bazi po
// jeziku; ovo su podrazumevane vrednosti i tekst samog interfejsa.
//
// Jezici: sr (RS, ME), ba (BA), en (TZ/en, COM), sw (TZ), pt (BR).
// sw i pt treba da pregleda neko iz lokalnog tima.

export const SUPPORTED_LANGS = ["sr", "ba", "en", "sw", "pt"];
const FALLBACK = "en";

// BCP 47 oznake za Intl (nazivi meseci)
const INTL_LOCALE = { sr: "sr-Latn-RS", ba: "bs-Latn-BA", en: "en-GB", sw: "sw-TZ", pt: "pt-BR" };

const MESSAGES = {
  sr: {
    siteTitle: "Kalendar Promocija | Meridianbet",
    siteDescription: "Budite u toku sa dnevnim ponudama, otkrijte nove promocije i iskoristite ekskluzivne nagrade uz Meridianbet Kalendar Promocija.",
    calendarTitle: "KALENDAR PROMOCIJA",
    calendarImageAlt: "Kalendar promocija",
    metaTitle: "Kalendar Promocija {month} {year} | Meridianbet",
    metaDescription: "Otkrijte dnevne promocije za {month} {year}. Iskoristite ekskluzivne nagrade uz Meridianbet Kalendar Promocija.",
    promoDetails: "Detalji promocije",
    close: "Zatvori",
    noPromos: "Ne postoje promocije za ovaj dan.",
    register: "Registruj se",
    learnMore: "Saznaj više",
    tapForDetails: "Dodirni za detalje",
    scratchHint: "SPREMAN ZA IZNENAĐENJE?",
    scratchTitle: "Ogrebi i otkrij današnju specijalnu promociju",
    exclusivePromo: "Ekskluzivna promocija",
    noImage: "Nema slike",
    prevMonth: "Prethodni mesec",
    nextMonth: "Sledeći mesec",
    changeLanguage: "Promeni jezik",
    mainSite: "Meridianbet – glavni sajt",
    day: "Dan",
    countdownDefault: "Kalendar se otvara za",
    days: ["dan", "dana"],
    hours: "sati",
    minutes: "min",
    seconds: "sek",
    leaderboard: "Rang lista",
    loadError: "Greška pri učitavanju",
    loading: "Učitavam...",
    showMore: "Prikaži još ({count} preostalo)",
    knockoutFinal: "FINALE",
    categories: {
      ALL: "Sve", SPORT: "Sport", CASINO: "Kazino", MISSIONS: "Misije", GOLD: "Zlatna lopta",
      QUARTER_FINAL: "Četvrtfinale", SEMI_FINAL: "Polufinale", FINAL: "Finale",
    },
  },
  ba: {
    siteTitle: "Kalendar Promocija | Meridianbet",
    siteDescription: "Budite u toku sa dnevnim ponudama, otkrijte nove promocije i iskoristite ekskluzivne nagrade uz Meridianbet Kalendar Promocija.",
    calendarTitle: "KALENDAR PROMOCIJA",
    calendarImageAlt: "Kalendar promocija",
    metaTitle: "Kalendar Promocija {month} {year} | Meridianbet",
    metaDescription: "Otkrijte dnevne promocije za {month} {year}. Iskoristite ekskluzivne nagrade uz Meridianbet Kalendar Promocija.",
    promoDetails: "Detalji promocije",
    close: "Zatvori",
    noPromos: "Nema promocija za ovaj dan.",
    register: "Registruj se",
    learnMore: "Saznaj više",
    tapForDetails: "Dodirni za detalje",
    scratchHint: "SPREMAN ZA IZNENAĐENJE?",
    scratchTitle: "Ogrebi i otkrij današnju specijalnu promociju",
    exclusivePromo: "Ekskluzivna promocija",
    noImage: "Nema slike",
    prevMonth: "Prethodni mjesec",
    nextMonth: "Sljedeći mjesec",
    changeLanguage: "Promijeni jezik",
    mainSite: "Meridianbet – glavna stranica",
    day: "Dan",
    countdownDefault: "Kalendar se otvara za",
    days: ["dan", "dana"],
    hours: "sati",
    minutes: "min",
    seconds: "sek",
    leaderboard: "Rang lista",
    loadError: "Greška pri učitavanju",
    loading: "Učitavam...",
    showMore: "Prikaži još ({count} preostalo)",
    knockoutFinal: "FINALE",
    categories: {
      ALL: "Sve", SPORT: "Sport", CASINO: "Kazino", MISSIONS: "Misije", GOLD: "Zlatna lopta",
      QUARTER_FINAL: "Četvrtfinale", SEMI_FINAL: "Polufinale", FINAL: "Finale",
    },
  },
  en: {
    siteTitle: "Promo Calendar | Meridianbet",
    siteDescription: "Stay up to date with daily offers, discover new promotions, and claim exclusive rewards with the Meridianbet Promo Calendar.",
    calendarTitle: "PROMO CALENDAR",
    calendarImageAlt: "Promo calendar",
    metaTitle: "Promo Calendar {month} {year} | Meridianbet",
    metaDescription: "Discover daily promotions for {month} {year}. Claim exclusive rewards with the Meridianbet Promo Calendar.",
    promoDetails: "Promotion details",
    close: "Close",
    noPromos: "No promotions for this day.",
    register: "Register",
    learnMore: "Learn more",
    tapForDetails: "Tap for details",
    scratchHint: "READY FOR A SURPRISE?",
    scratchTitle: "Scratch to reveal today's special offer",
    exclusivePromo: "Exclusive promotion",
    noImage: "No image",
    prevMonth: "Previous month",
    nextMonth: "Next month",
    changeLanguage: "Change language",
    mainSite: "Meridianbet main site",
    day: "Day",
    countdownDefault: "Calendar opens in",
    days: ["day", "days"],
    hours: "hours",
    minutes: "min",
    seconds: "sec",
    leaderboard: "Leaderboard",
    loadError: "Failed to load",
    loading: "Loading...",
    showMore: "Show more ({count} left)",
    knockoutFinal: "FINAL",
    categories: {
      ALL: "All", SPORT: "Sports", CASINO: "Casino", MISSIONS: "Missions", GOLD: "Golden Ball",
      QUARTER_FINAL: "Quarterfinal", SEMI_FINAL: "Semifinal", FINAL: "Final",
    },
  },
  sw: {
    siteTitle: "Kalenda ya Promosheni | Meridianbet",
    siteDescription: "Fuatilia ofa za kila siku, gundua promosheni mpya na upate zawadi za kipekee ukiwa na Kalenda ya Promosheni ya Meridianbet.",
    calendarTitle: "KALENDA YA PROMOSHENI",
    calendarImageAlt: "Kalenda ya promosheni",
    metaTitle: "Kalenda ya Promosheni {month} {year} | Meridianbet",
    metaDescription: "Gundua promosheni za kila siku za {month} {year}. Pata zawadi za kipekee ukiwa na Kalenda ya Promosheni ya Meridianbet.",
    promoDetails: "Maelezo ya promosheni",
    close: "Funga",
    noPromos: "Hakuna promosheni kwa siku hii.",
    register: "Jisajili",
    learnMore: "Jifunze zaidi",
    tapForDetails: "Gusa kwa maelezo",
    scratchHint: "UKO TAYARI KWA MSHANGAO?",
    scratchTitle: "Kwangua ili ugundue promosheni maalum ya leo",
    exclusivePromo: "Promosheni ya kipekee",
    noImage: "Hakuna picha",
    prevMonth: "Mwezi uliopita",
    nextMonth: "Mwezi ujao",
    changeLanguage: "Badilisha lugha",
    mainSite: "Tovuti kuu ya Meridianbet",
    day: "Siku",
    countdownDefault: "Kalenda inafunguliwa baada ya",
    days: ["siku", "siku"],
    hours: "saa",
    minutes: "dak",
    seconds: "sek",
    leaderboard: "Msimamo",
    loadError: "Hitilafu wakati wa kupakia",
    loading: "Inapakia...",
    showMore: "Onyesha zaidi ({count} zimebaki)",
    knockoutFinal: "FAINALI",
    categories: {
      ALL: "Zote", SPORT: "Michezo", CASINO: "Kasino", MISSIONS: "Misheni", GOLD: "Mpira wa Dhahabu",
      QUARTER_FINAL: "Robo fainali", SEMI_FINAL: "Nusu fainali", FINAL: "Fainali",
    },
  },
  pt: {
    siteTitle: "Calendário de Promoções | Meridianbet",
    siteDescription: "Fique por dentro das ofertas diárias, descubra novas promoções e aproveite recompensas exclusivas com o Calendário de Promoções Meridianbet.",
    calendarTitle: "CALENDÁRIO DE PROMOÇÕES",
    calendarImageAlt: "Calendário de promoções",
    metaTitle: "Calendário de Promoções {month} {year} | Meridianbet",
    metaDescription: "Descubra as promoções diárias de {month} de {year}. Aproveite recompensas exclusivas com o Calendário de Promoções Meridianbet.",
    promoDetails: "Detalhes da promoção",
    close: "Fechar",
    noPromos: "Não há promoções para este dia.",
    register: "Cadastre-se",
    learnMore: "Saiba mais",
    tapForDetails: "Toque para ver detalhes",
    scratchHint: "PRONTO PARA UMA SURPRESA?",
    scratchTitle: "Raspe e descubra a promoção especial de hoje",
    exclusivePromo: "Promoção exclusiva",
    noImage: "Sem imagem",
    prevMonth: "Mês anterior",
    nextMonth: "Próximo mês",
    changeLanguage: "Mudar idioma",
    mainSite: "Site principal da Meridianbet",
    day: "Dia",
    countdownDefault: "O calendário abre em",
    days: ["dia", "dias"],
    hours: "horas",
    minutes: "min",
    seconds: "seg",
    leaderboard: "Classificação",
    loadError: "Erro ao carregar",
    loading: "Carregando...",
    showMore: "Mostrar mais ({count} restantes)",
    knockoutFinal: "FINAL",
    categories: {
      ALL: "Todas", SPORT: "Esportes", CASINO: "Cassino", MISSIONS: "Missões", GOLD: "Bola de Ouro",
      QUARTER_FINAL: "Quartas de final", SEMI_FINAL: "Semifinal", FINAL: "Final",
    },
  },
};

export function normalizeLang(lang) {
  return SUPPORTED_LANGS.includes(lang) ? lang : FALLBACK;
}

// t("sw", "showMore", { count: 3 }) → "Onyesha zaidi (3 zimebaki)"
export function t(lang, key, vars) {
  const value = MESSAGES[normalizeLang(lang)][key] ?? MESSAGES[FALLBACK][key] ?? key;
  if (!vars || typeof value !== "string") return value;
  return value.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}

export function categoryLabel(lang, category) {
  const labels = t(lang, "categories");
  return labels[category] || labels.ALL;
}

// "Oktobar", "Oktoba", "Outubro"... — veliko početno slovo, za naslove i paginaciju
export function monthName(lang, month) {
  const raw = new Date(2000, month, 1).toLocaleString(INTL_LOCALE[normalizeLang(lang)], { month: "long" });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

// "1 dan / 2 dana / 21 dan" (sr/ba), "1 day / 2 days" (en)...
export function daysLabel(lang, n) {
  const [one, many] = t(lang, "days");
  const l = normalizeLang(lang);
  if (l === "sr" || l === "ba") return n % 10 === 1 && n % 100 !== 11 ? one : many;
  return n === 1 ? one : many;
}

// Tekst koji admin unosi po jeziku ({ sr: "...", en: "..." }): traženi jezik,
// pa podrazumevani jezik tržišta, pa ništa (pozivalac bira rezervu iz rečnika).
export function pickLocalized(value, lang, defaultLang) {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;
  return (value[lang] || "").trim() || (value[defaultLang] || "").trim() || null;
}
