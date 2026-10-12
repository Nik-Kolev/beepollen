"use client";

import dynamic from "next/dynamic";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from "react";

import { OfficeOption } from "@/components/delivery/office-option";
import {
  FIELD,
  FIELD_INVALID,
  INPUT_ERROR_TEXT,
  LABEL,
} from "@/components/form-styles";
import { listEcontCities, officeCount, type EcontOffice } from "@/lib/econt";

const OfficeMap = dynamic(() => import("./office-map"), {
  ssr: false,
  loading: () => (
    <div className="h-80 w-full animate-pulse rounded-lg border border-line bg-placeholder sm:h-96 lg:h-[30rem]" />
  ),
});

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

function officeHeading(office: EcontOffice): string {
  return `${office.city}, офис ${shortOfficeName(office)}`;
}

function directionsUrl(office: EcontOffice): string {
  const destination = office.location
    ? `${office.location.lat},${office.location.lng}`
    : `${office.city} ${office.street}`;

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

type FocusTarget = "city" | "offices" | "selected" | null;

type ErrorTarget = "city" | "search" | "offices";

function ChangeButton({
  ref,
  label,
  text,
  onClick,
}: {
  ref?: Ref<HTMLButtonElement>;
  label: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={label}
      className="min-h-11 shrink-0 rounded-full px-3 text-base font-medium text-action underline transition-colors hover:bg-ground"
    >
      {text}
    </button>
  );
}

export function OfficeCityPicker({
  offices,
  error = null,
  onSelect,
}: {
  offices: EcontOffice[];
  error?: { id: string; message: string } | null;
  onSelect?: (office: EcontOffice | null) => void;
}) {
  const [cityQuery, setCityQuery] = useState("");
  const [officeQuery, setOfficeQuery] = useState("");
  const [city, setCity] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [cityOpen, setCityOpen] = useState(false);
  const [activeCity, setActiveCity] = useState(-1);
  const [browsing, setBrowsing] = useState(false);

  const cityId = useId();
  const cityListId = useId();
  const officeId = useId();

  const focusTargetRef = useRef<FocusTarget>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const officeSearchRef = useRef<HTMLInputElement>(null);
  const officeGroupRef = useRef<HTMLDivElement>(null);
  const changeOfficeRef = useRef<HTMLButtonElement>(null);
  const pointerRef = useRef(false);

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

  const collapsed = selected !== null && !browsing;

  const listOpen = cityOpen && matchingCities.length > 0;

  function chooseCity(name: string) {
    setCity(name);
    setCityQuery("");
    setOfficeQuery("");
    setSelectedCode(null);
    setBrowsing(false);
    setCityOpen(false);
    setActiveCity(-1);
    focusTargetRef.current = "offices";
    onSelect?.(null);
  }

  function clearCity() {
    setCity(null);
    setCityQuery("");
    setOfficeQuery("");
    setSelectedCode(null);
    setBrowsing(false);
    setCityOpen(false);
    setActiveCity(-1);
    focusTargetRef.current = "city";
    onSelect?.(null);
  }

  function chooseOffice(code: string) {
    setSelectedCode(code);
    setBrowsing(false);
    focusTargetRef.current = "selected";
    onSelect?.(offices.find((office) => office.code === code) ?? null);
  }

  function chooseFromList(code: string) {
    if (pointerRef.current) {
      pointerRef.current = false;
      chooseOffice(code);
      return;
    }

    setSelectedCode(code);
    setBrowsing(true);
    onSelect?.(offices.find((office) => office.code === code) ?? null);
  }

  function clearOffice() {
    setSelectedCode(null);
    setBrowsing(false);
    focusTargetRef.current = "offices";
    onSelect?.(null);
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") event.preventDefault();
  }

  function onCityKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") event.preventDefault();

    if (event.key === "Escape") {
      setCityOpen(false);
      setActiveCity(-1);
      return;
    }

    if (!cityOpen || matchingCities.length === 0) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActiveCity(
        event.key === "ArrowDown"
          ? (activeCity + 1) % matchingCities.length
          : (activeCity <= 0 ? matchingCities.length : activeCity) - 1,
      );
      return;
    }

    if (event.key === "Enter") {
      const name =
        matchingCities[activeCity] ??
        (matchingCities.length === 1 ? matchingCities[0] : null);

      if (name) chooseCity(name);
    }
  }

  useEffect(() => {
    const target = focusTargetRef.current;

    if (!target) return;

    focusTargetRef.current = null;

    if (target === "city") {
      cityInputRef.current?.focus();
      return;
    }

    if (target === "selected") {
      changeOfficeRef.current?.focus();
      return;
    }

    const firstOption = officeGroupRef.current?.querySelector<HTMLInputElement>(
      'input[type="radio"]',
    );

    (officeSearchRef.current ?? firstOption)?.focus();
  }, [city, selectedCode, browsing]);

  const status = selected
    ? `Избрахте ${officeHeading(selected)}, ${selected.street}.`
    : !city
      ? ""
      : needsSearch && !officeQuery.trim()
        ? `${officeCount(cityOffices.length)} в ${city} — въведете улица, квартал, име или изберете офис на картата.`
        : shownOffices.length === 0
          ? "Няма офис с това име."
          : `${officeCount(shownOffices.length)} в ${city}.`;

  const mapOffices = useMemo(() => {
    if (!city) return [];
    if (selected && !browsing) return [selected];

    return shownOffices.length > 0 ? shownOffices : cityOffices;
  }, [city, selected, browsing, shownOffices, cityOffices]);

  const errorOn: ErrorTarget | null = !error
    ? null
    : !city
      ? "city"
      : selected
        ? null
        : needsSearch
          ? "search"
          : "offices";

  function errorProps(target: ErrorTarget) {
    return error && errorOn === target
      ? { "aria-invalid": true as const, "aria-describedby": error.id }
      : {};
  }

  function errorLine(target: ErrorTarget) {
    return error && errorOn === target ? (
      <p id={error.id} className={INPUT_ERROR_TEXT}>
        {error.message}
      </p>
    ) : null;
  }

  return (
    <div>
      <div>
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
            <div
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setCityOpen(false);
                  setActiveCity(-1);
                }
              }}
            >
              <label htmlFor={cityId} className={LABEL}>
                Град
              </label>
              <div className="relative">
                <input
                  id={cityId}
                  ref={cityInputRef}
                  type="search"
                  role="combobox"
                  aria-expanded={listOpen}
                  aria-controls={cityListId}
                  aria-autocomplete="list"
                  aria-activedescendant={
                    listOpen && activeCity >= 0
                      ? `${cityListId}-${activeCity}`
                      : undefined
                  }
                  value={cityQuery}
                  onChange={(event) => {
                    setCityQuery(event.target.value);
                    setCityOpen(true);
                    setActiveCity(-1);
                  }}
                  onKeyDown={onCityKeyDown}
                  placeholder="Например София"
                  autoComplete="off"
                  className={errorOn === "city" ? FIELD_INVALID : FIELD}
                  {...errorProps("city")}
                />

                <ul
                  id={cityListId}
                  role="listbox"
                  aria-label="Градове"
                  hidden={!listOpen}
                  className="absolute top-full right-0 left-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-line bg-surface shadow-lg"
                >
                  {matchingCities.map((name, index) => (
                    <li
                      key={name}
                      id={`${cityListId}-${index}`}
                      role="option"
                      aria-selected={index === activeCity}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => chooseCity(name)}
                      className={`flex min-h-11 cursor-pointer items-center border-b border-line px-4 text-ink last:border-0 hover:bg-ground ${
                        index === activeCity ? "bg-ground" : ""
                      }`}
                    >
                      {name}
                    </li>
                  ))}
                </ul>
              </div>

              {cityOpen && cityQuery.trim() && matchingCities.length === 0 && (
                <p className="mt-2 pl-4 text-sm text-ink-soft">
                  Няма град с това име в списъка на Еконт.
                </p>
              )}

              {errorLine("city")}
            </div>
          )}

          {selected && collapsed && (
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
                  className="mt-3 inline-flex min-h-12 items-center rounded-full border-2 border-action bg-surface px-4 text-sm font-medium whitespace-nowrap sm:px-5 sm:text-base text-action transition-colors hover:bg-ground"
                >
                  Упътване до офиса
                </a>
              </div>
              <ChangeButton
                ref={changeOfficeRef}
                label={`Промени офиса ${officeHeading(selected)}`}
                text="Промени"
                onClick={clearOffice}
              />
            </div>
          )}

          {city && needsSearch && !collapsed && (
            <div>
              <label htmlFor={officeId} className={LABEL}>
                Офис — улица, квартал или име
              </label>
              <input
                id={officeId}
                ref={officeSearchRef}
                type="search"
                value={officeQuery}
                onChange={(event) => setOfficeQuery(event.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder="Например Център"
                autoComplete="off"
                className={errorOn === "search" ? FIELD_INVALID : FIELD}
                {...errorProps("search")}
              />
              {errorLine("search")}
            </div>
          )}

          <p
            className={collapsed ? "sr-only" : "pl-4 text-base text-ink"}
            aria-live="polite"
          >
            {status}
          </p>

          {city && !collapsed && (
            <div>
              <div
                ref={officeGroupRef}
                role="radiogroup"
                aria-label="Офиси на Еконт"
                className="flex flex-col gap-3"
                onPointerDown={() => {
                  pointerRef.current = true;
                }}
                onKeyDown={() => {
                  pointerRef.current = false;
                }}
                onBlur={(event) => {
                  if (event.currentTarget.contains(event.relatedTarget)) return;

                  if (event.relatedTarget === officeSearchRef.current) {
                    focusTargetRef.current = "selected";
                  }

                  setBrowsing(false);
                }}
                {...errorProps("offices")}
              >
                {shownOffices.map((office) => (
                  <OfficeOption
                    key={office.code}
                    office={office}
                    selected={office.code === selectedCode}
                    onSelect={chooseFromList}
                  />
                ))}
              </div>
              {errorLine("offices")}
            </div>
          )}

          <div className="isolate">
            <OfficeMap
              offices={offices}
              visible={mapOffices}
              selectedCode={selectedCode}
              onSelect={chooseOffice}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
