// In-process on purpose: one Node process on one droplet. It resets on deploy,
// and on a multi-instance host it would count per instance.
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

  // Re-inserting moves the key to the end of the Map's iteration order, which
  // is what the eviction below reads as "least recently used".
  hits.delete(key);

  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }

  recent.push(now);
  hits.set(key, recent);

  // A key only prunes itself when asked about again, so one nobody returns to
  // would sit there for the life of the process.
  if (hits.size > MAX_KEYS) {
    for (const [other, timestamps] of hits) {
      if (timestamps.every((at) => at <= since)) hits.delete(other);
    }
  }

  // A burst of distinct keys inside one window leaves nothing stale to sweep,
  // and Map iterates in insertion order, so this drops the least recent.
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
