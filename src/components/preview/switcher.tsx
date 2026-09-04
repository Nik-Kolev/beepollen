"use client";

import { useSyncExternalStore } from "react";

import {
  DEFAULT_FONT,
  FONT_ATTRIBUTE,
  FONT_STORAGE_KEY,
  fontIds,
  fontPairings,
} from "@/components/preview/fonts";
import {
  DEFAULT_PALETTE,
  PALETTE_ATTRIBUTE,
  PALETTE_STORAGE_KEY,
  paletteIds,
  palettes,
} from "@/components/preview/palettes";

// The choice lives on the <html> attribute rather than in React, because the
// pre-paint restore script sets it before any component mounts.
function createStore(
  attribute: string,
  storageKey: string,
  ids: string[],
  fallback: string,
) {
  let listeners: (() => void)[] = [];

  return {
    subscribe(onChange: () => void) {
      listeners = [...listeners, onChange];
      return () => {
        listeners = listeners.filter((listener) => listener !== onChange);
      };
    },
    read() {
      const current = document.documentElement.dataset[attribute];
      return current && ids.includes(current) ? current : fallback;
    },
    serverRead() {
      return fallback;
    },
    write(id: string) {
      document.documentElement.dataset[attribute] = id;
      try {
        localStorage.setItem(storageKey, id);
      } catch {
        // Private browsing blocks writes; the choice still applies for this view.
      }
      listeners.forEach((listener) => listener());
    },
  };
}

const paletteStore = createStore(
  PALETTE_ATTRIBUTE,
  PALETTE_STORAGE_KEY,
  paletteIds,
  DEFAULT_PALETTE,
);

const fontStore = createStore(
  FONT_ATTRIBUTE,
  FONT_STORAGE_KEY,
  fontIds,
  DEFAULT_FONT,
);

export function PreviewSwitcher() {
  const activePalette = useSyncExternalStore(
    paletteStore.subscribe,
    paletteStore.read,
    paletteStore.serverRead,
  );
  const activeFont = useSyncExternalStore(
    fontStore.subscribe,
    fontStore.read,
    fontStore.serverRead,
  );

  const paletteIndex = palettes.findIndex(
    (palette) => palette.id === activePalette,
  );
  const fontPairing = fontPairings.find(
    (pairing) => pairing.id === activeFont,
  )!;

  // Collapsed by default: opened, forty swatches and sixteen pairings eat two
  // thirds of a phone screen, which is the thing being judged.
  return (
    <details className="border-y border-stone-300 bg-stone-100 text-stone-700">
      <summary className="mx-auto flex w-full max-w-6xl cursor-pointer flex-wrap items-baseline gap-x-2 px-4 py-2.5 text-xs hover:bg-stone-200/60 sm:px-6">
        <span className="text-[11px] font-semibold tracking-[0.12em] text-stone-600 uppercase">
          Тема
        </span>
        <span className="font-semibold text-stone-900 tabular-nums">
          {paletteIndex + 1}. {palettes[paletteIndex].label}
        </span>
        <span className="text-stone-600">· {fontPairing.label}</span>
      </summary>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 border-t border-stone-300 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="w-12 shrink-0 text-[11px] font-semibold tracking-[0.12em] text-stone-600 uppercase">
            Цвят
          </span>
          <span className="text-xs font-semibold text-stone-900 tabular-nums">
            {paletteIndex + 1}. {palettes[paletteIndex].label}
          </span>

          <div className="flex w-full flex-wrap gap-1.5">
            {palettes.map((palette, index) => (
              <button
                key={palette.id}
                type="button"
                title={palette.label}
                aria-label={`${index + 1}. ${palette.label}`}
                aria-pressed={activePalette === palette.id}
                onClick={() => paletteStore.write(palette.id)}
                className={`flex items-center gap-1 rounded-full p-0.5 pr-1.5 ring-1 transition-colors ${
                  activePalette === palette.id
                    ? "bg-white ring-2 ring-stone-500"
                    : "ring-stone-300 hover:bg-white/70"
                }`}
              >
                <span
                  data-palette={palette.id}
                  className="flex overflow-hidden rounded-full"
                >
                  <span className="bg-chrome-light size-3.5" />
                  <span className="bg-chrome-deep size-3.5" />
                  <span className="bg-action size-3.5" />
                </span>
                <span className="text-[10px] leading-none tabular-nums">
                  {index + 1}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-stone-300 pt-3">
          <span className="w-12 shrink-0 text-[11px] font-semibold tracking-[0.12em] text-stone-600 uppercase">
            Шрифт
          </span>
          <span className="text-xs font-semibold text-stone-900">
            {fontPairing.label}
          </span>

          <div className="flex w-full flex-wrap gap-1.5">
            {fontPairings.map((pairing) => (
              <button
                key={pairing.id}
                type="button"
                data-font={pairing.id}
                aria-label={`${pairing.label} — ${pairing.note}`}
                aria-pressed={activeFont === pairing.id}
                onClick={() => fontStore.write(pairing.id)}
                className={`font-head rounded-md px-2.5 py-1 text-xs ring-1 transition-colors ${
                  activeFont === pairing.id
                    ? "bg-white text-stone-900 ring-2 ring-stone-500"
                    : "ring-stone-300 hover:bg-white/70"
                }`}
              >
                {pairing.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </details>
  );
}
