import { isIPv6 } from "node:net";

const hits = new Map<string, number[]>();

function ipv6Groups(address: string): number[] {
  const [head, tail] = address.split("::");
  const parse = (part: string) =>
    part === ""
      ? []
      : part.split(":").flatMap((group) => {
          if (!group.includes(".")) return [Number.parseInt(group, 16)];

          const [a, b, c, d] = group.split(".").map(Number);
          return [a * 256 + b, c * 256 + d];
        });
  const leading = parse(head);
  const trailing = tail === undefined ? [] : parse(tail);

  return [
    ...leading,
    ...new Array<number>(8 - leading.length - trailing.length).fill(0),
    ...trailing,
  ];
}

export function rateLimitSubject(ipAddress: string): string {
  const address = ipAddress.split("%")[0];
  if (!isIPv6(address)) return ipAddress;

  const groups = ipv6Groups(address);
  const mapped =
    groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff;
  if (mapped) {
    return [groups[6] >> 8, groups[6] & 255, groups[7] >> 8, groups[7] & 255]
      .map(String)
      .join(".");
  }

  return `${groups
    .slice(0, 4)
    .map((group) => group.toString(16))
    .join(":")}::/64`;
}

export const MAX_KEYS = 10_000;

export type RateLimitOptions = { limit: number; windowMs: number };

export function takeToken(
  key: string,
  { limit, windowMs }: RateLimitOptions,
  now = Date.now(),
): boolean {
  const since = now - windowMs;
  const recent = (hits.get(key) ?? []).filter((at) => at > since);

  hits.delete(key);

  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }

  recent.push(now);
  hits.set(key, recent);

  if (hits.size > MAX_KEYS) {
    for (const [other, timestamps] of hits) {
      if (timestamps.every((at) => at <= since)) hits.delete(other);
    }
  }

  while (hits.size > MAX_KEYS) {
    const oldest = hits.keys().next();

    if (oldest.done) break;

    hits.delete(oldest.value);
  }

  return true;
}

export function resetRateLimits() {
  hits.clear();
}
