import assert from "node:assert/strict";
import { test } from "node:test";

import { backupName, backupsToPrune, sofiaDate } from "@/lib/backup-retention";

function dailyBackups(from: string, to: string): string[] {
  const names: string[] = [];
  const day = new Date(`${from}T00:00:00Z`);
  const last = new Date(`${to}T00:00:00Z`);

  while (day <= last) {
    names.push(backupName(day.toISOString().slice(0, 10)));
    day.setUTCDate(day.getUTCDate() + 1);
  }

  return names;
}

test("nothing is pruned while there are seven backups or fewer", () => {
  assert.deepEqual(
    backupsToPrune(dailyBackups("2026-10-24", "2026-10-30")),
    [],
  );
});

test("four months of daily backups keep 7 days, 4 weeks and 3 months", () => {
  const names = dailyBackups("2026-07-03", "2026-10-30");
  const kept = new Set(
    [
      "2026-10-24",
      "2026-10-25",
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-18",
      "2026-10-11",
      "2026-09-30",
      "2026-08-31",
    ].map(backupName),
  );

  assert.deepEqual(
    backupsToPrune(names).sort(),
    names.filter((name) => !kept.has(name)).sort(),
  );
});

test("a week is Monday to Sunday, so the Sunday before a Monday is its own week", () => {
  const names = [
    ...dailyBackups("2026-10-24", "2026-10-30"),
    backupName("2026-10-19"),
    backupName("2026-10-18"),
  ];

  assert.deepEqual(backupsToPrune(names), [backupName("2026-10-19")]);
});

test("backups that stopped months ago are kept rather than all pruned", () => {
  const names = ["2026-10-30", "2026-03-02", "2026-01-15"].map(backupName);

  assert.deepEqual(backupsToPrune(names), []);
});

test("files that are not dated backups are never pruned", () => {
  const names = [
    ...dailyBackups("2026-07-03", "2026-10-30"),
    "beepollen-2026-07-03.db.tmp",
    "notes.txt",
    "beepollen-latest.db",
    "beepollen-2026-13-01.db",
    "beepollen-2026-02-30.db",
  ];

  const pruned = backupsToPrune(names);

  assert.ok(!pruned.includes("beepollen-2026-07-03.db.tmp"));
  assert.ok(!pruned.includes("notes.txt"));
  assert.ok(!pruned.includes("beepollen-latest.db"));
  assert.ok(!pruned.includes("beepollen-2026-13-01.db"));
  assert.ok(!pruned.includes("beepollen-2026-02-30.db"));
});

test("weeks and months that cross a new year are counted like any other", () => {
  const names = dailyBackups("2025-11-01", "2026-01-10");
  const kept = new Set(
    [
      "2026-01-04",
      "2026-01-05",
      "2026-01-06",
      "2026-01-07",
      "2026-01-08",
      "2026-01-09",
      "2026-01-10",
      "2025-12-28",
      "2025-12-21",
      "2025-12-31",
      "2025-11-30",
    ].map(backupName),
  );

  assert.deepEqual(
    backupsToPrune(names).sort(),
    names.filter((name) => !kept.has(name)).sort(),
  );
});

test("the backup date is the date in Sofia, not in UTC", () => {
  assert.equal(sofiaDate(new Date("2026-10-30T22:30:00Z")), "2026-10-31");
  assert.equal(sofiaDate(new Date("2026-07-01T21:30:00Z")), "2026-07-02");
  assert.equal(sofiaDate(new Date("2026-07-01T20:30:00Z")), "2026-07-01");
});
