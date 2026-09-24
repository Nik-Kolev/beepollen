import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { z } from "zod";

import type { EcontOfficeRecord } from "@/lib/econt";

// Committed so a fresh database — CI, Vercel, a new clone — can be seeded
// without reaching Econt during a build.
export const SNAPSHOT_PATH = path.join(
  process.cwd(),
  "prisma",
  "data",
  "econt-offices.json",
);

const snapshotSchema = z.array(
  z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    city: z.string().min(1),
    postCode: z.string().nullable(),
    street: z.string(),
    hours: z.string(),
    phone: z.string().nullable(),
    location: z.object({ lat: z.number(), lng: z.number() }).nullable(),
  }),
);

export function readOfficeSnapshot(): EcontOfficeRecord[] {
  return snapshotSchema.parse(JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")));
}

export function writeOfficeSnapshot(offices: EcontOfficeRecord[]): void {
  writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(offices, null, 2)}\n`, "utf8");
}
