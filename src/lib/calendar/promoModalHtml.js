// src/lib/promoModalHtml.js
// Čisto renderovanje HTML-a za promo modal — bez DOM zavisnosti, pa radi
// identično i na serveru (SSR sadržaj za otvoreni dan) i na klijentu (klik).
import { renderScratchModal, extractFirstImg } from "./scratch/renderScratchModal";
import { getExclusiveBadgeLabel } from "@/lib/calendar/promoCategoryStyles";

function renderNormalModal(entry, lang = "sr") {
  if (!entry) {
    return lang === "sr"
      ? "<p>Ne postoje promocije za ovaj dan.</p>"
      : "<p>No promotions for this day.</p>";
  }

  const { promo } = entry;

  const title = entry.title || (promo && promo.title) || "";
  const button = entry.button || (promo && promo.button) || "";
  const buttonColor =
    entry.buttonColor || (promo && promo.buttonColor) || "green";
  const link = entry.link || (promo && promo.link) || "";
  const richHtml = entry.richHtml || (promo && promo.richHtml) || "";

  if (!promo && !richHtml) {
    return lang === "sr"
      ? "<p>Ne postoje promocije za ovaj dan.</p>"
      : "<p>No promotions for this day.</p>";
  }

  let imageHtml = null;
  let contentHtml = richHtml;

  if (contentHtml) {
    const imgMatch = contentHtml.match(/<img[^>]*>/i);
    if (imgMatch) {
      imageHtml = imgMatch[0]
        .replace(/\s+width="[^"]*"/gi, "")
        .replace(/\s+height="[^"]*"/gi, "")
        .replace(/\s+style="[^"]*"/gi, "");
      contentHtml = contentHtml.replace(imgMatch[0], "");
    }
  }

  const categoryLabel = getExclusiveBadgeLabel(entry?.category, lang);

  const openUrl = link && String(link);
  const canOpen = openUrl && openUrl !== "#";
  const isYellow = buttonColor === "yellow";
  const defaultButtonLabel =
    button || (lang === "sr" ? "Registruj se" : "Register");

  return `
    <div class="flex flex-col w-full max-w-[420px] mx-auto">
      ${
        imageHtml
          ? `
        <div class="mb-4 [&_img]:w-full [&_img]:h-auto [&_img]:rounded-2xl">
          ${imageHtml}
        </div>`
          : ""
      }

      <h2 class="font-bold text-[24px] md:text-[28px] leading-tight mb-2 text-center text-white">
        ${title}
      </h2>
      <div class="text-[11px] uppercase tracking-[0.12em] text-[#FACC01] mb-3 text-center">
        ${categoryLabel}
      </div>

      ${
        contentHtml
          ? `
        <div class="
          text-sm leading-relaxed text-white/90
          [&_strong]:font-semibold [&_em]:italic [&_u]:underline
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1
          [&_li]:mb-0.5
          [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-1 [&_h1]:mt-2
          [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-1 [&_h2]:mt-2
          [&_h3]:text-base [&_h3]:font-bold [&_h3]:mb-1 [&_h3]:mt-2
        ">
          ${contentHtml}
        </div>`
          : ""
      }

      ${
        canOpen
          ? `
        <div class="pt-5 mt-2 flex justify-center">
          <a
            href="${openUrl}"
            target="_blank"
            rel="noopener noreferrer"
            class="
              w-4/5 max-w-[360px]
              inline-flex items-center justify-center
              px-4 py-3
              rounded-[10px]
              text-sm font-semibold font-condensed
              shadow-[0_10px_25px_rgba(0,0,0,0.6)]
              transition
              ${
                isYellow
                  ? "bg-[#FACC01] text-black hover:brightness-110"
                  : "bg-[#17BB00] text-white hover:brightness-110"
              }
            "
          >
            ${defaultButtonLabel}
          </a>
        </div>`
          : ""
      }
    </div>
  `;
}

export function renderModalHTML(entry, lang = "sr", theme = "default", coverSrc = "/img/scratchCard.png", cursorSrc = "/img/coin.png") {
  if (!entry) {
    return lang === "sr"
      ? "<p>Ne postoje promocije za ovaj dan.</p>"
      : "<p>No promotions for this day.</p>";
  }

  const { promo, type } = entry;

  const title = entry.title || (promo && promo.title) || "";
  const button = entry.button || (promo && promo.button) || "";
  const buttonColor =
    entry.buttonColor || (promo && promo.buttonColor) || "green";
  const link = entry.link || (promo && promo.link) || "";
  const richHtml = entry.richHtml || (promo && promo.richHtml) || "";
  const defaultButtonLabel =
    button || (lang === "sr" ? "Registruj se" : "Register");

  const isScratch = !!(entry?.scratch || promo?.scratch);
  const isFlip = !!(entry?.flipCard || promo?.flipCard);

  if (isScratch) {
    const shareKey =
      entry?.shareUrl ||
      `${entry?.year}-${entry?.month}-${entry?.day}-${type || "promo"}`;

    return renderScratchModal({
      title,
      richHtml,
      link,
      button: defaultButtonLabel,
      buttonColor,
      lang,
      shareKey,
      threshold: 0.7,
      coverSrc,
      cursorSrc,
      theme,
      year: entry?.year,
      month: entry?.month,
      day: entry?.day,
      category: entry?.category,
      flipCard: isFlip,
    });
  }

  // Flip kartica bez scratch-a — admin je uključio "Enable flip card" ali ne
  // i "Enable scratch card": prednja/zadnja strana su odmah vidljive, samo
  // se dodiruju da se okrenu (ne treba prethodno ogrebavanje).
  if (isFlip) {
    return renderFlipModal({
      title,
      richHtml,
      link,
      button: defaultButtonLabel,
      buttonColor,
      lang,
      category: entry?.category,
    });
  }

  return renderNormalModal(entry, lang);
}

function renderFlipModal({ title, richHtml, link, button, buttonColor, lang, category }) {
  const { imgSrc, restHtml } = extractFirstImg(richHtml);
  const categoryLabel = getExclusiveBadgeLabel(category, lang);
  const isYellow = buttonColor === "yellow";
  const canOpen = link && link !== "#";

  return `
  <div class="w-full max-w-[420px] mx-auto rounded-3xl overflow-hidden">
    <div class="flip-card-wrapper" style="aspect-ratio:360/430; perspective:1000px">
      <div id="flip-card-inner" class="flip-card-inner h-full">
        <div class="flip-card-face absolute inset-0 rounded-2xl overflow-hidden">
          ${
            imgSrc
              ? `<img src="${imgSrc}" alt="" class="absolute inset-0 z-0 block w-full h-full object-cover" />`
              : `<div class="absolute inset-0 z-0 flex items-center justify-center text-white/70 text-sm leading-normal bg-[#6b21a8]">No image</div>`
          }
        </div>
        <div class="flip-card-face flip-card-back absolute inset-0 rounded-2xl bg-[#05070D] px-4 py-5 overflow-y-auto">
          <h2 class="font-bold text-[22px] md:text-[26px] text-center text-white">
            ${title}
          </h2>
          <div class="text-[11px] uppercase tracking-[0.12em] text-[#FACC01] mt-2 text-center">
            ${categoryLabel}
          </div>
          ${
            restHtml
              ? `<div class="mt-3 text-sm text-center text-white/90
                        [&_p]:mb-2 [&_p:last-child]:mb-0
                        [&_strong]:font-semibold
                        [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:list-inside">
                  ${restHtml}
                </div>`
              : ""
          }
          ${
            canOpen
              ? `<div class="pt-5 flex justify-center">
                  <a href="${link}" target="_blank" rel="noreferrer"
                     class="w-4/5 max-w-[360px] px-4 py-3 rounded-[10px]
                            text-sm text-center font-semibold
                            ${isYellow ? "bg-[#FACC01] text-black" : "bg-[#17BB00] text-white"}
                            hover:brightness-110 transition">
                    ${button}
                  </a>
                </div>`
              : ""
          }
        </div>
      </div>
    </div>
    <div id="flip-hint" class="mt-3 text-center text-xs text-white/70 uppercase tracking-[0.1em]">
      ${lang === "sr" ? "Dodirni za detalje" : "Tap for details"}
    </div>
  </div>
  `;
}
