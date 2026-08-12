// scripts/migrate-market.mjs
// Opšta ETL skripta: stara market baza -> promo-platform.
// Samo čita iz stare baze (raw SQL, stare šeme se razlikuju po tržištu),
// upisuje u novu sa marketId = dati market. Bezbedno za ponovno pokretanje
// (briše pa upisuje iznova za taj market, ne dira druge).
//
// WeeklyPromotion (auto-recurring, ukinuto u novoj platformi) se NE
// migrira u šemu — samo dumpuje u JSON kao backup pre nego što se stara
// baza ugasi.
import { PrismaClient } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";

const [, , MARKET_CODE, OLD_DATABASE_URL, OLD_PROJECT_DIR] = process.argv;
if (!MARKET_CODE || !OLD_DATABASE_URL || !OLD_PROJECT_DIR) {
  console.error("Usage: node scripts/migrate-market.mjs <marketCode> <old-database-url> <old-project-dir>");
  console.error("Example: node scripts/migrate-market.mjs tz postgresql://... ../calendar-next-tz");
  process.exit(1);
}

const OLD_UPLOADS_DIR = path.resolve(import.meta.dirname, "..", OLD_PROJECT_DIR, "public/uploads");
const NEW_UPLOADS_DIR = path.resolve(import.meta.dirname, "../public/uploads", MARKET_CODE);
const DUMP_DIR = path.resolve(import.meta.dirname, "../migration-dumps");

const newPrisma = new PrismaClient();
const oldPrisma = new PrismaClient({ datasources: { db: { url: OLD_DATABASE_URL } } });

function rewriteUploadsDeep(value) {
  if (value == null) return value;
  if (typeof value === "string") return value.replaceAll("/uploads/", `/uploads/${MARKET_CODE}/`);
  if (Array.isArray(value)) return value.map(rewriteUploadsDeep);
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = rewriteUploadsDeep(v);
    return out;
  }
  return value;
}

async function copyUploads() {
  await fs.mkdir(NEW_UPLOADS_DIR, { recursive: true });
  let entries;
  try {
    entries = await fs.readdir(OLD_UPLOADS_DIR, { withFileTypes: true });
  } catch (err) {
    if (err.code === "ENOENT") {
      console.log(`Nema public/uploads foldera kod ${MARKET_CODE}, preskačem kopiranje slika.`);
      return 0;
    }
    throw err;
  }
  let count = 0;
  for (const e of entries) {
    if (!e.isFile()) continue;
    await fs.copyFile(path.join(OLD_UPLOADS_DIR, e.name), path.join(NEW_UPLOADS_DIR, e.name));
    count++;
  }
  return count;
}

async function tableExists(name) {
  const rows = await oldPrisma.$queryRawUnsafe(
    `SELECT to_regclass('"${name}"')::text as exists`
  );
  return rows[0]?.exists != null;
}

async function main() {
  const market = await newPrisma.market.findUniqueOrThrow({ where: { code: MARKET_CODE } });
  console.log(`Market ${MARKET_CODE} -> ${market.id}`);

  const copied = await copyUploads();
  console.log(`Kopirano ${copied} fajlova u public/uploads/${MARKET_CODE}/ (privremeno, dok se ne dobije prava produkciona galerija)`);

  // --- CalendarSettings ---
  const [oldSettings] = await oldPrisma.$queryRawUnsafe(`SELECT * FROM "CalendarSettings" LIMIT 1`);
  if (oldSettings) {
    const data = {
      bgImageUrl: rewriteUploadsDeep(oldSettings.bgImageUrl),
      bgImageUrlMobile: rewriteUploadsDeep(oldSettings.bgImageUrlMobile),
      monthBackgrounds: rewriteUploadsDeep(oldSettings.monthBackgrounds),
      calendarPosition: oldSettings.calendarPosition,
      calendarTitle: oldSettings.calendarTitle,
      logoUrl: rewriteUploadsDeep(oldSettings.logoUrl),
      theme: oldSettings.theme,
      seoMeta: oldSettings.seoMeta,
      countdownTargetIso: oldSettings.countdownTargetIso,
      countdownLabel: oldSettings.countdownLabel,
      leaderboard: oldSettings.leaderboard,
    };
    await newPrisma.calendarSettings.upsert({
      where: { marketId: market.id },
      update: data,
      create: { marketId: market.id, ...data },
    });
    console.log("CalendarSettings migriran.");
  } else {
    console.log("Nema CalendarSettings reda u staroj bazi.");
  }

  // --- SpecialPromotion ---
  const oldSpecials = await oldPrisma.$queryRawUnsafe(`SELECT * FROM "SpecialPromotion"`);
  await newPrisma.specialPromotion.deleteMany({ where: { marketId: market.id } });
  for (const r of oldSpecials) {
    await newPrisma.specialPromotion.create({
      data: {
        marketId: market.id,
        year: r.year,
        month: r.month,
        day: r.day,
        title: r.title,
        link: r.link,
        button: r.button,
        active: r.active,
        icon: rewriteUploadsDeep(r.icon),
        buttonColor: r.buttonColor,
        rich: rewriteUploadsDeep(r.rich),
        richHtml: rewriteUploadsDeep(r.richHtml),
        scratch: r.scratch ?? false,
        flipCard: r.flipCard ?? false,
        knockoutPhase: r.knockoutPhase ?? null,
        translations: rewriteUploadsDeep(r.translations),
        category: r.category,
      },
    });
  }
  console.log(`SpecialPromotion: ${oldSpecials.length} redova migrirano.`);

  // --- WeeklyPlan ---
  const oldWeekly = await oldPrisma.$queryRawUnsafe(`SELECT * FROM "WeeklyPlan"`);
  await newPrisma.weeklyPlan.deleteMany({ where: { marketId: market.id } });
  for (const r of oldWeekly) {
    await newPrisma.weeklyPlan.create({
      data: {
        marketId: market.id,
        year: r.year,
        month: r.month,
        weekday: r.weekday,
        title: r.title,
        link: r.link,
        button: r.button,
        active: r.active,
        icon: rewriteUploadsDeep(r.icon),
        rich: rewriteUploadsDeep(r.rich),
        richHtml: rewriteUploadsDeep(r.richHtml),
        buttonColor: r.buttonColor,
        scratch: r.scratch ?? false,
        translations: rewriteUploadsDeep(r.translations),
        category: r.category,
      },
    });
  }
  console.log(`WeeklyPlan: ${oldWeekly.length} redova migrirano.`);

  // --- WeeklyPromotion: NE migrira se, samo backup dump (ukinuto u novoj platformi) ---
  if (await tableExists("WeeklyPromotion")) {
    const oldWeeklyPromo = await oldPrisma.$queryRawUnsafe(`SELECT * FROM "WeeklyPromotion"`);
    await fs.mkdir(DUMP_DIR, { recursive: true });
    const dumpPath = path.join(DUMP_DIR, `${MARKET_CODE}-weekly-promotion-backup.json`);
    await fs.writeFile(dumpPath, JSON.stringify(oldWeeklyPromo, null, 2), "utf8");
    console.log(`WeeklyPromotion: ${oldWeeklyPromo.length} redova dumpovano u ${dumpPath} (ne migrira se u šemu).`);
  }

  await newPrisma.$disconnect();
  await oldPrisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
