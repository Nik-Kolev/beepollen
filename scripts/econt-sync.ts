import { existsSync } from "node:fs";

import type { EcontOfficeRecord } from "@/lib/econt";
import { fetchEcontOffices } from "@/lib/econt-nomenclature";
import {
  readOfficeSnapshot,
  SNAPSHOT_PATH,
  writeOfficeSnapshot,
} from "@/lib/econt-snapshot";

function byCode(offices: EcontOfficeRecord[]): Map<string, EcontOfficeRecord> {
  return new Map(offices.map((office) => [office.code, office]));
}

function describe(office: EcontOfficeRecord): string {
  return `${office.code} ${office.city}, ${office.name}`;
}

function report(previous: EcontOfficeRecord[], next: EcontOfficeRecord[]) {
  const before = byCode(previous);
  const after = byCode(next);

  const added = next.filter((office) => !before.has(office.code));
  const removed = previous.filter((office) => !after.has(office.code));
  const changed = next.filter((office) => {
    const old = before.get(office.code);

    return old !== undefined && JSON.stringify(old) !== JSON.stringify(office);
  });

  for (const office of added) console.log(`  + ${describe(office)}`);
  for (const office of removed) console.log(`  - ${describe(office)}`);
  for (const office of changed) console.log(`  ~ ${describe(office)}`);

  console.log(
    `${next.length} offices: ${added.length} added, ${removed.length} removed, ${changed.length} changed.`,
  );
}

async function main() {
  const previous = existsSync(SNAPSHOT_PATH) ? readOfficeSnapshot() : [];
  const next = await fetchEcontOffices();

  if (next.length === 0) {
    throw new Error("Econt returned no offices; the snapshot was left alone");
  }

  writeOfficeSnapshot(next);
  report(previous, next);
  console.log(`Wrote ${SNAPSHOT_PATH}. Review the diff before committing it.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
