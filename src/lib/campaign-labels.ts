export const CAMPAIGN_KIND_LABEL = {
  PROMOTION: "Промоция",
  RESTOCK: "Ново зареждане",
} as const;

export function formatCampaignDay(day: string) {
  const [year, month, date] = day.split("-");
  return `${date}.${month}.${year}`;
}
