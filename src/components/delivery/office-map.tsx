"use client";

import L from "leaflet";
import { useEffect, useRef } from "react";

import "leaflet/dist/leaflet.css";

import type { EcontOffice } from "@/lib/econt";

const BULGARIA_CENTER: L.LatLngTuple = [42.75, 25.35];
const BULGARIA_ZOOM = 7;
const CITY_MAX_ZOOM = 15;

function themeColor(token: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
}

function pointsOf(offices: EcontOffice[]): L.LatLngTuple[] {
  return offices.flatMap((office) =>
    office.location
      ? [[office.location.lat, office.location.lng] as L.LatLngTuple]
      : [],
  );
}

type OfficeMapProps = {
  offices: EcontOffice[];
  activeCity: string | null;
  selectedCode: string | null;
  onSelect: (code: string) => void;
};

export default function OfficeMap({
  offices,
  activeCity,
  selectedCode,
  onSelect,
}: OfficeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef(new Map<string, L.CircleMarker>());

  // Read through refs so the map is built once: listing these as dependencies
  // would tear down the view the visitor just panned.
  const onSelectRef = useRef(onSelect);
  const activeCityRef = useRef(activeCity);

  useEffect(() => {
    onSelectRef.current = onSelect;
    activeCityRef.current = activeCity;
  });

  useEffect(() => {
    if (!containerRef.current) return;

    // Canvas keeps all 600-odd pins to a single element; one DOM node each
    // stalls a phone at the zoom that shows the whole country.
    const map = L.map(containerRef.current, {
      preferCanvas: true,
      scrollWheelZoom: false,
    });

    const all = pointsOf(offices);

    if (all.length > 0) {
      map.fitBounds(L.latLngBounds(all), { padding: [16, 16] });
    } else {
      map.setView(BULGARIA_CENTER, BULGARIA_ZOOM);
    }

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const markers = new Map<string, L.CircleMarker>();

    for (const office of offices) {
      if (!office.location) continue;

      const marker = L.circleMarker(
        [office.location.lat, office.location.lng],
        { radius: 6, weight: 2, fillOpacity: 1 },
      );

      marker.on("click", () => {
        if (office.city === activeCityRef.current)
          onSelectRef.current(office.code);
      });

      marker.addTo(map);
      markers.set(office.code, marker);
    }

    markersRef.current = markers;
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markers.clear();
    };
  }, [offices]);

  // A pin outside the chosen city is dimmed and does nothing, so the map only
  // answers clicks the list beside it can also answer.
  useEffect(() => {
    const action = themeColor("--color-action");
    const surface = themeColor("--color-surface");
    const ink = themeColor("--color-ink");

    for (const office of offices) {
      const marker = markersRef.current.get(office.code);

      if (!marker) continue;

      const live = activeCity !== null && office.city === activeCity;
      const chosen = office.code === selectedCode;

      marker.setStyle({
        radius: chosen ? 10 : live ? 7 : 5,
        color: chosen ? ink : surface,
        opacity: live ? 1 : 0,
        fillColor: action,
        fillOpacity: live ? 1 : 0.3,
      });

      if (live) {
        marker.bindTooltip(office.label);
      } else {
        marker.unbindTooltip();
      }

      if (chosen) marker.bringToFront();
    }
  }, [offices, activeCity, selectedCode]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) return;

    const inCity =
      activeCity === null
        ? []
        : pointsOf(offices.filter((office) => office.city === activeCity));

    if (inCity.length > 0) {
      map.fitBounds(L.latLngBounds(inCity), {
        padding: [40, 40],
        maxZoom: CITY_MAX_ZOOM,
      });

      return;
    }

    const all = pointsOf(offices);

    if (all.length > 0)
      map.fitBounds(L.latLngBounds(all), { padding: [16, 16] });
  }, [offices, activeCity]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Карта с офисите на Еконт"
      className="h-[55vh] min-h-72 w-full overflow-hidden rounded-lg border border-line lg:h-[70vh]"
    />
  );
}
