"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  addItem,
  CART_STORAGE_KEY,
  EMPTY_CART,
  parseCart,
  removeItem,
  serializeCart,
  setItemQuantity,
  type Cart,
} from "@/lib/cart";

const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedCart: Cart = EMPTY_CART;

let storageWorks = true;

function emit() {
  for (const listener of listeners) listener();
}

function handleStorage(event: StorageEvent) {
  if (event.key === null || event.key === CART_STORAGE_KEY) emit();
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

function getSnapshot(): Cart {
  if (!storageWorks) return cachedCart;

  let raw: string | null = null;

  try {
    raw = localStorage.getItem(CART_STORAGE_KEY);
  } catch {
    storageWorks = false;

    return cachedCart;
  }

  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedCart = parseCart(raw);
  }

  return cachedCart;
}

function getServerSnapshot(): Cart {
  return EMPTY_CART;
}

function write(cart: Cart) {
  cachedCart = cart;

  try {
    const raw = serializeCart(cart);

    localStorage.setItem(CART_STORAGE_KEY, raw);
    cachedRaw = raw;
  } catch {
    storageWorks = false;
  }

  emit();
}

function subscribeToNothing() {
  return () => {};
}

export function useCart() {
  const cart = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  const add = useCallback((slug: string) => {
    write(addItem(getSnapshot(), slug));
  }, []);

  const setQuantity = useCallback((slug: string, quantity: number) => {
    write(setItemQuantity(getSnapshot(), slug, quantity));
  }, []);

  const remove = useCallback((slug: string) => {
    write(removeItem(getSnapshot(), slug));
  }, []);

  const clear = useCallback(() => {
    write(EMPTY_CART);
  }, []);

  return { cart, ready, add, setQuantity, remove, clear };
}
