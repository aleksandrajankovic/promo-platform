// src/lib/db.js
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

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
    // Prisma 7: konekcija ide preko driver adaptera (node-postgres), bez
    // posebnog Rust query engine-a. pg podrazumevano nema timeout za
    // uspostavljanje veze (Prisma 6 je imala 5s) — bez toga bi zahtev visio
    // kad Neon ne odgovara, umesto da withRetry dobije P1001 i pokuša ponovo.
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
    });
    globalForPrisma._prisma = new PrismaClient({ adapter });
  } catch (e) {
    console.error("PRISMA INIT ERROR >>>", e);
    throw e;
  }
}

prisma = globalForPrisma._prisma;

export default prisma;
