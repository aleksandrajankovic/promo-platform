// src/lib/calendarInteractions.js
import { initScratch } from "./scratch/initScratch";
import { renderModalHTML } from "@/lib/calendar/promoModalHtml";
import { monthHref } from "@/lib/calendar/calendarUrls";

// -----------------------------
// INIT FUNKCIJA
// -----------------------------
export function initCalendarInteractions(rootSelector = "#calendar-root", { openDay } = {}) {
  const root = document.querySelector(rootSelector);
  if (!root) return;

  const dataEl = root.querySelector("#calendar-data");
  if (!dataEl) return;

  const payload = JSON.parse(dataEl.textContent || "{}");
  const days = Array.isArray(payload.days) ? payload.days : [];
  const lang = payload.lang || "sr";
  const theme = payload.theme || "default";

  const modal = root.querySelector("#promo-modal");
  const content = root.querySelector("#promo-content");
  const closeBtn = root.querySelector("#promo-close");
  const dialog = modal ? modal.querySelector("#promo-dialog") : null;

  if (!modal || !content) return;

  let isOpen = false;
  let previousUrl = null;

  // ---- Modal style helpers ----

  function resetModalStyles() {
    modal.style.opacity = "";
    modal.style.transition = "";
  }

  // ---- Dialog open/close animations ----

  function animateOpen() {
    if (!dialog) return;

    dialog.classList.remove(
      "opacity-100", "translate-y-0", "scale-100",
      "opacity-0", "translate-y-4", "scale-95"
    );

    dialog.style.opacity = "0";
    dialog.style.transform = "scale(0.85)";
    dialog.style.transition =
      "opacity 300ms cubic-bezier(0.34,1.56,0.64,1), transform 300ms cubic-bezier(0.34,1.56,0.64,1)";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        dialog.style.opacity = "1";
        dialog.style.transform = "scale(1)";
        setTimeout(() => {
          dialog.style.transition = "";
          dialog.style.opacity = "";
          dialog.style.transform = "";
          dialog.classList.add("opacity-100", "translate-y-0", "scale-100");
        }, 320);
      });
    });
  }

  function animateClose(cb) {
    if (!dialog) {
      cb?.();
      return;
    }

    // Clear any lingering inline styles from open animation
    dialog.style.opacity = "";
    dialog.style.transform = "";
    dialog.style.transition = "";

    dialog.classList.remove("opacity-100", "translate-y-0", "scale-100");
    dialog.classList.add("opacity-0", "translate-y-4", "scale-95");

    setTimeout(() => cb?.(), 200);
  }

  // ---- Open modal (with optional overlay fade + dialog delay) ----

  function openModal(entry, { overlayFadeDuration = 0, dialogDelay = 0 } = {}) {
    content.innerHTML = renderModalHTML(entry, lang, theme);
    if (entry?.year != null && entry?.month != null && entry?.day) {
      window.dispatchEvent(new CustomEvent("mb-day-viewed", {
        detail: { year: entry.year, month: entry.month, day: entry.day },
      }));
    }

    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    isOpen = true;

    previousUrl = window.location.href;
    if (entry && entry.shareUrl) {
      history.pushState({ promo: true }, "", entry.shareUrl);
    }

    if (overlayFadeDuration > 0) {
      modal.style.opacity = "0";
      modal.style.transition = `opacity ${overlayFadeDuration}ms ease-out`;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          modal.style.opacity = "1";
          setTimeout(() => {
            modal.style.opacity = "";
            modal.style.transition = "";
          }, overlayFadeDuration + 50);
        })
      );
    }

    setTimeout(() => {
      animateOpen();
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const canvas = document.getElementById("scratch-canvas");
          if (canvas) initScratch();
        })
      );
    }, dialogDelay);
  }

  function closeModal({ fromPopstate = false } = {}) {
    isOpen = false;
    document.body.style.overflow = "";
    resetModalStyles();

    animateClose(() => {
      modal.classList.add("hidden");
      content.innerHTML = "";

      if (!fromPopstate && previousUrl) {
        history.replaceState(null, "", previousUrl);
      }
    });
  }

  // ---- Ball click animations ----

  function animateRegularBallClick(btn, entry) {
    // 0ms: spring overshoot up
    btn.style.transition = "transform 150ms cubic-bezier(0.34,1.56,0.64,1)";
    btn.style.transform = "scale(1.18)";

    // 150ms: collapse to 0
    setTimeout(() => {
      btn.style.transition =
        "transform 250ms ease-in, opacity 250ms ease-in";
      btn.style.transform = "scale(0)";
      btn.style.opacity = "0";
    }, 150);

    // 300ms: show modal
    setTimeout(() => {
      btn.style.transform = "";
      btn.style.opacity = "";
      btn.style.transition = "";
      openModal(entry, { overlayFadeDuration: 200, dialogDelay: 100 });
    }, 300);
  }

  function animateGoldBallClick(btn, entry) {
    // 0ms: anticipation shake, scale builds to 1.15
    btn.style.animation = "gold-click-shake 300ms ease-in-out forwards";

    // 300ms: ball zooms with intense glow
    setTimeout(() => {
      btn.style.animation = "";
      btn.style.transition =
        "transform 200ms ease-out, box-shadow 200ms ease-out";
      btn.style.transform = "scale(1.6)";
      btn.style.boxShadow = "0 0 60px 30px rgba(248,217,122,0.8)";
    }, 300);

    // 500ms: ball collapses and fades + open modal
    setTimeout(() => {
      btn.style.transition =
        "transform 250ms ease-in, opacity 250ms ease-in, box-shadow 150ms ease-in";
      btn.style.transform = "scale(0.3)";
      btn.style.opacity = "0";
      btn.style.boxShadow = "";
      openModal(entry, { overlayFadeDuration: 200, dialogDelay: 100 });
    }, 500);

    // Reset ball inline styles after popup is open
    setTimeout(() => {
      btn.style.transform = "";
      btn.style.opacity = "";
      btn.style.transition = "";
      btn.style.boxShadow = "";
      btn.style.animation = "";
    }, 850);
  }

  // ---- Click listener ----

  root.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-day-button]");
    if (!btn) return;

    const day = Number(btn.getAttribute("data-day"));
    const entry = days.find((d) => d.day === day);
    if (!entry || !entry.hasPromo) return;

    const category =
      btn.getAttribute("data-category") || entry.category || "ALL";

    if (category === "GOLD") {
      animateGoldBallClick(btn, entry);
    } else {
      animateRegularBallClick(btn, entry);
    }
  });

  // X dugme
  closeBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    closeModal();
  });

  // Klik na overlay
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // ESC
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) {
      closeModal();
    }
  });

  // back/forward
  window.addEventListener("popstate", () => {
    if (isOpen) {
      closeModal({ fromPopstate: true });
    }
  });

  // Deep-link (/promo/[iso]/[slug]) — dan je već SSR-ovan (server je popunio
  // #promo-content i uklonio "hidden" sa modala), samo povežemo state/scratch
  // bez ponovnog renderovanja sadržaja. Ako iz nekog razloga nije SSR-ovan
  // (modal je i dalje sakriven), padamo nazad na uobičajeno klijentsko otvaranje.
  if (openDay != null) {
    const entry = days.find((d) => d.day === openDay);
    if (entry && entry.hasPromo) {
      if (!modal.classList.contains("hidden")) {
        isOpen = true;
        document.body.style.overflow = "hidden";
        previousUrl = monthHref(payload.year, payload.month);
        const canvas = document.getElementById("scratch-canvas");
        if (canvas) initScratch();
      } else {
        openModal(entry, { overlayFadeDuration: 200 });
      }
    }
  }
}

export default initCalendarInteractions;
