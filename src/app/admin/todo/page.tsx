import type { Metadata } from "next";

import { AdminHeader } from "@/components/admin/admin-header";
import { OwnerAnswerForm } from "@/components/admin/owner-answer-form";
import { requireAdmin } from "@/lib/admin-session";
import { listOwnerAnswers, productAnswerKey } from "@/lib/owner-answers";
import {
  OWNER_PAGE_GROUPS,
  owedProductFields,
  PRODUCT_FIELD_LABEL,
} from "@/lib/owner-todos";
import { listPublishedProductsForTodos } from "@/lib/products";

export const metadata: Metadata = {
  title: "За попълване",
};

const CARD = "bg-surface ring-line rounded-xl p-4 shadow-sm ring-1 sm:p-5";

export default async function AdminTodo() {
  const { email } = await requireAdmin("/admin/todo");
  const [published, answers] = await Promise.all([
    listPublishedProductsForTodos(),
    listOwnerAnswers(),
  ]);
  const products = published
    .map((product) => ({ product, fields: owedProductFields(product) }))
    .filter(({ fields }) => fields.length > 0);

  return (
    <div className="w-full">
      <AdminHeader
        title="За попълване"
        email={email}
        current="/admin/todo"
        legend="Напишете каквото знаете под всеки въпрос и натиснете „Запази“."
      />

      <a
        href="/admin/todo/answers"
        download
        className="text-brand-deep mt-4 inline-flex min-h-11 items-center font-medium underline underline-offset-4"
      >
        Изтегли отговорите
      </a>

      {products.length > 0 && (
        <section aria-labelledby="products-heading" className={`${CARD} mt-4`}>
          <h2 id="products-heading" className="text-lg font-semibold">
            Продукти в базата
          </h2>
          <ul role="list" className="mt-3 flex flex-col gap-6">
            {products.map(({ product, fields }) => (
              <li key={product.slug}>
                <h3 className="font-medium">{product.name}</h3>
                {fields.map((field) => {
                  const key = productAnswerKey(product.slug, field);
                  return (
                    <OwnerAnswerForm
                      key={key}
                      answerKey={key}
                      label={PRODUCT_FIELD_LABEL[field]}
                      initial={answers.get(key) ?? ""}
                    />
                  );
                })}
              </li>
            ))}
          </ul>
        </section>
      )}

      {OWNER_PAGE_GROUPS.map((group) => (
        <section
          key={group.title}
          aria-label={group.title}
          className={`${CARD} mt-4`}
        >
          <h2 className="text-lg font-semibold">{group.title}</h2>
          <ul role="list" className="mt-3 flex flex-col gap-5">
            {group.items.map((item) => (
              <li key={item.text}>
                {item.id ? (
                  <OwnerAnswerForm
                    answerKey={item.id}
                    label={item.text}
                    initial={answers.get(item.id) ?? ""}
                  />
                ) : (
                  <p>{item.text}</p>
                )}
                {item.files.length > 0 && (
                  <p className="text-ink-soft mt-1 font-mono text-xs break-all">
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
