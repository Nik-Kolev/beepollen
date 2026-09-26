"use client";

import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";

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

function pinRadius(shown: number): number {
  if (shown <= 8) return 10;
  if (shown <= 30) return 8;

  return 7;
}

function coreBounds(points: L.LatLngTuple[]): L.LatLngBounds {
  if (points.length < 10) return L.latLngBounds(points);

  const lats = points.map((point) => point[0]).sort((a, b) => a - b);
  const lngs = points.map((point) => point[1]).sort((a, b) => a - b);
  const low = Math.floor(points.length * 0.05);
  const high = Math.ceil(points.length * 0.95) - 1;

  return L.latLngBounds([lats[low], lngs[low]], [lats[high], lngs[high]]);
}

type OfficeMapProps = {
  offices: EcontOffice[];
  visible: EcontOffice[];
  selectedCode: string | null;
  onSelect: (code: string) => void;
};

export default function OfficeMap({
  offices,
  visible,
  selectedCode,
  onSelect,
}: OfficeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef(new Map<string, L.CircleMarker>());

  const visibleCodes = useMemo(
    () => new Set(visible.map((office) => office.code)),
    [visible],
  );

  const onSelectRef = useRef(onSelect);
  const visibleCodesRef = useRef(visibleCodes);

  useEffect(() => {
    onSelectRef.current = onSelect;
    visibleCodesRef.current = visibleCodes;
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
      preferCanvas: true,
      scrollWheelZoom: false,
    });

    map.setView(BULGARIA_CENTER, BULGARIA_ZOOM);

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
        if (visibleCodesRef.current.has(office.code))
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

  useEffect(() => {
    const action = themeColor("--color-action");
    const leaf = themeColor("--color-leaf");
    const surface = themeColor("--color-surface");
    const ink = themeColor("--color-ink");
    const radius = pinRadius(visibleCodes.size);

    for (const office of offices) {
      const marker = markersRef.current.get(office.code);

      if (!marker) continue;

      const live = visibleCodes.has(office.code);
      const chosen = office.code === selectedCode;

      marker.setStyle({
        radius: chosen ? radius + 3 : live ? radius : 5,
        color: chosen ? ink : surface,
        opacity: live ? 1 : 0,
        fillColor: chosen ? leaf : action,
        fillOpacity: live ? 1 : 0.3,
      });

      if (live) {
        marker.bindTooltip(office.label);
      } else {
        marker.unbindTooltip();
      }

      if (chosen) marker.bringToFront();
    }
  }, [offices, visibleCodes, selectedCode]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) return;

    const shown = pointsOf(visible);

    if (shown.length > 0) {
      map.fitBounds(coreBounds(shown), {
        padding: [40, 40],
        maxZoom: CITY_MAX_ZOOM,
        animate: false,
      });

      return;
    }

    const all = pointsOf(offices);

    if (all.length > 0)
      map.fitBounds(L.latLngBounds(all), { padding: [16, 16], animate: false });
  }, [offices, visible]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Карта с офисите на Еконт"
      className="h-64 w-full overflow-hidden rounded-lg border border-line sm:h-72 lg:h-96"
    />
  );
}
