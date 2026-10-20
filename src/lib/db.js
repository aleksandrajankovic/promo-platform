// src/lib/db.js
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

let prisma;

// Bez ovoga, ako DATABASE_URL nedostaje, prva greška stiže tek kad neko
// pozove prvi upit (opaka Prisma poruka, daleko od stvarnog uzroka) — umesto
// toga puca odmah pri boot-u, jasno, isti pattern kao JWT_SECRET provera u auth.js.
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

if (!globalForPrisma._prisma) {
  try {
    globalForPrisma._prisma = new PrismaClient();
  } catch (e) {
    console.error("PRISMA INIT ERROR >>>", e);
    throw e;
  }
}

prisma = globalForPrisma._prisma;

export default prisma;
