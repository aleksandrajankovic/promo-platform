-- Natpis odbrojavanja postaje tekst po jeziku tržišta ({ "sw": "...", "en": "..." }),
-- kao calendarTitle/seoMeta. Postojeći tekst se čuva pod podrazumevanim jezikom
-- tržišta. (USING ne dozvoljava podupit, zato ide preko pomoćne kolone.)
ALTER TABLE "CalendarSettings" ADD COLUMN "countdownLabel_i18n" JSONB;

UPDATE "CalendarSettings" cs
SET "countdownLabel_i18n" = jsonb_build_object(COALESCE(m."defaultLocale", 'sr'), cs."countdownLabel")
FROM "Market" m
WHERE m."id" = cs."marketId" AND cs."countdownLabel" IS NOT NULL AND btrim(cs."countdownLabel") <> '';

ALTER TABLE "CalendarSettings" DROP COLUMN "countdownLabel";
ALTER TABLE "CalendarSettings" RENAME COLUMN "countdownLabel_i18n" TO "countdownLabel";
