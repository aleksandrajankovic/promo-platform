-- AdminUser.marketId (jedno tržište) -> implicitna many-to-many veza sa Market,
-- da jedan admin može da vodi više teritorija. Postojeće dodele se prepisuju u
-- join tabelu PRE brisanja kolone.

-- CreateTable
CREATE TABLE "_AdminUserToMarket" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AdminUserToMarket_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_AdminUserToMarket_B_index" ON "_AdminUserToMarket"("B");

-- AddForeignKey
ALTER TABLE "_AdminUserToMarket" ADD CONSTRAINT "_AdminUserToMarket_A_fkey" FOREIGN KEY ("A") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdminUserToMarket" ADD CONSTRAINT "_AdminUserToMarket_B_fkey" FOREIGN KEY ("B") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill postojećih dodela
INSERT INTO "_AdminUserToMarket" ("A", "B")
SELECT "id", "marketId" FROM "AdminUser" WHERE "marketId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "AdminUser" DROP CONSTRAINT "AdminUser_marketId_fkey";

-- AlterTable
ALTER TABLE "AdminUser" DROP COLUMN "marketId";
