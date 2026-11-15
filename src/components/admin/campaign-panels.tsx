"use client";

import { type ComponentProps, useState } from "react";

import { CampaignForm } from "@/components/admin/campaign-form";
import { CampaignHistory } from "@/components/admin/campaign-history";

type FormProps = Omit<
  ComponentProps<typeof CampaignForm>,
  "budget" | "onSpent"
>;

const SECTION =
  "bg-surface ring-line mt-6 rounded-xl p-4 shadow-sm ring-1 sm:p-5";

export function CampaignPanels({
  budget: initialBudget,
  history,
  ...form
}: FormProps & {
  budget: number;
  history: ComponentProps<typeof CampaignHistory>["campaigns"];
}) {
  const [budget, setBudget] = useState(initialBudget);
  const spend = (count: number) =>
    setBudget((left) => Math.max(0, left - count));

  return (
    <>
      <section className={SECTION}>
        <h2 className="text-lg font-semibold">Нова кампания</h2>
        <CampaignForm {...form} budget={budget} onSpent={spend} />
      </section>

      <section className={SECTION}>
        <h2 className="text-lg font-semibold">Изпратени кампании</h2>
        <CampaignHistory campaigns={history} onSpent={spend} />
      </section>
    </>
  );
}
