// prisma.config.ts — Prisma 7 više ne čita .env sam niti drži URL baze u
// schema.prisma; CLI (migrate, generate) uzima konekciju odavde.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
