// src/components/promo/LockOverlay.js
// Katanac preko zaključanog (budućeg) dana — deljeno između svih kalendarskih varijanti.
export default function LockOverlay({ size = "auto", className = "" }) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none bg-[#00000080] bg-center bg-no-repeat ${className}`}
      style={{ backgroundImage: "url('/img/lock.png')", backgroundSize: size }}
    />
  );
}
