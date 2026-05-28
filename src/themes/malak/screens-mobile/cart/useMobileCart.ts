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
const CACHE_MAX_AGE_MS = 1000 * 60 * 30;

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
  if (!value) return false;
  if (value.version !== CACHE_VERSION) return false;
  if (!Array.isArray(value.items)) return false;

  const cachedAt = Number(value.cachedAt || 0);
  if (!Number.isFinite(cachedAt) || cachedAt <= 0) return false;

  return Date.now() - cachedAt <= CACHE_MAX_AGE_MS;
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

function clearCartCache() {
  memorySnapshot = null;

  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(CACHE_KEY);
    } catch {
      // ignore storage errors
    }
  }

  notifyCartCacheSubscribers();
}

function readCartCache(): CartSnapshot | null {
  if (memorySnapshot && isValidSnapshot(memorySnapshot)) {
    return memorySnapshot;
  }

  if (memorySnapshot && !isValidSnapshot(memorySnapshot)) {
    clearCartCache();
    return null;
  }

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
      totalQty: normalizeQty(parsed.totalQty ?? computeTotalQty(parsed.items)),
    };

    return memorySnapshot;
  } catch {
    return null;
  }
}

function writeCartCache(snapshot: Omit<CartSnapshot, "version" | "cachedAt">) {
  const items = Array.isArray(snapshot.items) ? snapshot.items : [];

  const next: CartSnapshot = {
    version: CACHE_VERSION,
    cachedAt: Date.now(),
    items,
    summary: snapshot.summary ?? null,
    coupon: snapshot.coupon ?? null,
    totalQty: normalizeQty(snapshot.totalQty ?? computeTotalQty(items)),
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

export function useMobileCart() {
  const base = useBaseCart();

  const cached = useSyncExternalStore(
    subscribeCartCache,
    getCartCacheSnapshot,
    getCartCacheServerSnapshot,
  );

  const reloadRef = useRef<any>(base.reload);
  const writeTimerRef = useRef<number | null>(null);
  const externalReloadTimerRef = useRef<number | null>(null);

  useEffect(() => {
    reloadRef.current = base.reload;
  }, [base.reload]);

  useEffect(() => {
    if (base.loading) return;
    if (base.error) return;

    if (writeTimerRef.current) {
      window.clearTimeout(writeTimerRef.current);
      writeTimerRef.current = null;
    }

    writeTimerRef.current = window.setTimeout(() => {
      writeTimerRef.current = null;

      writeCartCache({
        items: Array.isArray(base.items) ? base.items : [],
        summary: base.summary ?? null,
        coupon: base.coupon ?? null,
        totalQty: normalizeQty(base.totalQty ?? computeTotalQty(base.items)),
      });
    }, 60);

    return () => {
      if (writeTimerRef.current) {
        window.clearTimeout(writeTimerRef.current);
        writeTimerRef.current = null;
      }
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
    function scheduleExternalSilentReload(delay: number) {
      if (externalReloadTimerRef.current) {
        window.clearTimeout(externalReloadTimerRef.current);
        externalReloadTimerRef.current = null;
      }

      externalReloadTimerRef.current = window.setTimeout(() => {
        externalReloadTimerRef.current = null;

        try {
          reloadRef.current?.({ silent: true, force: true });
        } catch {
          // ignore
        }
      }, delay);
    }

    function onOptimisticAdd() {
      scheduleExternalSilentReload(650);
    }

    function onAddDone() {
      scheduleExternalSilentReload(160);
    }

    /*
      مهم:
      لا نسمع cart:changed هنا لأن useCart الأساسي يسمعه أصلًا.
      لو سمعناه هنا بنعمل طلبين /api/cart لنفس التغيير، وهذا يثقل الجوال.
    */
    window.addEventListener("cart:optimistic-add", onOptimisticAdd);
    window.addEventListener("product:add-to-cart:done", onAddDone);

    return () => {
      window.removeEventListener("cart:optimistic-add", onOptimisticAdd);
      window.removeEventListener("product:add-to-cart:done", onAddDone);

      if (externalReloadTimerRef.current) {
        window.clearTimeout(externalReloadTimerRef.current);
        externalReloadTimerRef.current = null;
      }
    };
  }, []);

  const shouldUseCache = Boolean(
    cached &&
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