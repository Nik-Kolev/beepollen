"use client";

import { useSyncExternalStore } from "react";

import {
  COOKIE_CONSENT_KEY,
  parseCookieChoice,
  type CookieChoice,
} from "@/lib/cookie-consent";

const listeners = new Set<() => void>();

let memoryChoice: CookieChoice | null = null;
let storageWorks = true;

function emit() {
  for (const listener of listeners) listener();
}

function handleStorage(event: StorageEvent) {
  if (event.key === null || event.key === COOKIE_CONSENT_KEY) emit();
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", handleStorage);

  listeners.add(listener);

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

function getChoice(): CookieChoice | null {
  if (!storageWorks) return memoryChoice;

  try {
    return parseCookieChoice(localStorage.getItem(COOKIE_CONSENT_KEY));
  } catch {
    storageWorks = false;

    return memoryChoice;
  }
}

function subscribeToNothing() {
  return () => {};
}

export function chooseCookies(next: CookieChoice) {
  memoryChoice = next;

  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, next);
  } catch {
    storageWorks = false;
  }

  emit();
}

export function useCookieConsent() {
  const choice = useSyncExternalStore(subscribe, getChoice, () => null);
  const ready = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  return { choice, ready };
}
