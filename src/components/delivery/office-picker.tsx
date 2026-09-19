"use client";

import { useId, useMemo, useState } from "react";

import { CarrierToggle } from "@/components/delivery/carrier-toggle";
import { OfficeOption } from "@/components/delivery/office-option";
import { DEFAULT_CARRIER, type CarrierId } from "@/lib/carriers";
import { officeCount, type EcontOffice } from "@/lib/econt";

function matches(office: EcontOffice, query: string): boolean {
  const haystack = [
    office.city,
    office.name,
    office.street,
    office.postCode ?? "",
  ]
    .join(" ")
    .toLocaleLowerCase("bg-BG");

  return query
    .toLocaleLowerCase("bg-BG")
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

export function OfficePicker({ offices }: { offices: EcontOffice[] }) {
  const [carrier, setCarrier] = useState<CarrierId>(DEFAULT_CARRIER);
  const [query, setQuery] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const searchId = useId();

  // Nothing is listed before a search: 589 cards is not a list anyone reads,
  // and truncating one hides every office past the cut.
  const found = useMemo(
    () => (query.trim() ? offices.filter((o) => matches(o, query)) : []),
    [offices, query],
  );

  const selected = offices.find((office) => office.code === selectedCode);

  return (
    <div className="flex flex-col gap-6">
      <CarrierToggle carrier={carrier} onChange={setCarrier} />

      <div className="flex flex-col gap-2">
        <label htmlFor={searchId} className="text-sm font-medium text-ink-soft">
          Търсене по град, адрес или пощенски код
        </label>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Попово"
          autoComplete="off"
          className="min-h-11 rounded-lg border border-line bg-surface px-4 text-base text-ink outline-none placeholder:text-ink-soft focus-visible:border-action focus-visible:ring-2 focus-visible:ring-action/30"
        />
        <p className="text-sm text-ink-soft" aria-live="polite">
          {!query.trim()
            ? "Въведете град или адрес."
            : found.length === 0
              ? "Няма намерен офис."
              : officeCount(found.length)}
        </p>
      </div>

      {selected && (
        <p className="rounded-lg border border-action bg-halo px-4 py-3 text-sm text-ink">
          <span className="font-medium">Избран офис: </span>
          {selected.label} — {selected.street}
        </p>
      )}

      <div
        role="radiogroup"
        aria-label="Офиси на Еконт"
        className="flex flex-col gap-3"
      >
        {found.map((office) => (
          <OfficeOption
            key={office.code}
            office={office}
            selected={office.code === selectedCode}
            onSelect={setSelectedCode}
          />
        ))}
      </div>
    </div>
  );
}
