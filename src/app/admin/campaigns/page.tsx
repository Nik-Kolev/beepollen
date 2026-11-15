import type { Metadata } from "next";

import { AdminHeader } from "@/components/admin/admin-header";
import { CampaignForm } from "@/components/admin/campaign-form";
import { requireAdmin } from "@/lib/admin-session";
import {
  CAMPAIGN_SAMPLE_TEXT,
  campaignOptions,
  recentCampaign,
} from "@/lib/campaign-messages";
import {
  CAMPAIGN_PRODUCTS_MAX,
  CAMPAIGN_TEXT_MAX,
  campaignBudget,
  countCampaignRecipients,
} from "@/lib/campaigns";

export const metadata: Metadata = {
  title: "Кампании",
};

export default async function AdminCampaigns() {
  const { email } = await requireAdmin("/admin/campaigns");
  const [options, subscribers, budget, recent] = await Promise.all([
    campaignOptions(),
    countCampaignRecipients(),
    campaignBudget(),
    recentCampaign(),
  ]);

  return (
    <div className="w-full">
      <AdminHeader
        title="Кампании"
        email={email}
        current="/admin/campaigns"
        legend="Изпратете имейл до всички абонати — за текуща промоция или за ново зареждане. На ден тръгват до 80 имейла, за да останат 20 за поръчките."
      />

      <section className="bg-surface ring-line mt-6 rounded-xl p-4 shadow-sm ring-1 sm:p-5">
        <h2 className="text-lg font-semibold">Нова кампания</h2>
        <CampaignForm
          promotions={options.promotions}
          products={options.products}
          subscribers={subscribers}
          budget={budget}
          recent={recent}
          sampleText={CAMPAIGN_SAMPLE_TEXT}
          textMax={CAMPAIGN_TEXT_MAX}
          productsMax={CAMPAIGN_PRODUCTS_MAX}
        />
      </section>
    </div>
  );
}
