-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SUPER_ADMIN');

-- DropIndex
DROP INDEX "public"."WeeklyPlan_year_month_weekday_key";

-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "marketId" TEXT,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'ADMIN';

-- Backfill: preserve isSuper=true as SUPER_ADMIN before dropping the column
UPDATE "AdminUser" SET "role" = 'SUPER_ADMIN' WHERE "isSuper" = true;

ALTER TABLE "AdminUser" DROP COLUMN "isSuper";

-- AlterTable
CREATE SEQUENCE calendarsettings_id_seq;
ALTER TABLE "CalendarSettings" ADD COLUMN     "marketId" TEXT NOT NULL,
ALTER COLUMN "id" SET DEFAULT nextval('calendarsettings_id_seq');
ALTER SEQUENCE calendarsettings_id_seq OWNED BY "CalendarSettings"."id";

-- AlterTable
ALTER TABLE "SpecialPromotion" ADD COLUMN     "flipCard" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "WeeklyPlan" ADD COLUMN     "marketId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "locales" TEXT[],
    "defaultLocale" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Market_code_key" ON "Market"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Market_domain_key" ON "Market"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSettings_marketId_key" ON "CalendarSettings"("marketId");

-- CreateIndex
CREATE INDEX "SpecialPromotion_marketId_year_month_idx" ON "SpecialPromotion"("marketId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyPlan_marketId_year_month_weekday_key" ON "WeeklyPlan"("marketId", "year", "month", "weekday");

-- AddForeignKey
ALTER TABLE "CalendarSettings" ADD CONSTRAINT "CalendarSettings_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialPromotion" ADD CONSTRAINT "SpecialPromotion_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyPlan" ADD CONSTRAINT "WeeklyPlan_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE SET NULL ON UPDATE CASCADE;

