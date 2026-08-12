// src/components/promo/PromoIcon.js
// Ikonica dnevne promocije — pozicioniranje se razlikuje po varijanti kalendara, prosleđuje se preko className.
export default function PromoIcon({ src, className, alt = "promo icon" }) {
  if (!src) return null;
  return <img src={src} alt={alt} className={className} loading="lazy" />;
}
