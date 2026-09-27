import type { Metadata } from "next";
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
    <>
      <h1 className="text-2xl font-semibold">Вход за администратора</h1>
      {message && (
        <p role="alert" className="text-ink-soft">
          {message}
        </p>
      )}
      <form action={signInWithGoogle}>
        <button
          type="submit"
          className="bg-action text-action-ink hover:bg-action-hover rounded-md px-4 py-2 text-sm transition-colors"
        >
          Вход с Google
        </button>
      </form>
    </>
  );
}
