-- AlterTable: dodaje updatedAt na SpecialPromotion i WeeklyPlan, backfill
-- postojecih redova preko DEFAULT CURRENT_TIMESTAMP (kolona ostaje NOT NULL
-- posle, buduci upisi idu preko Prisma-inog @updatedAt).
ALTER TABLE "SpecialPromotion" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "WeeklyPlan" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
