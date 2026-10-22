import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-emails";

import { signInWithGoogle } from "../actions";

export const metadata: Metadata = {
  title: "Вход",
};

export default async function AdminLogin({
  searchParams,
}: PageProps<"/admin/login">) {
  if (process.env.ADMIN_WITHOUT_SIGN_IN === "true") redirect("/admin");

  const [{ error }, session] = await Promise.all([searchParams, auth()]);
  if (isAdminEmail(session?.user?.email)) redirect("/admin");

  const code = Array.isArray(error) ? error[0] : error;
  const message =
    code === "AccessDenied" || session?.user
      ? "Този Google акаунт няма достъп."
      : code
        ? "Входът не успя. Опитайте отново."
        : null;

  return (
    <div className="flex min-h-[70vh] w-full items-center justify-center">
      <div className="bg-surface ring-line relative w-full max-w-sm overflow-hidden rounded-2xl p-6 shadow-lg ring-1">
        <div
          aria-hidden="true"
          className="from-brand to-action absolute inset-x-0 top-0 h-1.5 bg-linear-to-r"
        />
        <div className="mb-6 text-center">
          <h1 className="text-brand-deep text-2xl font-semibold">
            Вход за администратора
          </h1>
          <p className="text-ink-soft mt-1 text-sm">
            Пчелни продукти Д &amp; Н Димитрови
          </p>
        </div>

        {message && (
          <p
            role="alert"
            className="border-error text-error mb-4 rounded-md border p-3 text-center text-sm"
          >
            {message}
          </p>
        )}

        <form action={signInWithGoogle}>
          <button
            type="submit"
            className="border-brand-deep text-ink hover:bg-ground flex min-h-11 w-full items-center justify-center gap-2.5 bg-surface rounded-lg border-2 px-4 font-medium transition-colors"
          >
            <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Вход с Google
          </button>
        </form>

        <div className="border-line mt-4 border-t pt-4 text-center">
          <Link
            href="/"
            className="text-ink-soft hover:text-brand-deep inline-flex min-h-11 items-center gap-1.5 text-sm transition-colors"
          >
            <span aria-hidden="true">&larr;</span>
            Към магазина
          </Link>
        </div>
      </div>
    </div>
  );
}
