import { unsubscribe } from "@/lib/subscriptions";

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  await unsubscribe(token);
  return new Response(null, { status: 204 });
}
