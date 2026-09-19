"use client";

import dynamic from "next/dynamic";
import { useId, useMemo, useState } from "react";

import { CarrierToggle } from "@/components/delivery/carrier-toggle";
import { OfficeOption } from "@/components/delivery/office-option";
import { DEFAULT_CARRIER, type CarrierId } from "@/lib/carriers";
import { listEcontCities, officeCount, type EcontOffice } from "@/lib/econt";

// Leaflet touches window as it loads, so it may not render on the server.
const OfficeMap = dynamic(() => import("./office-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[55vh] min-h-72 w-full animate-pulse rounded-lg border border-line bg-placeholder lg:h-[70vh]" />
  ),
});

// Up to three offices fit on screen and are listed outright. From four the
// list is replaced by a search, rather than something to scroll.
const OFFICE_SEARCH_FROM = 4;

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("bg-BG");
}

export function OfficeCityPicker({ offices }: { offices: EcontOffice[] }) {
  const [carrier, setCarrier] = useState<CarrierId>(DEFAULT_CARRIER);
  const [cityQuery, setCityQuery] = useState("");
  const [officeQuery, setOfficeQuery] = useState("");
  const [city, setCity] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const cityId = useId();
  const officeId = useId();

  const cities = useMemo(() => listEcontCities(offices), [offices]);

  const matchingCities = useMemo(() => {
    const term = normalize(cityQuery);

    if (!term) return [];

    return cities.filter((name) => normalize(name).includes(term));
  }, [cities, cityQuery]);

  const cityOffices = useMemo(
    () => (city ? offices.filter((office) => office.city === city) : []),
    [offices, city],
  );

  const needsSearch = cityOffices.length >= OFFICE_SEARCH_FROM;

  const shownOffices = useMemo(() => {
    const term = normalize(officeQuery);

    if (!needsSearch) return cityOffices;
    if (!term) return [];

    return cityOffices.filter((office) =>
      normalize(`${office.name} ${office.street}`).includes(term),
    );
  }, [cityOffices, needsSearch, officeQuery]);

  const selected = offices.find((office) => office.code === selectedCode);

  function chooseCity(name: string) {
    setCity(name);
    setCityQuery("");
    setOfficeQuery("");
    setSelectedCode(null);
  }

  function clearCity() {
    setCity(null);
    setCityQuery("");
    setOfficeQuery("");
    setSelectedCode(null);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_1fr] lg:grid-rows-[auto_1fr] lg:gap-8">
      <div className="flex flex-col gap-6 lg:col-start-1 lg:row-start-1">
        <CarrierToggle carrier={carrier} onChange={setCarrier} />

        {city ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-action bg-halo px-4 py-3">
              <span className="text-ink">
                <span className="text-sm text-ink-soft">Град: </span>
                <span className="font-medium">{city}</span>
              </span>
              <button
                type="button"
                onClick={clearCity}
                className="min-h-11 text-sm font-medium text-action underline"
              >
                Промени
              </button>
            </div>

            {needsSearch && (
              <div className="flex flex-col gap-2">
                <label
                  htmlFor={officeId}
                  className="text-sm font-medium text-ink-soft"
                >
                  Офис — улица, квартал или име
                </label>
                <input
                  id={officeId}
                  type="search"
                  value={officeQuery}
                  onChange={(event) => setOfficeQuery(event.target.value)}
                  placeholder="Витоша"
                  autoComplete="off"
                  className="min-h-11 rounded-lg border border-line bg-surface px-4 text-base text-ink outline-none placeholder:text-ink-soft focus-visible:border-action focus-visible:ring-2 focus-visible:ring-action/30"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label
              htmlFor={cityId}
              className="text-sm font-medium text-ink-soft"
            >
              Град
            </label>
            <input
              id={cityId}
              type="search"
              value={cityQuery}
              onChange={(event) => setCityQuery(event.target.value)}
              placeholder="Попово"
              autoComplete="off"
              className="min-h-11 rounded-lg border border-line bg-surface px-4 text-base text-ink outline-none placeholder:text-ink-soft focus-visible:border-action focus-visible:ring-2 focus-visible:ring-action/30"
            />

            {cityQuery.trim() &&
              (matchingCities.length === 0 ? (
                <p className="text-sm text-ink-soft">
                  Няма град с това име в списъка на Еконт.
                </p>
              ) : (
                <ul
                  role="list"
                  className="max-h-64 overflow-y-auto rounded-lg border border-line bg-surface"
                >
                  {matchingCities.map((name) => (
                    <li
                      key={name}
                      className="border-b border-line last:border-0"
                    >
                      <button
                        type="button"
                        onClick={() => chooseCity(name)}
                        className="flex min-h-11 w-full items-center px-4 text-left text-ink hover:bg-ground"
                      >
                        {name}
                      </button>
                    </li>
                  ))}
                </ul>
              ))}
          </div>
        )}
      </div>

      <div className="lg:sticky lg:top-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
        <OfficeMap
          offices={offices}
          activeCity={city}
          selectedCode={selectedCode}
          onSelect={setSelectedCode}
        />
        <p className="mt-2 text-sm text-ink-soft">
          {city
            ? "Изберете офис от картата или от списъка."
            : "Изберете град, за да изберете офис."}
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:col-start-1 lg:row-start-2">
        {selected && (
          <p className="rounded-lg border border-action bg-halo px-4 py-3 text-sm text-ink">
            <span className="font-medium">Избран офис: </span>
            {selected.label} — {selected.street}
          </p>
        )}

        {/* Always rendered: a live region added at the same time as its text
            is not announced. */}
        <p className="text-sm text-ink-soft" aria-live="polite">
          {city &&
            (needsSearch && !officeQuery.trim()
              ? `${officeCount(cityOffices.length)} в ${city} — въведете улица, квартал или име.`
              : shownOffices.length === 0
                ? "Няма офис с това име."
                : `${officeCount(shownOffices.length)} в ${city}`)}
        </p>

        <div
          role="radiogroup"
          aria-label="Офиси на Еконт"
          className="flex flex-col gap-3"
        >
          {shownOffices.map((office) => (
            <OfficeOption
              key={office.code}
              office={office}
              selected={office.code === selectedCode}
              onSelect={setSelectedCode}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
