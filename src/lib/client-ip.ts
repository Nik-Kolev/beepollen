import { headers } from "next/headers";

export async function clientIp() {
  const requestHeaders = await headers();
  const real = requestHeaders.get("x-real-ip")?.trim();

  if (real) return real;

  const hops = requestHeaders.get("x-forwarded-for")?.split(",") ?? [];

  return hops[hops.length - 1]?.trim() || null;
}
