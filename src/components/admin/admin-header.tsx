import Link from "next/link";

import { signOutOfAdmin } from "@/app/admin/actions";

const SECTIONS = [
  { href: "/admin/orders", label: "Поръчки" },
  { href: "/admin/products", label: "Продукти" },
] as const;

export type AdminSection = (typeof SECTIONS)[number]["href"];

export function AdminHeader({
  title,
  email,
  current,
}: {
  title: string;
  email: string | null | undefined;
  current: AdminSection;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Админ">
          <ul role="list" className="flex gap-1">
            {SECTIONS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={href === current ? "page" : undefined}
                  className={`${href === current ? "text-ink border-brand-deep" : "text-ink-soft hover:text-ink border-transparent"} inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-medium transition-colors`}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-ink-soft text-sm">{email}</p>
          <form action={signOutOfAdmin}>
            <button
              type="submit"
              className="bg-action text-action-ink hover:bg-action-hover min-h-11 rounded-md px-4 text-sm transition-colors"
            >
              Изход
            </button>
          </form>
        </div>
      </div>
      <h1 className="text-2xl font-semibold">{title}</h1>
    </div>
  );
}
