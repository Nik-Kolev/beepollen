"use client";

import { useRef, useState, useTransition } from "react";

import { resumeCampaignAction } from "@/app/admin/campaigns/actions";
import { CAMPAIGN_KIND_LABEL, formatCampaignDay } from "@/lib/campaign-labels";
import type {
  CampaignHistoryEntry,
  CampaignResumeResult,
} from "@/lib/campaign-messages";

type Failure =
  Extract<CampaignResumeResult, { ok: false }>["code"] | "NOT_SAVED";

const FAILURE_TEXT: Record<Failure, string> = {
  UNKNOWN_CAMPAIGN: "Кампанията вече не съществува. Презаредете страницата.",
  NOTHING_PENDING: "Всички вече са получили имейла.",
  CAMPAIGN_OVER:
    "Промоцията е приключила или продуктите вече не се продават, затова останалите не получават имейла.",
  NO_BUDGET: "За днес лимитът от 80 имейла е изчерпан. Опитайте утре.",
  NOT_SAVED: "Не е изпратено. Опитайте отново.",
};

type RowStatus =
  | { kind: "failed"; code: Failure }
  | { kind: "started"; sendingNow: number; waiting: number };

function rowText(status: RowStatus) {
  if (status.kind === "failed") return FAILURE_TEXT[status.code];
  const waiting =
    status.waiting > 0 ? ` Още ${status.waiting} ще чакат следващ ден.` : "";
  return `Изпраща се до ${status.sendingNow}.${waiting}`;
}

export function CampaignHistory({
  campaigns,
  onSpent,
}: {
  campaigns: CampaignHistoryEntry[];
  onSpent: (count: number) => void;
}) {
  const [statuses, setStatuses] = useState<Record<number, RowStatus>>({});
  const [running, setRunning] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const busy = useRef(false);

  if (campaigns.length === 0) {
    return <p className="text-ink-soft mt-3">Още няма изпратени кампании.</p>;
  }

  function resume(id: number) {
    if (busy.current) return;
    busy.current = true;
    setRunning(id);
    startTransition(async () => {
      let next: RowStatus;
      try {
        const result = await resumeCampaignAction(id);
        if (result.ok) onSpent(result.sendingNow);
        next = result.ok
          ? {
              kind: "started",
              sendingNow: result.sendingNow,
              waiting: result.pending - result.sendingNow,
            }
          : { kind: "failed", code: result.code };
      } catch {
        next = { kind: "failed", code: "NOT_SAVED" };
      }
      setStatuses((current) => ({ ...current, [id]: next }));
      setRunning(null);
      busy.current = false;
    });
  }

  return (
    <ul role="list" className="mt-3 flex flex-col gap-2">
      {campaigns.map((campaign) => {
        const status = statuses[campaign.id];
        return (
          <li
            key={campaign.id}
            className="bg-ground flex flex-col gap-2 rounded-lg px-4 py-3 text-sm"
          >
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="tabular-nums">
                {formatCampaignDay(campaign.sentOn)}
              </span>
              <span className="font-medium">
                {CAMPAIGN_KIND_LABEL[campaign.kind]}
              </span>
              <span className="text-ink-soft">{campaign.subject}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="tabular-nums">
                Изпратени {campaign.sent} · Чакат {campaign.pending}
              </span>
              {campaign.pending > 0 && status?.kind !== "started" && (
                <button
                  type="button"
                  onClick={() => resume(campaign.id)}
                  aria-disabled={running !== null}
                  className="bg-action text-action-ink hover:bg-action-hover aria-disabled:bg-action-hover inline-flex min-h-11 items-center rounded-md px-4 font-semibold"
                >
                  {running === campaign.id
                    ? "Изпраща се…"
                    : "Изпрати на останалите"}
                </button>
              )}
              <span
                role="status"
                className={
                  status?.kind === "failed"
                    ? "text-error font-medium"
                    : "font-medium"
                }
              >
                {status ? rowText(status) : ""}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
