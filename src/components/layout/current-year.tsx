"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function currentYear() {
  return new Date().getFullYear();
}

export function CurrentYear({ builtIn }: { builtIn: number }) {
  return useSyncExternalStore(subscribe, currentYear, () => builtIn);
}
