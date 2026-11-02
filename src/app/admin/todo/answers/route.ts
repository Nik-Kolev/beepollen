import { isAdmin } from "@/lib/admin-session";
import { sofiaDate } from "@/lib/backup-retention";
import { exportOwnerAnswers } from "@/lib/owner-answers";
import { listPublishedProductsForTodos } from "@/lib/products";

export async function GET() {
  if (!(await isAdmin())) return new Response(null, { status: 404 });

  const answers = await exportOwnerAnswers(
    await listPublishedProductsForTodos(),
  );

  return Response.json(answers, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="beepollen-answers-${sofiaDate(new Date())}.json"`,
    },
  });
}
