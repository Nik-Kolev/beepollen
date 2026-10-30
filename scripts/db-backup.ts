import { mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import path from "node:path";

import { PrismaLibSql } from "@prisma/adapter-libsql";

import { PrismaClient } from "@/generated/prisma/client";
import { backupName, backupsToPrune, sofiaDate } from "@/lib/backup-retention";

function client(url: string) {
  return new PrismaClient({
    adapter: new PrismaLibSql({ url, timeout: 5000 }),
  });
}

async function copyAndCheck(
  databaseUrl: string,
  target: string,
): Promise<string[]> {
  const source = client(databaseUrl);

  try {
    await source.$executeRaw`VACUUM INTO ${target}`;
    await source.$executeRaw`ATTACH DATABASE ${target} AS copy`;
    try {
      const rows = await source.$queryRaw<
        { integrity_check: string }[]
      >`PRAGMA copy.integrity_check`;

      return rows.map((row) => row.integrity_check);
    } finally {
      await source.$executeRaw`DETACH DATABASE copy`;
    }
  } finally {
    await source.$disconnect();
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl?.startsWith("file:")) {
    throw new Error("DATABASE_URL must point at a SQLite file");
  }

  const directory = path.resolve(process.env.BACKUP_DIR ?? "data/backups");
  const name = backupName(sofiaDate(new Date()));
  const target = path.join(directory, name);
  const pending = `${target}.${process.pid}.tmp`;

  mkdirSync(directory, { recursive: true });
  rmSync(pending, { force: true });

  try {
    const integrity = await copyAndCheck(databaseUrl, pending);

    if (integrity.length !== 1 || integrity[0] !== "ok") {
      throw new Error(
        `Backup failed its integrity check: ${integrity.join("; ")}`,
      );
    }
  } catch (error) {
    try {
      rmSync(pending, { force: true });
    } catch {}
    throw error;
  }

  renameSync(pending, target);
  console.log(`Backed up to ${target}`);

  for (const old of backupsToPrune(readdirSync(directory))) {
    rmSync(path.join(directory, old));
    console.log(`Pruned ${old}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
