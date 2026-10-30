const hits = new Map<string, number[]>();

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
