import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const markets = [
  { code: "rs", name: "Srbija", domain: "calendar.meridianbet.rs", locales: ["sr"], defaultLocale: "sr", timezone: "Europe/Belgrade" },
  { code: "tz", name: "Tanzania", domain: "calendar.meridianbet.co.tz", locales: ["sw", "en"], defaultLocale: "sw", timezone: "Africa/Dar_es_Salaam" },
  { code: "br", name: "Brazil", domain: "calendar.meridianbet.bet.br", locales: ["pt"], defaultLocale: "pt", timezone: "America/Sao_Paulo" },
  { code: "me", name: "Montenegro", domain: "calendar.meridianbet.me", locales: ["sr"], defaultLocale: "sr", timezone: "Europe/Podgorica" },
  { code: "ba", name: "Bosnia", domain: "calendar.meridianbet.ba", locales: ["ba"], defaultLocale: "ba", timezone: "Europe/Sarajevo" },
  { code: "com", name: "Meridianbet.com", domain: "calendar.meridianbet.com", locales: ["en"], defaultLocale: "en", timezone: "Europe/Belgrade" },
];

for (const m of markets) {
  const market = await prisma.market.upsert({
    where: { code: m.code },
    update: m,
    create: m,
  });
  console.log("Market:", market.code, market.id);
}

const email = "aleksandra.jankovic@meridianbet.com";
const password = process.argv[2];
if (!password) {
  console.error("Usage: node scripts/seed-phase2.mjs <password>");
  process.exit(1);
}
const passwordHash = await bcrypt.hash(password, 10);

const admin = await prisma.adminUser.upsert({
  where: { email },
  update: { passwordHash, role: "SUPER_ADMIN", marketId: null },
  create: { name: "Aleksandra Jankovic", email, passwordHash, role: "SUPER_ADMIN" },
});
console.log("Admin:", admin.email, "role:", admin.role);

await prisma.$disconnect();
