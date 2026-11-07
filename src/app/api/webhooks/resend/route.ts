import { handleEmailEvent, readWebhookEvent } from "@/lib/email-webhooks";

export async function POST(request: Request) {
  const event = await readWebhookEvent(request);
  if (!event) return new Response(null, { status: 401 });

  await handleEmailEvent(event);
  return new Response(null, { status: 204 });
}
