export function analyticsCookieNames(cookies: string): string[] {
  return cookies
    .split(";")
    .map((pair) => pair.split("=")[0].trim())
    .filter((name) => name === "_ga" || name.startsWith("_ga_"));
}

export function expiringWrites(name: string, hostname: string): string[] {
  const labels = hostname.split(".");
  const domains = labels
    .slice(0, -1)
    .map((_, index) => labels.slice(index).join("."));

  return [
    `${name}=; Max-Age=0; Path=/`,
    ...domains.map(
      (domain) => `${name}=; Max-Age=0; Path=/; Domain=.${domain}`,
    ),
  ];
}

export function clearAnalyticsCookies(
  target: { cookie: string } = document,
  hostname = location.hostname,
) {
  for (const name of analyticsCookieNames(target.cookie)) {
    for (const write of expiringWrites(name, hostname)) {
      target.cookie = write;
    }
  }
}
