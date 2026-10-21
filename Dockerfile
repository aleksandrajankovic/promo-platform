# 1) Build-time dependencije (uključuje devDependencies — next build treba tailwind/eslint-config-next)
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# 2) Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# next build only needs a syntactically valid connection string at build time
# (page-data collection evaluates route modules, which construct the Prisma
# client) — never a reachable database. JWT_SECRET is checked lazily at
# runtime (see src/lib/auth.js), not needed here. The real DATABASE_URL is
# supplied at runtime via docker-compose's `environment:`, not baked in here.
ARG DATABASE_URL="postgresql://user:pass@localhost:5432/build"
ENV DATABASE_URL=${DATABASE_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# 3) Samo produkcione dependencije, za finalni image (bez tailwind/eslint/vitest)
FROM node:20-alpine AS prod-deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# 4) Finalni "runner" image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
# Prisma 7: CLI (npx prisma migrate deploy u kontejneru) čita konekciju odavde
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Non-root — node:20-alpine već ima "node" korisnika (uid 1000) ugrađenog.
# public/uploads mora biti upisiv od tog korisnika (tu se pišu admin upload-i,
# i tu docker-compose.yml montira named volume da preživi restart kontejnera).
RUN mkdir -p public/uploads && chown -R node:node /app
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["npm", "start"]
