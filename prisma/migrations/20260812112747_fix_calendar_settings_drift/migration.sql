/*
  Warnings:

  - You are about to drop the `WeeklyPromotion` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PromoCategory" ADD VALUE 'GOLD';
ALTER TYPE "PromoCategory" ADD VALUE 'QUARTER_FINAL';
ALTER TYPE "PromoCategory" ADD VALUE 'SEMI_FINAL';
ALTER TYPE "PromoCategory" ADD VALUE 'FINAL';

-- AlterTable
ALTER TABLE "CalendarSettings" ADD COLUMN     "bgImageUrlMobile" TEXT,
ADD COLUMN     "calendarPosition" TEXT,
ADD COLUMN     "calendarTitle" JSONB,
ADD COLUMN     "countdownLabel" TEXT,
ADD COLUMN     "countdownTargetIso" TEXT,
ADD COLUMN     "leaderboard" JSONB,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "monthBackgrounds" JSONB,
ADD COLUMN     "theme" TEXT;

-- AlterTable
ALTER TABLE "SpecialPromotion" ADD COLUMN     "knockoutPhase" TEXT;

-- DropTable
DROP TABLE "public"."WeeklyPromotion";
