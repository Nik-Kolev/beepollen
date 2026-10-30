import { revalidatePath } from "next/cache";

import { isRevalidateAuthorized } from "@/lib/revalidate-auth";

export async function POST(request: Request) {
  if (!isRevalidateAuthorized(request.headers.get("authorization"))) {
    return new Response(null, { status: 401 });
  }

  revalidatePath("/", "layout");
  return new Response(null, { status: 204 });
}
