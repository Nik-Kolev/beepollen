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
  legend,
}: {
  title: string;
  email: string | null | undefined;
  current: AdminSection;
  legend: string;
}) {
  return (
    <div className="bg-ground border-line sticky top-0 z-10 -mx-4 border-b px-4 pt-2 pb-3 sm:-mx-6 sm:px-6">
      <h1 className="sr-only">{title}</h1>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Админ">
          <ul role="list" className="flex gap-1">
            {SECTIONS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={href === current ? "page" : undefined}
                  className={`${href === current ? "text-ink border-brand-deep" : "text-ink-soft hover:text-ink border-transparent"} inline-flex min-h-12 items-center border-b-4 px-2 text-lg font-semibold transition-colors sm:px-3 sm:text-xl`}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          {email && <p className="text-ink-soft text-sm">{email}</p>}
          <Link
            href="/"
            className="border-line text-ink bg-surface hover:bg-halo inline-flex min-h-11 items-center rounded-md border-2 px-3 text-sm font-semibold transition-colors sm:px-4"
          >
            Към сайта
          </Link>
          <form action={signOutOfAdmin}>
            <button
              type="submit"
              className="border-action text-action bg-surface hover:bg-action hover:text-action-ink min-h-11 rounded-md border-2 px-3 text-sm font-semibold transition-colors sm:px-4"
            >
              Изход
            </button>
          </form>
        </div>
      </div>
      <p className="text-ink-soft mt-2 max-w-3xl text-sm">{legend}</p>
    </div>
  );
}
