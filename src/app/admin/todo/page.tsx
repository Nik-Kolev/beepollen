import type { Metadata } from "next";

import { AdminHeader } from "@/components/admin/admin-header";
import { requireAdmin } from "@/lib/admin-session";
import { missingProductFields, OWNER_TODOS } from "@/lib/owner-todos";
import { listPublishedProductsForTodos } from "@/lib/products";

export const metadata: Metadata = {
  title: "За попълване",
};

const CARD = "bg-surface ring-line rounded-xl p-4 shadow-sm ring-1 sm:p-5";

export default async function AdminTodo() {
  const { email } = await requireAdmin();
  const products = await listPublishedProductsForTodos();

  return (
    <div className="w-full">
      <AdminHeader
        title="За попълване"
        email={email}
        current="/admin/todo"
        legend="Всичко, което сайтът още чака от вас: данни, истински числа на мястото на измислените и отворени въпроси."
      />

      <section aria-labelledby="products-heading" className={`${CARD} mt-4`}>
        <h2 id="products-heading" className="text-lg font-semibold">
          Продукти в базата
        </h2>
        <ul role="list" className="mt-3 flex flex-col gap-3">
          {products.map((product) => {
            const missing = missingProductFields(product);

            return (
              <li key={product.slug}>
                <p className="font-medium">{product.name}</p>
                <p className="text-ink-soft text-sm">
                  {missing.length === 0
                    ? "Всичко е попълнено."
                    : `Липсва: ${missing.join(", ")}.`}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      {OWNER_TODOS.map((group) => (
        <section
          key={group.title}
          aria-label={group.title}
          className={`${CARD} mt-4`}
        >
          <h2 className="text-lg font-semibold">{group.title}</h2>
          <ul role="list" className="mt-3 flex flex-col gap-3">
            {group.items.map((item) => (
              <li key={item.text}>
                <p>{item.text}</p>
                {item.files.length > 0 && (
                  <p className="text-ink-soft font-mono text-xs break-all">
                    {item.files.join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
