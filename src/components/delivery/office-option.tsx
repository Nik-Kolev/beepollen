"use client";

import type { EcontOffice } from "@/lib/econt";

export function OfficeOption({
  office,
  selected,
  onSelect,
}: {
  office: EcontOffice;
  selected: boolean;
  onSelect: (code: string) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border bg-surface p-4 transition-colors ${
        selected
          ? "border-action ring-1 ring-action"
          : "border-line hover:border-action"
      }`}
    >
      <input
        type="radio"
        name="office"
        value={office.code}
        checked={selected}
        onChange={() => onSelect(office.code)}
        className="mt-1 size-5 shrink-0 accent-action"
      />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="font-medium text-ink">{office.label}</span>
        <span className="text-sm text-ink-soft">{office.street}</span>
        <span className="text-sm text-ink-soft">
          {office.hours}
          {office.phone && ` · ${office.phone}`}
        </span>
      </span>
    </label>
  );
}
