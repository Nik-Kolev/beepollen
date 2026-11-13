import { eraseCustomer, isSettled } from "@/lib/customer-erasure";
import prisma from "@/lib/prisma";

const USAGE = "Usage: npm run customer:erase -- <email> [--yes]";

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--yes");
  const emails = args.filter((arg) => arg !== "--yes");

  if (emails.length !== 1) {
    console.error(USAGE);
    return 1;
  }

  const [email] = emails;
  const result = await eraseCustomer(email, { apply });

  if (!result.found) {
    console.log(`No customer with the email ${email}.`);
    return 1;
  }

  const orders =
    result.orders
      .map(({ reference, status }) => `${reference} (${status})`)
      .join(", ") || "none";

  if (result.applied) {
    console.log(`Erased. Orders kept without personal data: ${orders}.`);
    return 0;
  }

  const open = result.orders.some(({ status }) => !isSettled(status));

  if (open) {
    console.log(
      `Not erased: an order is still open. Orders: ${orders}. Erase once every one is paid, cancelled or collected.`,
    );
    return apply ? 1 : 0;
  }

  console.log(
    `Found, nothing changed. Orders: ${orders}. Run again with --yes to erase.`,
  );
  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
