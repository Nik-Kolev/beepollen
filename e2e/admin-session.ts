import type { BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";

import { TEST_AUTH_SECRET } from "./admin-env";

const COOKIE = "authjs.session-token";

export async function signInAs(
  context: BrowserContext,
  email: string,
  secret = TEST_AUTH_SECRET,
) {
  const value = await encode({
    secret,
    salt: COOKIE,
    token: { email, name: "Test", sub: email },
  });

  await context.addCookies([
    {
      name: COOKIE,
      value,
      url: "http://localhost:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
