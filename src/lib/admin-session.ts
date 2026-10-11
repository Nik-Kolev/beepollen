import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-emails";

export const requireAdmin = cache(async () => {
  if (process.env.ADMIN_WITHOUT_SIGN_IN === "true") return { email: null };

  const session = await auth();
  const email = session?.user?.email;
  if (!isAdminEmail(email)) redirect("/admin/login");
  return { email };
});

export async function isAdmin() {
  if (process.env.ADMIN_WITHOUT_SIGN_IN === "true") return true;

  const session = await auth();
  return isAdminEmail(session?.user?.email);
}
