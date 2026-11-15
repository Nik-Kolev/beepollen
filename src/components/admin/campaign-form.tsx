"use client";

import {
  type SubmitEvent,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  previewCampaignAction,
  startCampaignAction,
} from "@/app/admin/campaigns/actions";
import { FIELD, FIELD_INVALID, LABEL } from "@/components/form-styles";
import { CAMPAIGN_KIND_LABEL, formatCampaignDay } from "@/lib/campaign-labels";
import type { RecentCampaign } from "@/lib/campaign-messages";
import type { CampaignRefusal } from "@/lib/campaigns";

type Kind = keyof typeof CAMPAIGN_KIND_LABEL;

type Failure = CampaignRefusal | "UNKNOWN_CAMPAIGN" | "NOT_SAVED";

const FAILURE_TEXT: Record<Failure, string> = {
  INVALID_INPUT: "Напишете текста на имейла.",
  PROMOTION_NOT_RUNNING: "Промоцията вече не тече. Презаредете страницата.",
  UNKNOWN_PRODUCT:
    "Някой от продуктите вече не се продава. Презаредете страницата.",
  NO_SUBSCRIBERS: "Още няма абонати.",
  UNKNOWN_CAMPAIGN: "Прегледът не стана. Презаредете страницата.",
  NOT_SAVED: "Не е изпратено. Опитайте отново.",
};

type Status =
  | { kind: "idle" }
  | { kind: "failed"; code: Failure }
  | { kind: "started"; sendingNow: number; waiting: number };

function Busy({ label }: { label: string }) {
  return (
    <>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-5 motion-safe:animate-spin"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.3"
          strokeWidth="3"
        />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </>
  );
}

function statusText(status: Status) {
  if (status.kind === "idle") return "";
  if (status.kind === "failed") return FAILURE_TEXT[status.code];
  const waiting =
    status.waiting > 0
      ? ` Останалите ${status.waiting} ще чакат „Изпрати на останалите“.`
      : "";
  return `Изпраща се до ${status.sendingNow} абонати.${waiting}`;
}

