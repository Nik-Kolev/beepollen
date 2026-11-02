import { z } from "zod";

import { OWNER_TODOS, PRODUCT_FIELD_LABEL } from "@/lib/owner-todos";
import prisma from "@/lib/prisma";

export const EMAIL_ANSWER_KEY = "emails";

export const EMAIL_ANSWER_QUESTION = "Предложения за имейлите";

export const PRODUCT_ANSWER_LABEL = {
  price: "Цена (€)",
  ...PRODUCT_FIELD_LABEL,
} as const;

export type ProductAnswerField = keyof typeof PRODUCT_ANSWER_LABEL;

export const OWNER_ANSWER_MAX_LENGTH = 5000;

const QUESTION_BY_ID = new Map(
  OWNER_TODOS.flatMap((group) =>
    group.items.flatMap((item) => (item.id ? [[item.id, item.text]] : [])),
  ),
);

const PRODUCT_KEY = /^product:([a-z0-9-]{1,100}):([A-Za-z]{1,40})$/;

export function productAnswerKey(slug: string, field: ProductAnswerField) {
  return `product:${slug}:${field}`;
}

function productKeyParts(key: string) {
  const match = PRODUCT_KEY.exec(key);
  if (!match || !Object.hasOwn(PRODUCT_ANSWER_LABEL, match[2])) return null;
  return { slug: match[1], field: match[2] as ProductAnswerField };
}

export function isOwnerAnswerKey(key: string) {
  return (
    key === EMAIL_ANSWER_KEY ||
    QUESTION_BY_ID.has(key) ||
    productKeyParts(key) !== null
  );
}

const ownerAnswerInput = z.object({
  key: z.string().max(200).refine(isOwnerAnswerKey),
  text: z.string(),
});

export type OwnerAnswerResult =
  { ok: true } | { ok: false; code: "INVALID_INPUT" | "TOO_LONG" };

export async function saveOwnerAnswer(
  input: unknown,
  updatedBy: string,
): Promise<OwnerAnswerResult> {
  const parsed = ownerAnswerInput.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };

  const { key } = parsed.data;
  const text = parsed.data.text.trim();
  if (text.length > OWNER_ANSWER_MAX_LENGTH) {
    return { ok: false, code: "TOO_LONG" };
  }

  await prisma.ownerAnswer.upsert({
    where: { key },
    create: { key, text, updatedBy },
    update: { text, updatedBy },
  });
  return { ok: true };
}

export async function listOwnerAnswers() {
  const answers = await prisma.ownerAnswer.findMany({
    select: { key: true, text: true },
  });
  return new Map(answers.map(({ key, text }) => [key, text]));
}

export async function exportOwnerAnswers(
  products: { slug: string; name: string }[],
) {
  const productName = new Map(products.map(({ slug, name }) => [slug, name]));
  const productRank = new Map(products.map(({ slug }, index) => [slug, index]));
  const fieldRank = Object.keys(PRODUCT_ANSWER_LABEL);
  const todoRank = [...QUESTION_BY_ID.keys()];

  function rank(key: string): [number, number, number] {
    const product = productKeyParts(key);
    if (product) {
      return [
        0,
        productRank.get(product.slug) ?? products.length,
        fieldRank.indexOf(product.field),
      ];
    }
    if (key === EMAIL_ANSWER_KEY) return [2, 0, 0];
    return [1, todoRank.indexOf(key), 0];
  }

  const answers = await prisma.ownerAnswer.findMany({
    where: { text: { not: "" } },
  });
  answers.sort((a, b) => {
    const [x, y] = [rank(a.key), rank(b.key)];
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
  });

  return answers.map(({ key, text, updatedBy, updatedAt }) => {
    const product = productKeyParts(key);
    const question = product
      ? `${productName.get(product.slug) ?? product.slug}: ${PRODUCT_ANSWER_LABEL[product.field]}`
      : key === EMAIL_ANSWER_KEY
        ? EMAIL_ANSWER_QUESTION
        : (QUESTION_BY_ID.get(key) ?? key);

    return {
      key,
      question,
      text,
      updatedBy,
      updatedAt: updatedAt.toISOString(),
    };
  });
}
