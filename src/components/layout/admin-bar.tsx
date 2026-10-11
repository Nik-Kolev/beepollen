"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { signOutOfAdmin } from "@/app/admin/actions";
import { Container } from "@/components/container";

const LINKS = [
  { href: "/admin/orders", label: "Към поръчки" },
  { href: "/admin/products", label: "Към продукти" },
] as const;

const ITEM =
  "inline-flex min-h-11 items-center px-1.5 font-medium underline-offset-4 hover:underline sm:px-3";

export function AdminBar() {
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin-status", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { admin?: boolean } | null) =>
        setAdmin(body?.admin === true),
      )
      .catch(() => {});
    return () => controller.abort();
  }, []);

  if (!admin) return null;

  return (
    <div className="bg-footer-ink text-footer">
      <Container>
        <nav
          aria-label="Админ"
          className="flex flex-wrap items-center justify-center text-sm"
        >
          {LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className={ITEM}>
              {label}
            </Link>
          ))}
          <form action={signOutOfAdmin}>
            <button type="submit" className={ITEM}>
              Изход от акаунта
            </button>
          </form>
        </nav>
      </Container>
    </div>
  );
}
