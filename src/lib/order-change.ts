import { formatPrice } from "@/lib/money";
import { z } from "@/lib/zod";

const orderChangeSchema = z.discriminatedUnion("field", [
  z.object({
    field: z.enum(["name", "email", "phone", "delivery", "item"]),
    from: z.string(),
    to: z.string(),
  }),
  z.object({
    field: z.enum(["deliveryCents", "totalCents"]),
    from: z.number(),
    to: z.number(),
  }),
]);

export type OrderChange = z.infer<typeof orderChangeSchema>;

export const ORDER_CHANGE_LABEL: Record<OrderChange["field"], string> = {
  name: "Име",
  email: "Имейл",
  phone: "Телефон",
  delivery: "Доставка",
  item: "Продукт",
  deliveryCents: "Цена на доставката",
  totalCents: "Общо",
};

export function parseOrderChanges(value: unknown): OrderChange[] {
  const parsed = z.array(orderChangeSchema).safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function changeText(value: string | number) {
  return typeof value === "number" ? formatPrice(value) : value;
}
