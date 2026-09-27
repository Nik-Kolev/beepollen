import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-emails";

export const requireAdmin = cache(async () => {
  const session = await auth();
  const email = session?.user?.email;
  if (!isAdminEmail(email)) redirect("/admin/login");
  return { email };
});
