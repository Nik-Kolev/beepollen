import type { Metadata } from "next";

import { AdminHeader } from "@/components/admin/admin-header";
import { CampaignPanels } from "@/components/admin/campaign-panels";
import { requireAdmin } from "@/lib/admin-session";
import {
  availableBudget,
  CAMPAIGN_SAMPLE_TEXT,
  campaignHistory,
  campaignOptions,
  recentCampaign,
} from "@/lib/campaign-messages";
import {
  CAMPAIGN_PRODUCTS_MAX,
  CAMPAIGN_TEXT_MAX,
  countCampaignRecipients,
} from "@/lib/campaigns";

export const metadata: Metadata = {
  title: "Кампании",
};

export default async function AdminCampaigns() {
  const { email } = await requireAdmin("/admin/campaigns");
  const [options, subscribers, budget, recent, history] = await Promise.all([
    campaignOptions(),
    countCampaignRecipients(),
    availableBudget(),
    recentCampaign(),
    campaignHistory(),
  ]);

  return (
    <div className="w-full">
      <AdminHeader
        title="Кампании"
        email={email}
        current="/admin/campaigns"
        legend="Изпратете имейл до всички абонати — за текуща промоция или за ново зареждане. На ден тръгват до 80 имейла, за да останат 20 за поръчките."
      />

      <CampaignPanels
        promotions={options.promotions}
        products={options.products}
        subscribers={subscribers}
        budget={budget}
        recent={recent}
        sampleText={CAMPAIGN_SAMPLE_TEXT}
        textMax={CAMPAIGN_TEXT_MAX}
        productsMax={CAMPAIGN_PRODUCTS_MAX}
        history={history}
      />
    </div>
  );
}
