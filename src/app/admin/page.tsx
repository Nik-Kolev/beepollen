import type { Metadata } from "next";

import { requireAdmin } from "@/lib/admin-session";

import { signOutOfAdmin } from "./actions";

export const metadata: Metadata = {
  title: "Администрация",
};

export default async function Admin() {
  const { email } = await requireAdmin();

  return (
    <>
      <h1 className="text-2xl font-semibold">Администрация</h1>
      <p className="text-ink-soft">Влезли сте като {email}.</p>
      <form action={signOutOfAdmin}>
        <button
          type="submit"
          className="bg-action text-action-ink hover:bg-action-hover rounded-md px-4 py-2 text-sm transition-colors"
        >
          Изход
        </button>
      </form>
    </>
  );
}
