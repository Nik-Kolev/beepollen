import { existsSync } from "node:fs";
import { defineConfig, env } from "prisma/config";

if (!process.env.DATABASE_URL) {
  if (!existsSync(".env")) {
    throw new Error(
      "DATABASE_URL is not set and no .env file was found. Copy .env.example to .env.",
    );
  }

  process.loadEnvFile();
}

export default defineConfig({
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx --env-file-if-exists=.env prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
