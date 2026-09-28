import { rmSync } from "node:fs";

for (const suffix of ["", "-journal", "-wal", "-shm"]) {
  rmSync(`data/e2e.db${suffix}`, { force: true });
}
