import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { after, test } from "node:test";
import type { Readable } from "node:stream";

import prisma from "@/lib/prisma";

after(async () => {
  await prisma.$disconnect();
});

async function nextOutput(
  stdout: Readable,
  exited: Promise<unknown[]>,
  step: string,
) {
  const died = exited.then(([code]) => {
    throw new Error(`the child exited ${code} before ${step}`);
  });
  died.catch(() => {});
  await Promise.race([once(stdout, "data"), died]);
}

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

async function holdLock() {
  const holder = spawn(process.execPath, ["--import", "tsx", "-e", HOLD_LOCK], {
    stdio: ["ignore", "pipe", "inherit"],
  });
  const exited = once(holder, "exit");
  await nextOutput(holder.stdout, exited, "locking");
  return exited;
}

test("a write waits for another process's lock instead of failing at once", async () => {
  const exited = await holdLock();

  const write =
    await prisma.$executeRaw`UPDATE "Product" SET "sortOrder" = "sortOrder"`.then(
      () => null,
      (error: unknown) => error,
    );
  const [exitCode] = await exited;

  assert.equal(write, null);
  assert.equal(exitCode, 0);
});

const WRITE_ON_SIGNAL = `
  import("@/lib/prisma").then(async (module) => {
    const prisma = module.default.default ?? module.default;
    await prisma.$queryRaw\`SELECT 1\`;
    process.stdout.write("ready");
    await new Promise((resolve) => process.stdin.once("data", resolve));
    process.stdout.write("writing");
    await prisma.$executeRaw\`UPDATE "Product" SET "sortOrder" = "sortOrder"\`;
    await prisma.$disconnect();
  });
`;

test("a transaction that has read survives another process starting a write before its own", async () => {
  const writer = spawn(
    process.execPath,
    ["--import", "tsx", "-e", WRITE_ON_SIGNAL],
    { stdio: ["pipe", "pipe", "inherit"] },
  );
  const exited = once(writer, "exit");
  await nextOutput(writer.stdout, exited, "connecting");

  const write = await prisma
    .$transaction(async (tx) => {
      await tx.product.findFirst();
      writer.stdin.end("go\n");
      await nextOutput(writer.stdout, exited, "writing");
      await new Promise((resolve) => setTimeout(resolve, 500));
      await tx.$executeRaw`UPDATE "Product" SET "sortOrder" = "sortOrder"`;
    })
    .then(
      () => null,
      (error: unknown) => error,
    );
  if (write !== null) writer.kill();
  const [exitCode] = await exited;

  assert.equal(write, null);
  assert.equal(exitCode, 0);
});
