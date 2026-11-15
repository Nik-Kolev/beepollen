"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { requireAdmin } from "@/lib/admin-session";
import {
  type CampaignPreview,
  type CampaignStartResult,
  previewCampaign,
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
    const { id } = result;
    after(() => sendCampaignNow(id));
    revalidatePath("/admin/campaigns");
  }
  return result;
}
