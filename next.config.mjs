/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options",    value: "nosniff" },
          { key: "X-XSS-Protection",          value: "1; mode=block" },
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
          // frame-ancestors 'self' = baseline protiv clickjacking-a (danas nema
          // NIKAKVE zaštite). Kad se doda betting-sajt embed, ovde se dodaje
          // konkretan domen: "frame-ancestors 'self' https://<betting-domen>".
          { key: "Content-Security-Policy",   value: "frame-ancestors 'self'" },
          // Proveri sa server adminom da TLS terminacija već ne ubacuje ovo —
          // ako da, ovaj header je bezopasan duplikat; ako ne, ovo ga dodaje.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
      {
        // Admin backoffice se nikad ne framuje ni sa jednog domena, uključujući
        // budući betting-sajt widget (taj embed je za JAVNI kalendar, ne admin).
        source: "/admin/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
      {
        // /uploads/ fajlovi su hash-ovani po sadržaju (upload/route.js) — isto ime
        // uvek znači isti sadržaj, pa je bezbedno agresivno i trajno keširati.
        source: "/uploads/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
