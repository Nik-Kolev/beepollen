import { signOutOfAdmin } from "@/app/admin/actions";

export function AdminHeader({
  title,
  email,
}: {
  title: string;
  email: string | null | undefined;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-ink-soft text-sm">{email}</p>
        <form action={signOutOfAdmin}>
          <button
            type="submit"
            className="bg-action text-action-ink hover:bg-action-hover rounded-md px-4 py-2 text-sm transition-colors"
          >
            Изход
          </button>
        </form>
      </div>
    </div>
  );
}
