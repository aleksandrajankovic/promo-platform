// src/lib/rateLimit.js
// In-memory rate limiter — dovoljan za jednu Docker instancu.
// Za multi-instance deploy, zameniti sa @upstash/ratelimit + Redis.

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minuta

// Map<ip, { count: number, resetAt: number }>
const store = new Map();

// Periodično čišćenje isteklih zapisa (svakih 10 min)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of store) {
    if (now >= entry.resetAt) store.delete(ip);
  }
}, 10 * 60 * 1000);

export function checkRateLimit(ip) {
  const now = Date.now();
  const entry = store.get(ip);

  if (entry && now < entry.resetAt && entry.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  return { allowed: true };
}

export function recordFailedAttempt(ip) {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now >= entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

export function clearAttempts(ip) {
  store.delete(ip);
}

// IP za rate limit. PRVI unos u X-Forwarded-For upisuje sam klijent, pa bi
// napadač mogao da ga menja na svakom pokušaju i zaobiđe limit. Redosled:
// CF-Connecting-IP (Cloudflare ga uvek prepisuje), pa POSLEDNJI unos u
// X-Forwarded-For (dodaje ga naš najbliži proxy, klijent ne može da ga
// podmetne), pa x-real-ip. Pretpostavka: origin prima saobraćaj samo preko
// Cloudflare-a — inače je i CF-Connecting-IP moguće podmetnuti.
export function getClientIp(req) {
  return (
    req.headers.get("cf-connecting-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}
