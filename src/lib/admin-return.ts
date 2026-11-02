const BASE = "http://admin.invalid";

export function adminReturnPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/")) return "/admin";

  const url = new URL(value, BASE);
  const inAdmin =
    url.origin === BASE &&
    (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) &&
    url.pathname !== "/admin/login" &&
    !url.pathname.startsWith("/admin/login/");

  return inAdmin ? `${url.pathname}${url.search}` : "/admin";
}

export function adminLoginPath(returnTo: string) {
  return `/admin/login?next=${encodeURIComponent(returnTo)}`;
}
