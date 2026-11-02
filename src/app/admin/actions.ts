"use server";

import { signIn, signOut } from "@/auth";
import { adminReturnPath } from "@/lib/admin-return";

export async function signInWithGoogle(formData: FormData) {
  await signIn("google", { redirectTo: adminReturnPath(formData.get("next")) });
}

export async function signOutOfAdmin() {
  await signOut({ redirectTo: "/admin/login" });
}
