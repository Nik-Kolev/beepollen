"use client";

import { CARRIERS, type CarrierId } from "@/lib/carriers";

export function CarrierToggle({
  carrier,
  onChange,
}: {
  carrier: CarrierId;
  onChange: (carrier: CarrierId) => void;
}) {
  return (
    <fieldset>
      <legend className="sr-only">Куриер</legend>
      <div className="flex flex-wrap gap-3">
        {CARRIERS.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={!option.available}
            aria-pressed={carrier === option.id}
            onClick={() => onChange(option.id)}
            className={`min-h-11 rounded-full border px-5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              carrier === option.id
                ? "border-action bg-action text-action-ink"
                : "border-line bg-surface text-ink hover:border-action"
            }`}
          >
            {option.name}
            {!option.available && " — скоро"}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
