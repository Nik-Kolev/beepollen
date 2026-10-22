import type { Metadata } from "next";

import { unsubscribeAction } from "@/app/(shop)/subscription/actions";
import { SubscriptionStep } from "@/components/subscription-step";
import { readEmailToken } from "@/lib/email-token";
import { OWNER_PHONE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Отписване от офертите",
  alternates: { canonical: "/subscription/unsubscribe" },
  robots: { index: false, follow: false },
  referrer: "same-origin",
};

export default async function UnsubscribePage(
  props: PageProps<"/subscription/unsubscribe">,
) {
  const { token, result } = await props.searchParams;

  if (result === "unsubscribed") {
    return (
      <SubscriptionStep
        heading="Отписахте се"
        text="Няма да ви изпращаме повече оферти и напомняния. Имейлите за поръчките ви ще продължат да идват."
      />
    );
  }

  if (
    result === undefined &&
    typeof token === "string" &&
    readEmailToken(token, "unsubscribe") !== null
  ) {
    return (
      <SubscriptionStep
        heading="Отписване от офертите"
        text="Натиснете бутона и спираме офертите и напомнянията по имейл."
        form={{ action: unsubscribeAction, token, label: "Отписване" }}
      />
    );
  }

  return (
    <SubscriptionStep
      heading="Връзката не е валидна"
      text={`Връзката е непълна. Обадете ни се на ${OWNER_PHONE.display} и ще ви отпишем.`}
    />
  );
}
