import { EMAIL_WARNING_LIMIT, emailUsage } from "@/lib/email/usage";
import prisma from "@/lib/prisma";

async function main() {
  const { sent, overLimit } = await emailUsage();

  console.log(
    `Emails sent in the last 24 hours: ${sent} (warning at ${EMAIL_WARNING_LIMIT}, Resend's free plan allows 100)`,
  );
  return overLimit ? 1 : 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 2;
  })
  .finally(() => prisma.$disconnect());
