"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { requireAdmin } from "@/lib/admin-session";
import {
  type CampaignPreview,
  type CampaignResumeResult,
  type CampaignStartResult,
  previewCampaign,
  resumeCampaign,
  sendCampaignNow,
  startCampaign,
} from "@/lib/campaign-messages";

export async function previewCampaignAction(
  input: unknown,
): Promise<CampaignPreview> {
  await requireAdmin();
  return previewCampaign(input);
}

export async function startCampaignAction(
  input: unknown,
): Promise<CampaignStartResult> {
  const { email } = await requireAdmin();
  const result = await startCampaign(input, email);
  if (result.ok) {
    const { id, sendingNow } = result;
    const queued = sendCampaignNow(id, sendingNow);
    after(() => queued);
    revalidatePath("/admin/campaigns");
  }
  return result;
}

export async function resumeCampaignAction(
  campaignId: unknown,
): Promise<CampaignResumeResult> {
  await requireAdmin();
  const result = await resumeCampaign(campaignId);
  if (result.ok) {
    const { id, sendingNow } = result;
    const queued = sendCampaignNow(id, sendingNow);
    after(() => queued);
    revalidatePath("/admin/campaigns");
  }
  return result;
}
