import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/admin-session";
import { EMAIL_DESIGNS } from "@/lib/email/layout";
import { PREVIEWS } from "@/lib/email/previews";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Имейли — преглед",
};

export default async function AdminEmails() {
  await requireAdmin();

  return (
    <div className="w-full">
      <h1 className="text-2xl font-semibold">Имейли — два варианта</h1>
      <p className="text-ink-soft mt-2 max-w-prose">
        Всеки имейл в дизайн A и дизайн B, с примерна поръчка. Сайтът праща
        дизайн A, докато не изберете.
      </p>
      <Link
        href="/admin/orders"
        className="text-brand-deep mt-2 inline-flex min-h-11 items-center font-medium underline underline-offset-4"
      >
        Към поръчките
      </Link>

      <div className="mt-6 flex flex-col gap-10">
        {PREVIEWS.map(({ title, render }) => (
          <section key={title} aria-label={title}>
            <h2 className="text-lg font-semibold">{title}</h2>
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              {EMAIL_DESIGNS.map((design) => {
                const message = render(design);

                return (
                  <figure key={design}>
                    <figcaption className="text-sm font-medium">
                      Дизайн {design} · Тема: {message.subject}
                    </figcaption>
                    <iframe
                      title={`${title}, дизайн ${design}`}
                      srcDoc={message.html.replaceAll(
                        `${SITE_URL}/email/`,
                        "/email/",
                      )}
                      sandbox=""
                      className="border-line mt-1 h-[40rem] w-full rounded-lg border bg-white"
                    />
                  </figure>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
