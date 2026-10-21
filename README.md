# promo-platform

Multi-tenant Next.js platform serving a "promo calendar" for each Meridianbet market (RS, TZ, BR, ME, BA, COM) from one shared codebase and one shared Postgres database. Each market is a `Market` row; every piece of content is scoped by `marketId`. A separate admin backoffice (`/admin`, gated by the `ADMIN_HOST` env var) lets SUPER_ADMIN users manage all markets and ADMIN users manage their own assigned market.

## Prerequisites

- Node 20+
- A Postgres database (the project targets Neon, but any Postgres works)

## Setup

1. Copy `.env.example` to `.env` and fill in the values (see comments in that file for what each one does).
2. Install dependencies and generate the Prisma client:
   ```bash
   npm install
   npx prisma generate
   ```
3. Apply migrations:
   ```bash
   npx prisma migrate deploy
   ```
   Migrations in this project are hand-written, not generated via `prisma migrate dev --create-only` against the real database — see the comment at the top of `prisma/schema.prisma`'s migration folder if you're adding a new one. Never point a shadow database (`shadowDatabaseUrl` in `prisma.config.ts`) at anything but a fully disposable database.

   The project is on Prisma 7: the database URL lives in `prisma.config.ts` (CLI) and `src/lib/db.js` (app, via the `@prisma/adapter-pg` driver adapter), not in `schema.prisma`. Scripts build their clients with `scripts/prismaClient.mjs`.
4. Seed the markets and a super-admin account:
   ```bash
   node scripts/seed-phase2.mjs <your-chosen-password>
   ```
   This upserts all 6 `Market` rows and one `SUPER_ADMIN` `AdminUser` (email is hardcoded in the script — change it there if needed). Safe to re-run.
5. Run the dev server:
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000/login` to sign in to the admin backoffice, or `http://localhost:3000/` for the public calendar (which market you see locally is controlled by `DEV_DEFAULT_MARKET` or the `admin_market` cookie — see `src/lib/marketScope.js`).

## Migrating an old per-market database

`scripts/migrate-market.mjs` is a one-off ETL script for pulling a market's old, pre-migration database into this shared schema:

```bash
node scripts/migrate-market.mjs <marketCode> <old-database-url> <old-project-dir>
```

Safe to re-run for a given market (it deletes and re-inserts that market's rows, doesn't touch others). The old `WeeklyPromotion` model (auto-recurring promos, dropped in this platform) is dumped to a JSON backup file instead of being migrated into the new schema.

## Tests

```bash
npm test
```

Runs the Vitest unit suite (`src/**/*.test.js`) — currently covers the sanitizers, link validation, date-lock logic, and the market/role resolution branching in `src/lib/marketScope.js`. Proportionate to project size, not exhaustive — there's no integration/e2e suite yet.

## Docker

```bash
docker compose up --build
```

Reads `DATABASE_URL`, `JWT_SECRET`, `ADMIN_HOST`, `DEV_DEFAULT_MARKET` from a `.env` file in the project root (same file as local dev). Uploaded images (`public/uploads/`) persist across container restarts via a named volume — without it they'd be lost every time the container is recreated.

This covers local sanity-checking the Docker build only. Production deployment (real domain wiring for `ADMIN_HOST`, pulling the real upload galleries from each market's live server, Cloudflare configuration) is handled separately, not by this compose file.

## Key architecture notes

- **Multi-tenant scoping**: `src/lib/marketScope.js` resolves the current market — by hostname for public pages, by session (+ explicit `?market=`/cookie for SUPER_ADMIN) for admin routes. Role/market are always re-read fresh from the database on every request, never trusted from the JWT payload.
- **Locale routing**: a market's default locale is unprefixed (`/`, `/2026/8`); any other locale gets a real path segment (`/en`, `/en/2026/8`) — see `src/lib/calendar/calendarUrls.js`.
- **The public calendar route** is `src/app/[[...params]]/page.js`, an optional catch-all — Next.js doesn't allow two differently-named dynamic segments as siblings, so `/`, `/[locale]`, `/[year]/[month]`, and `/[locale]/[year]/[month]` are all parsed there by hand.
