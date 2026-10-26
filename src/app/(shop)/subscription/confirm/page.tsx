import type { Metadata } from "next";

import { confirmAction } from "@/app/(shop)/subscription/actions";
import { SubscriptionStep } from "@/components/subscription-step";
import { readEmailToken } from "@/lib/email-token";

export const metadata: Metadata = {
  title: "Потвърждаване на абонамента",
  alternates: { canonical: "/subscription/confirm" },
  robots: { index: false, follow: false },
  referrer: "strict-origin",
};

export default async function ConfirmPage(
  props: PageProps<"/subscription/confirm">,
) {
  const { token, result } = await props.searchParams;

  if (result === "confirmed") {
    return (
      <SubscriptionStep
        heading="Абонаментът е потвърден"
        text="Ще ви пишем, когато имаме оферти или напомняния. Във всеки такъв имейл има връзка за отписване."
      />
    );
  }

  if (
    result === undefined &&
    typeof token === "string" &&
    readEmailToken(token, "confirm") !== null
  ) {
    return (
      <SubscriptionStep
        heading="Потвърдете абонамента"
        text="Потвърдете, че искате да получавате оферти и напомняния по имейл."
        form={{
          action: confirmAction,
          token,
          label: "Потвърждавам абонамента",
        }}
      />
    );
  }

  return (
    <SubscriptionStep
      heading="Връзката не е валидна"
      text="Връзката е непълна или абонаментът вече е прекратен. Ако искате да се абонирате, отметнете полето за оферти при следващата си поръчка."
    />
  );
}
