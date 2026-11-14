import prisma from "@/lib/prisma";

export const EMAIL_WARNING_LIMIT = 80;
const EMAIL_USAGE_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function emailUsage(now = new Date()) {
  const sent = await prisma.emailSend.count({
    where: {
      status: "SENT",
      createdAt: {
        gte: new Date(now.getTime() - EMAIL_USAGE_WINDOW_MS),
        lte: now,
      },
    },
  });
  return { sent, overLimit: sent >= EMAIL_WARNING_LIMIT };
}
