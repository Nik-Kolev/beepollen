import { execFileSync, execSync } from "node:child_process";
import { rmSync } from "node:fs";

const env = { ...process.env, DATABASE_URL: "file:./data/test.db" };

for (const suffix of ["", "-journal", "-wal", "-shm"]) {
  rmSync(`data/test.db${suffix}`, { force: true });
}

execSync("npm run db:setup", { env, stdio: "inherit" });

execFileSync(
  process.execPath,
  ["--import", "tsx", "--test", "--test-concurrency=1", "tests/**/*.test.ts"],
  { env, stdio: "inherit" },
);
