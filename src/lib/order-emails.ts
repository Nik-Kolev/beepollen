import type { OrderEventKind } from "@/generated/prisma/enums";
import {
  orderAcceptedEmail,
  orderCancelledEmail,
  type OrderEmailData,
  orderSentEmail,
  ownerNotificationEmail,
  subscriptionConfirmEmail,
  withdrawalReceivedEmail,
} from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/transport";
import prisma from "@/lib/prisma";
import {
  confirmUrl,
  isSubscribed,
  unsubscribeHeaders,
  unsubscribeUrl,
} from "@/lib/subscriptions";

export type Send = typeof sendEmail;

export const EMAIL_STEPS = ["send", "cancel"] as const;
export type EmailStep = (typeof EMAIL_STEPS)[number];

export function isEmailStep(step: string): step is EmailStep {
  return (EMAIL_STEPS as readonly string[]).includes(step);
}

const STEP_KIND: Record<EmailStep, OrderEventKind> = {
  send: "SEND",
  cancel: "CANCEL",
};

async function loadOrder(reference: string) {
  const order = await prisma.order.findUnique({
    where: { reference },
    select: {
      id: true,
      reference: true,
      contactName: true,
      contactPhone: true,
      customer: { select: { id: true, email: true } },
      consents: {
        where: { kind: "OFFERS" },
        select: { id: true, confirmedAt: true, withdrawnAt: true },
      },
      items: {
        orderBy: { id: "asc" },
        select: { name: true, quantity: true, unitPriceCents: true },
      },
      deliveryCents: true,
      totalCents: true,
      officeName: true,
      officeStreet: true,
      sentAt: true,
      withdrawnAt: true,
    },
  });
  if (!order) return null;

  const data: OrderEmailData = {
    reference: order.reference,
    contactName: order.contactName,
    contactPhone: order.contactPhone,
    email: order.customer.email,
    items: order.items,
    deliveryCents: order.deliveryCents,
    totalCents: order.totalCents,
    office:
      order.officeName && order.officeStreet
        ? { name: order.officeName, street: order.officeStreet }
        : null,
  };
  return { order, data };
}

async function latestEvent(orderId: number, kind: OrderEventKind) {
  return prisma.orderEvent.findFirst({
    where: { orderId, kind },
    orderBy: { id: "desc" },
    select: { id: true },
  });
}

function unsubscribeLinks(customerId: number) {
  try {
    return {
      url: unsubscribeUrl(customerId),
      headers: unsubscribeHeaders(customerId),
    };
  } catch (error) {
    console.error("Unsubscribe link could not be signed:", error);
    return null;
  }
}

async function report(label: string, work: () => Promise<void>) {
  try {
    await work();
  } catch (error) {
    console.error(`Order email "${label}" could not be handled:`, error);
  }
}

export function sendPlacedEmails(
  reference: string,
  repeated: boolean,
  send: Send = sendEmail,
  ownerEmail = process.env.OWNER_EMAIL,
) {
  return report(`placed ${reference}`, async () => {
    const loaded = await loadOrder(reference);
    if (!loaded) return;
    const { order, data } = loaded;
    const customerId = order.customer.id;
    const subscribed = await isSubscribed(customerId);
    const links = subscribed ? unsubscribeLinks(customerId) : null;

    const status = await send({
      to: data.email,
      message: orderAcceptedEmail({ ...data, unsubscribeUrl: links?.url }),
      idempotencyKey: `order-accepted/${reference}`,
      headers: links?.headers,
    });
    const placed = await latestEvent(order.id, "PLACED");
    if (placed) {
      await prisma.orderEvent.updateMany({
        where: {
          id: placed.id,
          OR: [{ emailStatus: null }, { emailStatus: { not: "SENT" } }],
        },
        data: { emailStatus: status },
      });
    }

    if (!repeated && ownerEmail) {
      await send({
        to: ownerEmail,
        message: ownerNotificationEmail(data),
        idempotencyKey: `owner-notification/${reference}`,
      });
    }

    const pending = order.consents.find(
      (consent) => !consent.confirmedAt && !consent.withdrawnAt,
    );
    if (!subscribed && pending) {
      await send({
        to: data.email,
        message: subscriptionConfirmEmail({
          reference,
          confirmUrl: confirmUrl(pending.id),
        }),
        idempotencyKey: `subscription-confirm/${pending.id}`,
      });
    }
  });
}

export function sendStepEmail(
  reference: string,
  step: EmailStep,
  eventId: number,
  send: Send = sendEmail,
) {
  return report(`${step} ${reference}`, async () => {
    const loaded = await loadOrder(reference);
    if (!loaded) return;
    const { order, data } = loaded;

    const event = await prisma.orderEvent.findFirst({
      where: { id: eventId, orderId: order.id, kind: STEP_KIND[step] },
      select: { id: true },
    });
    if (!event) return;

    const message =
      step === "cancel"
        ? orderCancelledEmail(data)
        : data.office
          ? orderSentEmail({ ...data, office: data.office })
          : null;
    if (!message) return;

    const status = await send({
      to: data.email,
      message,
      idempotencyKey: `order-${step}/${event.id}`,
    });
    await prisma.orderEvent.update({
      where: { id: event.id },
      data: { emailStatus: status },
    });
  });
}

export function sendWithdrawalEmail(reference: string, send: Send = sendEmail) {
  return report(`withdrawal ${reference}`, async () => {
    const loaded = await loadOrder(reference);
    const withdrawnAt = loaded?.order.withdrawnAt;
    if (!loaded || !withdrawnAt) return;
    const { order, data } = loaded;

    const status = await send({
      to: data.email,
      message: withdrawalReceivedEmail({
        reference,
        withdrawnAt,
        sent: order.sentAt !== null,
      }),
      idempotencyKey: `withdrawal/${reference}`,
    });
    const event = await latestEvent(order.id, "WITHDRAWN");
    if (event) {
      await prisma.orderEvent.update({
        where: { id: event.id },
        data: { emailStatus: status },
      });
    }
  });
}
