// src/components/promo/PromoBallIcon.js
// "Lopta" ikonica za football temu — puni svoj krug, opciono se vrti za knockout faze.
export default function PromoBallIcon({ src, spin = false, lazy = true, alt = "ball" }) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      className={`w-full h-full object-cover${spin ? " knockout-ball-spin" : ""}`}
      loading={lazy ? "lazy" : undefined}
    />
  );
}
