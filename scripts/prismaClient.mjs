// scripts/prismaClient.mjs
// Prisma 7: svaki klijent ide preko driver adaptera — URL se više ne prosleđuje
// kroz `datasources`. Skripte koriste ovo i za novu bazu (DATABASE_URL) i za
// stare per-market baze (eksplicitan URL).
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export function createPrisma(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error("DATABASE_URL is not set (run with --env-file=.env)");
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString, connectionTimeoutMillis: 5000 }),
  });
}
