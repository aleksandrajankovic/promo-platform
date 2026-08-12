-- Add seoMeta JSONB column to CalendarSettings for editable meta title/description
ALTER TABLE "CalendarSettings" ADD COLUMN "seoMeta" JSONB;
