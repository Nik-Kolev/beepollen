import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaLibSql({ url, timeout: 5000 });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