export function CampaignForm({
  promotions,
  products,
  subscribers,
  budget: initialBudget,
  recent: initialRecent,
  sampleText,
  textMax,
  productsMax,
}: {
  promotions: { id: number; label: string }[];
  products: { id: number; name: string }[];
  subscribers: number;
  budget: number;
  recent: RecentCampaign | null;
  sampleText: Record<Kind, string>;
  textMax: number;
  productsMax: number;
}) {
  const id = useId();
  const [kind, setKind] = useState<Kind>("PROMOTION");
  const [promotionId, setPromotionId] = useState(promotions[0]?.id ?? 0);
  const [productIds, setProductIds] = useState<number[]>([]);
  const [text, setText] = useState<string>(sampleText.PROMOTION);
  const [preview, setPreview] = useState<{
    subject: string;
    html: string;
  } | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [confirming, setConfirming] = useState(false);
  const [recent, setRecent] = useState(initialRecent);
  const [budget, setBudget] = useState(initialBudget);
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState<"preview" | "send" | null>(null);
  const busy = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!confirming || dialogRef.current?.open) return;
    dialogRef.current?.showModal();
    cancelRef.current?.focus();
  }, [confirming]);

  function changed() {
    setPreview(null);
    setStatus({ kind: "idle" });
  }

  function draft() {
    return kind === "PROMOTION"
      ? { kind, text, promotionId }
      : { kind, text, productIds };
  }

  const noPromotion = kind === "PROMOTION" && promotions.length === 0;
  const textInvalid =
    status.kind === "failed" && status.code === "INVALID_INPUT";

  function run(which: "preview" | "send", task: () => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    setRunning(which);
    startTransition(async () => {
      try {
        await task();
      } catch {
        setStatus({ kind: "failed", code: "NOT_SAVED" });
      } finally {
        busy.current = false;
        setRunning(null);
      }
    });
  }

  function showPreview() {
    if (text.trim() === "") {
      setStatus({ kind: "failed", code: "INVALID_INPUT" });
      return;
    }
    run("preview", async () => {
      const result = await previewCampaignAction(draft());
      if (result.ok) {
        setPreview({ subject: result.subject, html: result.html });
        setStatus({ kind: "idle" });
      } else setStatus({ kind: "failed", code: result.code });
    });
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    if (text.trim() === "") {
      setStatus({ kind: "failed", code: "INVALID_INPUT" });
      return;
    }
    if (subscribers === 0) {
      setStatus({ kind: "failed", code: "NO_SUBSCRIBERS" });
      return;
    }
    setConfirming(true);
  }

  function send() {
    const confirmedRecent = recent !== null;
    dialogRef.current?.close();
    setStatus({ kind: "idle" });
    run("send", async () => {
      const result = await startCampaignAction({
        campaign: draft(),
        confirmedRecent,
      });
      if (result.ok) {
        setStatus({
          kind: "started",
          sendingNow: result.sendingNow,
          waiting: result.recipients - result.sendingNow,
        });
        setRecent(result.sent);
        setBudget((left) => Math.max(0, left - result.sendingNow));
        setText(sampleText[kind]);
        setProductIds([]);
        setPreview(null);
      } else if (result.code === "RECENT") {
        setRecent(result.recent);
        setConfirming(true);
      } else setStatus({ kind: "failed", code: result.code });
    });
  }

  const sendingNow = Math.min(budget, subscribers);

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label="Нова кампания"
      className="mt-4 flex flex-col gap-5"
    >
      <fieldset className="flex flex-wrap gap-x-6 gap-y-2">
        <legend className={`${LABEL} mb-2`}>Вид</legend>
        {(["PROMOTION", "RESTOCK"] as const).map((option) => (
          <label key={option} className="flex min-h-11 items-center gap-2 pl-4">
            <input
              type="radio"
              name={`${id}-kind`}
              value={option}
              checked={kind === option}
              onChange={() => {
                if (text === sampleText[kind]) setText(sampleText[option]);
                setKind(option);
                changed();
              }}
              className="accent-action size-5"
            />
            {CAMPAIGN_KIND_LABEL[option]}
          </label>
        ))}
      </fieldset>

      {kind === "PROMOTION" &&
        (noPromotion ? (
          <p className="text-ink-soft">
            Днес не тече промоция. Добавете я от „Продукти“.
          </p>
        ) : (
          <div className="sm:max-w-xl">
            <label htmlFor={`${id}-promotion`} className={LABEL}>
              Промоция
            </label>
            <select
              id={`${id}-promotion`}
              value={promotionId}
              onChange={(event) => {
                setPromotionId(Number(event.target.value));
                changed();
              }}
              className={FIELD}
            >
              {promotions.map((promotion) => (
                <option key={promotion.id} value={promotion.id}>
                  {promotion.label}
                </option>
              ))}
            </select>
          </div>
        ))}

      {kind === "RESTOCK" && (
        <fieldset className="flex flex-col gap-1">
          <legend className={`${LABEL} mb-2`}>
            Продукти — по желание, до {productsMax}
          </legend>
          {products.map((product) => {
            const checked = productIds.includes(product.id);
            return (
              <label
                key={product.id}
                className="flex min-h-11 items-center gap-3 pl-4"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!checked && productIds.length >= productsMax}
                  onChange={() => {
                    setProductIds(
                      checked
                        ? productIds.filter((id) => id !== product.id)
                        : [...productIds, product.id],
                    );
                    changed();
                  }}
                  className="accent-action size-5 shrink-0"
                />
                {product.name}
              </label>
            );
          })}
        </fieldset>
      )}

      <div>
        <label htmlFor={`${id}-text`} className={LABEL}>
          Текст
        </label>
        <textarea
          id={`${id}-text`}
          rows={5}
          maxLength={textMax}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            changed();
          }}
          aria-invalid={textInvalid || undefined}
          aria-describedby={textInvalid ? `${id}-status` : undefined}
          className={textInvalid ? FIELD_INVALID : FIELD}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={showPreview}
          aria-disabled={pending}
          disabled={noPromotion}
          className="border-line text-ink bg-surface hover:bg-ground inline-flex min-h-12 min-w-28 items-center justify-center rounded-md border-2 px-4 font-semibold sm:min-h-11 sm:text-sm"
        >
          {running === "preview" ? (
            <Busy label="Подготвя се прегледът…" />
          ) : (
            "Преглед"
          )}
        </button>
        <button
          type="submit"
          aria-disabled={pending}
          disabled={noPromotion}
          className="bg-action text-action-ink hover:bg-action-hover aria-disabled:bg-action-hover inline-flex min-h-12 min-w-28 items-center justify-center rounded-md px-4 font-semibold sm:min-h-11 sm:text-sm"
        >
          {running === "send" ? <Busy label="Изпраща се…" /> : "Изпрати"}
        </button>
        <p
          id={`${id}-status`}
          role="status"
          className={
            status.kind === "started"
              ? "text-sm font-medium"
              : "text-error text-sm font-medium"
          }
        >
          {statusText(status)}
        </p>
      </div>

      {preview && (
        <div>
          <p className="text-sm">
            <span className="text-ink-soft">Тема:</span> {preview.subject}
          </p>
          <iframe
            title="Преглед на имейла"
            srcDoc={preview.html}
            sandbox=""
            className="border-line mt-2 h-[36rem] w-full max-w-xl rounded-lg border bg-white"
          />
        </div>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby={`${id}-dialog-title`}
        aria-describedby={`${id}-dialog-text`}
        onClose={() => setConfirming(false)}
        className="bg-surface text-ink backdrop:bg-ink/60 m-auto w-[calc(100%-2rem)] max-w-md rounded-xl p-6 shadow-xl"
      >
        <h2 id={`${id}-dialog-title`} className="text-lg font-semibold">
          {recent ? "Скоро е пращано" : "Да изпратим ли?"}
        </h2>
        <div id={`${id}-dialog-text`} className="mt-2 flex flex-col gap-2">
          {recent && (
            <p>
              На {formatCampaignDay(recent.sentOn)} изпратихте „{recent.subject}
              “. Сигурни ли сте, че искате да изпратите нова кампания?
            </p>
          )}
          <p>
            {`${CAMPAIGN_KIND_LABEL[kind]} до ${subscribers} абонати. Днес тръгват ${sendingNow}${subscribers > sendingNow ? `, останалите ${subscribers - sendingNow} — с „Изпрати на останалите“ в следващите дни` : ""}.`}
          </p>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            ref={cancelRef}
            onClick={() => dialogRef.current?.close()}
            className="border-line text-ink bg-surface hover:bg-ground inline-flex min-h-11 items-center justify-center rounded-md border-2 px-4 font-semibold"
          >
            {recent ? "Не" : "Отказ"}
          </button>
          <button
            type="button"
            onClick={send}
            className="bg-action border-action text-action-ink hover:bg-action-hover inline-flex min-h-11 items-center justify-center rounded-md border-2 px-4 font-semibold"
          >
            {recent ? "Да" : "Изпрати"}
          </button>
        </div>
      </dialog>
    </form>
  );
}
