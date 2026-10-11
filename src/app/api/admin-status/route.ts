import { isAdmin } from "@/lib/admin-session";

export async function GET() {
  return Response.json(
    { admin: await isAdmin() },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
