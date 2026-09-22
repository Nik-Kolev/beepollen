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
    <div className="h-64 w-full animate-pulse rounded-lg border border-line bg-placeholder sm:h-72 lg:h-96" />
  ),
});

// Up to three offices fit on screen and are listed outright. From four the
// list is replaced by a search, rather than something to scroll.
const OFFICE_SEARCH_FROM = 4;

const PANEL_CLASS =
  "flex items-start justify-between gap-3 rounded-lg border-2 border-action bg-halo py-3 pr-3 pl-4";

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("bg-BG");
}

function shortOfficeName(office: EcontOffice): string {
  return office.name.startsWith(`${office.city} `)
    ? office.name.slice(office.city.length + 1)
    : office.name;
}

// Econt reports no settlement type, so neither "гр." nor "с." can be written:
// its list holds villages, and Айдемир is one.
function officeHeading(office: EcontOffice): string {
  return `${office.city}, офис ${shortOfficeName(office)}`;
}

// Omitting origin lets Google Maps start from the device's own location.
function directionsUrl(office: EcontOffice): string {
  const destination = office.location
    ? `${office.location.lat},${office.location.lng}`
    : `${office.city} ${office.street}`;

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

function ChangeButton({
  label,
  text,
  onClick,
}: {
  label: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="min-h-11 shrink-0 rounded-lg px-2 text-base font-medium text-action underline transition-colors hover:bg-surface focus-visible:ring-2 focus-visible:ring-action/30 focus-visible:outline-none"
    >
      {text}
    </button>
  );
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

  const selected =
    offices.find((office) => office.code === selectedCode) ?? null;

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

  // The query outlives the choice so its matches stay listed to switch between;
  // the field and the count hide themselves instead.
  function chooseOffice(code: string) {
    setSelectedCode(code);
  }

  function clearOffice() {
    setSelectedCode(null);
  }

  const status =
    !city || selected
      ? ""
      : needsSearch && !officeQuery.trim()
        ? `${officeCount(cityOffices.length)} в ${city} — въведете улица, квартал или име, или натиснете на картата избрания от вас офис.`
        : shownOffices.length === 0
          ? "Няма офис с това име."
          : `${officeCount(shownOffices.length)} в ${city}`;

  const mapOffices = useMemo(() => {
    if (!city) return [];
    if (selected) return [selected];

    return shownOffices.length > 0 ? shownOffices : cityOffices;
  }, [city, selected, shownOffices, cityOffices]);

  const mapHint = !city
    ? "Изберете град, за да избирате офис от картата."
    : selected
      ? "Избраният офис е отбелязан в зелено на картата."
      : "Натиснете точка на картата или изберете офис от списъка.";

  return (
    <div className="flex flex-col gap-6">
      <CarrierToggle carrier={carrier} onChange={setCarrier} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,24rem)_1fr] lg:gap-8">
        <div className="flex flex-col gap-6">
          {city ? (
            <div className={PANEL_CLASS}>
              <span className="min-w-0 flex-1 self-center text-ink">
                <span className="text-sm text-ink-soft">Град: </span>
                <span className="text-base font-medium">{city}</span>
              </span>
              <ChangeButton
                label={`Промени града ${city}`}
                text="Промени"
                onClick={clearCity}
              />
            </div>
          ) : (
            <div className="relative flex flex-col gap-2">
              <label
                htmlFor={cityId}
                className="pl-4 text-sm font-medium text-ink-soft"
              >
                Град
              </label>
              <input
                id={cityId}
                type="search"
                value={cityQuery}
                onChange={(event) => setCityQuery(event.target.value)}
                placeholder="Например София"
                autoComplete="off"
                className="min-h-11 rounded-lg border border-line bg-surface px-4 text-base text-ink outline-none placeholder:text-ink-soft focus-visible:border-action focus-visible:ring-2 focus-visible:ring-action/30"
              />

              {cityQuery.trim() &&
                (matchingCities.length === 0 ? (
                  <p className="pl-4 text-sm text-ink-soft">
                    Няма град с това име в списъка на Еконт.
                  </p>
                ) : (
                  <ul
                    role="list"
                    className="absolute top-full right-0 left-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-line bg-surface shadow-lg"
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

          {selected && (
            <div className={PANEL_CLASS}>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink-soft">Избран офис</p>
                <p className="mt-1 text-lg leading-snug font-semibold text-ink">
                  {officeHeading(selected)}
                </p>
                <p className="text-base text-ink">{selected.street}</p>
                <p className="mt-1 text-sm text-ink-soft">
                  {selected.hours}
                  {selected.phone && ` · ${selected.phone}`}
                </p>
                <a
                  href={directionsUrl(selected)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-action bg-surface px-4 text-base font-medium text-action transition-colors hover:bg-ground focus-visible:ring-2 focus-visible:ring-action/30 focus-visible:outline-none"
                >
                  Упътване до офиса
                </a>
              </div>
              <ChangeButton
                label="Изчисти избрания офис"
                text="Изчисти"
                onClick={clearOffice}
              />
            </div>
          )}

          {city && needsSearch && !selected && (
            <div className="flex flex-col gap-2">
              <label
                htmlFor={officeId}
                className="pl-4 text-sm font-medium text-ink-soft"
              >
                Офис — улица, квартал или име
              </label>
              <input
                id={officeId}
                type="search"
                value={officeQuery}
                onChange={(event) => setOfficeQuery(event.target.value)}
                placeholder="Например Център"
                autoComplete="off"
                className="min-h-11 rounded-lg border border-line bg-surface px-4 text-base text-ink outline-none placeholder:text-ink-soft focus-visible:border-action focus-visible:ring-2 focus-visible:ring-action/30"
              />
            </div>
          )}

          {/* Always rendered: a live region added at the same time as its text
            is not announced. */}
          <p className="pl-4 text-base text-ink" aria-live="polite">
            {status}
          </p>

          {city && (
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
                  onSelect={chooseOffice}
                />
              ))}
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-4">
          <OfficeMap
            offices={offices}
            visible={mapOffices}
            selectedCode={selectedCode}
            onSelect={chooseOffice}
          />
          <p className="mt-3 text-base text-ink">{mapHint}</p>
        </div>
      </div>
    </div>
  );
}
