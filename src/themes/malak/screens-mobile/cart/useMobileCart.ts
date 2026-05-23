// FILE: apps/storefront/src/themes/malak/screens-mobile/cart/useMobileCart.ts
"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useCart as useBaseCart } from "../../screens/cart/useCart";

type CartSnapshot = {
  version: 1;
  cachedAt: number;
  items: any[];
  summary: any;
  coupon: any;
  totalQty: number;
};

const CACHE_KEY = "mk:mobile-cart:v1";
const CACHE_VERSION = 1;

let memorySnapshot: CartSnapshot | null = null;
const subscribers = new Set<() => void>();

function normalizeQty(value: any) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

function computeTotalQty(items: any[]) {
  if (!Array.isArray(items)) return 0;

  return items.reduce((sum, item) => {
    return (
      sum +
      normalizeQty(
        item?.qty ??
          item?.quantity ??
          item?.count ??
          item?.cart_qty ??
          item?.cartQty,
      )
    );
  }, 0);
}

function isValidSnapshot(value: any): value is CartSnapshot {
  return Boolean(
    value &&
      value.version === CACHE_VERSION &&
      Array.isArray(value.items),
  );
}

function notifyCartCacheSubscribers() {
  subscribers.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore subscriber errors
    }
  });
}

function readCartCache(): CartSnapshot | null {
  if (memorySnapshot) return memorySnapshot;

  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (!isValidSnapshot(parsed)) {
      window.sessionStorage.removeItem(CACHE_KEY);
      return null;
    }

    memorySnapshot = {
      version: CACHE_VERSION,
      cachedAt: Number(parsed.cachedAt || Date.now()),
      items: Array.isArray(parsed.items) ? parsed.items : [],
      summary: parsed.summary ?? null,
      coupon: parsed.coupon ?? null,
      totalQty: normalizeQty(
        parsed.totalQty ?? computeTotalQty(parsed.items),
      ),
    };

    return memorySnapshot;
  } catch {
    return null;
  }
}

function writeCartCache(snapshot: Omit<CartSnapshot, "version" | "cachedAt">) {
  const next: CartSnapshot = {
    version: CACHE_VERSION,
    cachedAt: Date.now(),
    items: Array.isArray(snapshot.items) ? snapshot.items : [],
    summary: snapshot.summary ?? null,
    coupon: snapshot.coupon ?? null,
    totalQty: normalizeQty(
      snapshot.totalQty ?? computeTotalQty(snapshot.items),
    ),
  };

  memorySnapshot = next;

  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  }

  notifyCartCacheSubscribers();
}

function subscribeCartCache(callback: () => void) {
  subscribers.add(callback);

  return () => {
    subscribers.delete(callback);
  };
}

function getCartCacheSnapshot() {
  return readCartCache();
}

function getCartCacheServerSnapshot() {
  return null;
}

 function hasCachedItems(snapshot: CartSnapshot | null) {
  return Boolean(
    snapshot &&
      Array.isArray(snapshot.items) &&
      snapshot.items.length > 0,
  );
}
export function useMobileCart() {
  const base = useBaseCart();
  const cached = useSyncExternalStore(
    subscribeCartCache,
    getCartCacheSnapshot,
    getCartCacheServerSnapshot,
  );

  const reloadRef = useRef<any>(base.reload);

  useEffect(() => {
    reloadRef.current = base.reload;
  }, [base.reload]);

  useEffect(() => {
    if (base.loading) return;
    if (base.error) return;

    const timer = window.setTimeout(() => {
      writeCartCache({
        items: Array.isArray(base.items) ? base.items : [],
        summary: base.summary ?? null,
        coupon: base.coupon ?? null,
        totalQty: normalizeQty(
          base.totalQty ?? computeTotalQty(base.items),
        ),
      });
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    base.loading,
    base.error,
    base.items,
    base.summary,
    base.coupon,
    base.totalQty,
  ]);

  useEffect(() => {
    let timer: number | null = null;

    function silentReload() {
      if (timer) {
        window.clearTimeout(timer);
      }

      timer = window.setTimeout(() => {
        timer = null;

        try {
          reloadRef.current?.({ silent: true });
        } catch {
          // ignore
        }
      }, 180);
    }

    window.addEventListener("cart:changed", silentReload);
    window.addEventListener("cart:optimistic-add", silentReload);
    window.addEventListener("product:add-to-cart:done", silentReload);

    return () => {
      window.removeEventListener("cart:changed", silentReload);
      window.removeEventListener("cart:optimistic-add", silentReload);
      window.removeEventListener("product:add-to-cart:done", silentReload);

      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  const shouldUseCache = Boolean(
    hasCachedItems(cached) &&
      (base.loading ||
        (base.error && (!Array.isArray(base.items) || base.items.length === 0))),
  );

  return useMemo(() => {
    if (!shouldUseCache || !cached) return base;

    return {
      ...base,
      loading: false,
      error: "",
      items: cached.items,
      summary: cached.summary,
      coupon: cached.coupon,
      totalQty: cached.totalQty,
    };
  }, [base, cached, shouldUseCache]);
}