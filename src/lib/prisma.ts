import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";

import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL is not set");
}

function writableUrl(url: string) {
  if (
    process.env.VERCEL !== "1" ||
    process.env.CI ||
    !url.startsWith("file:")
  ) {
    return url;
  }
  const bundled = path.resolve(url.slice("file:".length));
  const copy = path.join("/tmp", path.basename(bundled));
  if (!existsSync(copy)) copyFileSync(bundled, copy);
  return `file:${copy}`;
}

const adapter = new PrismaLibSql({ url: writableUrl(url), timeout: 5000 });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
