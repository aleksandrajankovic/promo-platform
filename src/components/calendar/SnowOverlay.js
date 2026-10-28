// src/components/SnowOverlay.jsx
"use client";

const FLAKE_COUNT = 45;

// Deterministički "nasumični" brojevi (mulberry32): isti na serveru i u
// browseru, pa nema razlike pri hidrataciji kao sa Math.random() u renderu.
function seeded(seed) {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const FLAKES = Array.from({ length: FLAKE_COUNT }, (_, i) => {
  const r = (k) => seeded(i * 7 + k);
  return {
    id: i,
    left: r(1) * 100,
    delay: r(2) * 10,
    duration: 12 + r(3) * 12,
    size: 6 + r(4) * 18,
    opacity: 0.35 + r(5) * 0.5,
    drift: -20 + r(6) * 40,
  };
});

function isSnowSeason() {
  const now = new Date();
  const m = now.getMonth(); // 0-11
  const d = now.getDate();
  return (m === 11 && d >= 25) || (m === 0 && d <= 15);
}

export default function SnowOverlay() {
  const snow = isSnowSeason();

  if (!snow) return null;

  return (
    <div
      className="
        pointer-events-none
        motion-reduce:hidden
        fixed inset-0
        z-20            
        overflow-hidden
      "
    >
      {FLAKES.map((flake) => (
        <div
          key={flake.id}
          className="snowflake"
          style={{
            left: `${flake.left}%`,
            animationDelay: `${flake.delay}s`,
            animationDuration: `${flake.duration}s`,
            fontSize: `${flake.size}px`,
            opacity: flake.opacity,
            // prosleđujemo horizontalni pomeraj kao CSS varijablu
            "--drift": `${flake.drift}px`,
          }}
        >
          ❄
        </div>
      ))}
    </div>
  );
}
