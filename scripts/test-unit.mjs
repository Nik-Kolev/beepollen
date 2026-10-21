import { execFileSync, execSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";

const env = {
  ...process.env,
  DATABASE_URL: "file:./data/test.db",
  ORDERING_OPEN: "true",
};
const REPORT = "data/test-unit.tap";
const ACCESS_VIOLATION = 3221225477;

function setUpDatabase() {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    rmSync(`data/test.db${suffix}`, { force: true });
  }

  execSync("npm run db:setup", { env, stdio: "inherit" });
  execFileSync(
    process.execPath,
    ["--import", "tsx", "scripts/seed-test-fixtures.ts"],
    { env, stdio: "inherit" },
  );
}

function runTests(files) {
  rmSync(REPORT, { force: true });

  try {
    execFileSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "--test",
        "--test-concurrency=1",
        "--test-reporter=spec",
        "--test-reporter-destination=stdout",
        "--test-reporter=tap",
        `--test-reporter-destination=${REPORT}`,
        ...files,
      ],
      { env, stdio: "inherit" },
    );
    return true;
  } catch {
    return false;
  }
}

function filesCrashedAfterPassing() {
  if (!existsSync(REPORT)) return null;

  const blocks = readFileSync(REPORT, "utf8")
    .split(/^(?= *not ok )/m)
    .slice(1);
  const crashed = blocks.map((block) => {
    const name = block.match(/^not ok \d+ - (.+)$/m);
    const crash = block.match(/^ {2}exitCode: (\d+)$/m);
    return name && Number(crash?.[1]) === ACCESS_VIOLATION
      ? name[1].replaceAll("\\\\", "\\")
      : null;
  });

  return crashed.length > 0 && crashed.every(Boolean) ? crashed : null;
}

setUpDatabase();

if (!runTests(["tests/**/*.test.ts"])) {
  const crashed = filesCrashedAfterPassing();
  if (!crashed) process.exit(1);

  console.log(
    `\nRe-running once, after the Windows libsql teardown crash: ${crashed.join(", ")}\n`,
  );
  setUpDatabase();
  if (!runTests(crashed)) process.exit(1);
}
