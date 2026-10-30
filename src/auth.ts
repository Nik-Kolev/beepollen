import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { isAdminEmail } from "@/lib/admin-emails";

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Google({ authorization: { params: { prompt: "select_account" } } }),
  ],
  callbacks: {
    signIn({ profile }) {
      return profile?.email_verified === true && isAdminEmail(profile.email);
    },
  },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
});
