// scripts/migrate-users.mjs
// Prebacuje AdminUser naloge iz starih per-market baza u promo-platform.
// Odvojeno od migrate-market.mjs jer ta skripta briše pa upisuje sadržaj
// tržišta — nalozi ne smeju da se brišu pri ponovnom pokretanju.
//
// Pravila:
// - passwordHash se prenosi kakav jeste (bcrypt i u starim i u novom projektu),
//   pa svi zadržavaju svoje lozinke.
// - Svi postaju ADMIN, sa svim tržištima (teritorijama) u čijim starim bazama
//   su imali nalog — isti email u više baza = jedan nalog sa više tržišta.
//   Stari isSuper nalozi takođe postaju ADMIN (isSuper je ranije važio samo za
//   jedno tržište); globalni SUPER_ADMIN se dodeljuje ručno, skripta ih izlista.
// - Ako se ista osoba javlja u više baza sa različitim lozinkama, uzima se
//   lozinka iz prve baze po redosledu tržišta (skripta to prijavi).
// - Nalozi koji već postoje u novoj bazi se ne diraju.
//
// Podrazumevano samo ispisuje plan (dry run); --apply zaista upisuje.
//
// Usage: node --env-file=.env scripts/migrate-users.mjs [--apply] [marketCode ...]
// Stare baze se čitaju iz ../calendar-next-<code>/.env (DATABASE_URL).
import { createPrisma } from "./prismaClient.mjs";
import fs from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const ALL_CODES = ["rs", "tz", "br", "me", "ba", "com"];
const codes = args.filter((a) => !a.startsWith("--"));
const MARKET_CODES = codes.length ? codes : ALL_CODES;

async function readOldDatabaseUrl(code) {
  const envPath = path.resolve(import.meta.dirname, `../../calendar-next-${code}/.env`);
  const env = await fs.readFile(envPath, "utf8");
  const match = env.match(/^DATABASE_URL\s*=\s*["']?([^"'\n]+)["']?/m);
  if (!match) throw new Error(`DATABASE_URL nije pronađen u ${envPath}`);
  return match[1];
}

const newPrisma = createPrisma();

async function main() {
  console.log(APPLY ? "== APPLY — upisujem u bazu ==" : "== DRY RUN — ništa se ne upisuje (dodaj --apply) ==");

  const existing = new Set(
    (await newPrisma.adminUser.findMany({ select: { email: true } })).map((u) => u.email.toLowerCase())
  );

  // email -> { name, passwordHash, createdAt, isSuper, codes: [], marketIds: [] }
  const merged = new Map();
  const passwordConflicts = [];

  for (const code of MARKET_CODES) {
    const market = await newPrisma.market.findUniqueOrThrow({ where: { code } });
    const oldPrisma = createPrisma(await readOldDatabaseUrl(code));
    try {
      const oldUsers = await oldPrisma.$queryRawUnsafe(
        `SELECT name, email, "passwordHash", "isSuper", "createdAt" FROM "AdminUser" ORDER BY id`
      );
      console.log(`[${code}] ${oldUsers.length} naloga u staroj bazi`);

      for (const u of oldUsers) {
        const email = u.email.trim().toLowerCase();
        if (existing.has(email)) continue;
        const entry = merged.get(email);
        if (!entry) {
          merged.set(email, {
            name: u.name,
            passwordHash: u.passwordHash,
            createdAt: u.createdAt,
            isSuper: u.isSuper,
            codes: [code],
            marketIds: [market.id],
          });
          continue;
        }
        entry.codes.push(code);
        entry.marketIds.push(market.id);
        entry.isSuper ||= u.isSuper;
        if (u.createdAt < entry.createdAt) entry.createdAt = u.createdAt;
        if (u.passwordHash !== entry.passwordHash) passwordConflicts.push(`${email} (${code} ≠ ${entry.codes[0]})`);
      }
    } finally {
      await oldPrisma.$disconnect();
    }
  }

  console.log("");
  for (const [email, u] of merged) {
    console.log(`  + ${email} -> ADMIN ${u.codes.join(", ")}${u.isSuper ? " (bio isSuper)" : ""}`);
    if (APPLY) {
      await newPrisma.adminUser.create({
        data: {
          name: u.name,
          email,
          passwordHash: u.passwordHash,
          role: "ADMIN",
          createdAt: u.createdAt,
          markets: { connect: u.marketIds.map((id) => ({ id })) },
        },
      });
    }
  }

  console.log(`\n${APPLY ? "Upisano" : "Bilo bi upisano"}: ${merged.size} naloga.`);
  if (existing.size) console.log(`Već postoje u novoj bazi (preskočeni): ${[...existing].join(", ")}`);
  if (passwordConflicts.length) {
    console.log(`Različite lozinke u različitim bazama — zadržana lozinka iz prve navedene:\n  ${passwordConflicts.join("\n  ")}`);
  }
  const formerSupers = [...merged].filter(([, u]) => u.isSuper).map(([e, u]) => `${e} (${u.codes.join(", ")})`);
  if (formerSupers.length) {
    console.log(`Bivši isSuper nalozi (postali ADMIN, unapredi ručno ako treba):\n  ${formerSupers.join("\n  ")}`);
  }

  await newPrisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
