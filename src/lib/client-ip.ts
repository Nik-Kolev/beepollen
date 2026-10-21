import { headers } from "next/headers";

export function ipFromHeaders(requestHeaders: Pick<Headers, "get">) {
  const real = requestHeaders.get("x-real-ip")?.trim();

  if (real) return real;

  const hops = requestHeaders.get("x-forwarded-for")?.split(",") ?? [];

  return hops[hops.length - 1]?.trim() || null;
}

export async function clientIp() {
  return ipFromHeaders(await headers());
}
