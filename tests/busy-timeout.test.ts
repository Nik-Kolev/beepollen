import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { after, test } from "node:test";

import prisma from "@/lib/prisma";

after(async () => {
  await prisma.$disconnect();
});

const HOLD_LOCK = `
  import("@/lib/prisma").then(async (module) => {
    const prisma = module.default.default ?? module.default;
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw\`UPDATE "Product" SET "sortOrder" = "sortOrder"\`;
      process.stdout.write("locked");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });
    await prisma.$disconnect();
  });
`;

test("a write waits for another process's lock instead of failing at once", async () => {
  const holder = spawn(process.execPath, ["--import", "tsx", "-e", HOLD_LOCK], {
    stdio: ["ignore", "pipe", "inherit"],
  });
  const exited = once(holder, "exit");
  await Promise.race([
    once(holder.stdout, "data"),
    exited.then(([code]) => {
      throw new Error(`the lock holder exited ${code} before locking`);
    }),
  ]);

  const write =
    await prisma.$executeRaw`UPDATE "Product" SET "sortOrder" = "sortOrder"`.then(
      () => null,
      (error: unknown) => error,
    );
  const [exitCode] = await exited;

  assert.equal(write, null);
  assert.equal(exitCode, 0);
});
