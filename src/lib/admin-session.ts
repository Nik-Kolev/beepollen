import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-emails";
import { adminLoginPath } from "@/lib/admin-return";

export const requireAdmin = cache(async (returnTo?: string) => {
  const session = await auth();
  const email = session?.user?.email;
  if (!isAdminEmail(email)) {
    redirect(returnTo ? adminLoginPath(returnTo) : "/admin/login");
  }
  return { email };
});

export async function isAdmin() {
  const session = await auth();
  return isAdminEmail(session?.user?.email);
}
