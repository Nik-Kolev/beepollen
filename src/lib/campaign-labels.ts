export const CAMPAIGN_KIND_LABEL = {
  PROMOTION: "Промоция",
  RESTOCK: "Ново зареждане",
} as const;

export function formatCampaignDay(day: string) {
  const [year, month, date] = day.split("-");
  return `${date}.${month}.${year}`;
}

function joinNames(names: string[]) {
  return names.length < 2
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} и ${names.at(-1)}`;
}

export function promotionSampleText(productName: string, endsOn: string) {
  return `${productName} е на промоция. Важи до изчерпване на количествата или до ${formatCampaignDay(endsOn)}.`;
}

export function restockSampleText(productNames: string[]) {
  const what =
    productNames.length > 0 ? joinNames(productNames) : "пчелен прашец";
  return `Ново зареждане на ${what}. Възползвайте се!`;
}

export function countWord(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}
