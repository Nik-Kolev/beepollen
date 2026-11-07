import type { Metadata } from "next";

import { AdminHeader } from "@/components/admin/admin-header";
import { OwnerAnswerForm } from "@/components/admin/owner-answer-form";
import { SampleEmailForm } from "@/components/admin/sample-email-form";
import { requireAdmin } from "@/lib/admin-session";
import { renderLayout } from "@/lib/email/layout";
import { SAMPLE_DEFAULT_ADDRESS } from "@/lib/email/samples";
import {
  EMAIL_ANSWER_KEY,
  EMAIL_ANSWER_QUESTION,
  listOwnerAnswers,
  PRODUCT_ANSWER_LABEL,
  type ProductAnswerField,
  productAnswerKey,
} from "@/lib/owner-answers";
import { OWNER_TODOS, owedProductFields } from "@/lib/owner-todos";
import { listPublishedProductsForTodos } from "@/lib/products";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "За попълване",
};

const CARD = "bg-surface ring-line rounded-xl p-4 shadow-sm ring-1 sm:p-5";

const SAMPLE_EMAIL = renderLayout({
  preheader: "",
  heading: "Примерен имейл",
  bodyHtml: "",
}).replaceAll(`${SITE_URL}/email/`, "/email/");

export default async function AdminTodo() {
  const { email } = await requireAdmin("/admin/todo");
  const [products, answers] = await Promise.all([
    listPublishedProductsForTodos(),
    listOwnerAnswers(),
  ]);

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

      <section aria-labelledby="products-heading" className={`${CARD} mt-4`}>
        <h2 id="products-heading" className="text-lg font-semibold">
          Продукти в базата
        </h2>
        <ul role="list" className="mt-3 flex flex-col gap-6">
          {products.map((product) => {
            const fields: ProductAnswerField[] = [
              "price",
              ...owedProductFields(product),
            ];

            return (
              <li key={product.slug}>
                <h3 className="font-medium">{product.name}</h3>
                {fields.map((field) => {
                  const key = productAnswerKey(product.slug, field);
                  return (
                    <OwnerAnswerForm
                      key={key}
                      answerKey={key}
                      label={PRODUCT_ANSWER_LABEL[field]}
                      initial={answers.get(key) ?? ""}
                    />
                  );
                })}
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

      <section aria-labelledby="emails-heading" className={`${CARD} mt-4`}>
        <h2 id="emails-heading" className="text-lg font-semibold">
          Имейли
        </h2>
        <p className="text-ink-soft mt-1 text-sm">
          Рамката, в която сайтът праща всеки имейл. Текстовете ще напишем ние —
          тук можете да оставите предложения.
        </p>
        <iframe
          title="Примерен имейл"
          srcDoc={SAMPLE_EMAIL}
          sandbox=""
          className="border-line mt-3 h-[28rem] w-full rounded-lg border bg-white"
        />
        <OwnerAnswerForm
          answerKey={EMAIL_ANSWER_KEY}
          label={EMAIL_ANSWER_QUESTION}
          initial={answers.get(EMAIL_ANSWER_KEY) ?? ""}
        />
        <SampleEmailForm initial={SAMPLE_DEFAULT_ADDRESS} />
      </section>
    </div>
  );
}
