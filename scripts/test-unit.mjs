import { execFileSync, execSync } from "node:child_process";
import { rmSync } from "node:fs";

const env = { ...process.env, DATABASE_URL: "file:./data/test.db" };

for (const suffix of ["", "-journal", "-wal", "-shm"]) {
  rmSync(`data/test.db${suffix}`, { force: true });
}

// Node 24 refuses to spawn a .cmd shim without a shell, and npm is one on
// Windows; the string is fixed, so nothing is interpolated into it.
execSync("npm run db:setup", { env, stdio: "inherit" });

execFileSync(
  process.execPath,
  ["--import", "tsx", "--test", "--test-concurrency=1", "tests/**/*.test.ts"],
  { env, stdio: "inherit" },
);
