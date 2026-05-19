// FILE: apps/storefront/src/themes/malak/screens/cart/useCart.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CartCoupon,
  CartItemEnriched,
  CartResponse,
  CartSummaryMoney,
} from "./_components/types";
import {
  apiApplyCoupon,
  apiGetCart,
  apiPatchCartItem,
  apiRemoveCartItem,
  apiRemoveCoupon,
} from "./_components/cart-api";

type ToastKind = "info" | "error";
type Toast = null | { message: string; kind: ToastKind };

type ReloadOptions = {
  silent?: boolean;
};

function toNumber(value: any) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function clampQty(value: any) {
  const n = Number(value ?? 1);
  if (!Number.isFinite(n)) return 1;

  return Math.max(1, Math.floor(n));
}

function firstPositiveNumber(...values: any[]) {
  for (const value of values) {
    const n = Number(value);

    if (Number.isFinite(n) && n > 0) return n;
  }

  return 0;
}

function readUnitPrice(item: CartItemEnriched) {
  const itemAny: any = item ?? {};
  const qty = Math.max(1, Math.floor(toNumber(itemAny.qty)));

  const directUnit = firstPositiveNumber(
    itemAny.unit_price,
    itemAny.unitPrice,
    itemAny.final_unit_price,
    itemAny.finalUnitPrice,
    itemAny.price,
  );

  if (directUnit > 0) return directUnit;

  const lineTotal = firstPositiveNumber(
    itemAny.line_total,
    itemAny.lineTotal,
    itemAny.total_price,
    itemAny.totalPrice,
  );

  if (lineTotal > 0) return lineTotal / qty;

  const productSale = firstPositiveNumber(item.product?.sale_price);
  if (productSale > 0) return productSale;

  return firstPositiveNumber(item.product?.price);
}

function getFreeShippingThreshold(summary: any) {
  return firstPositiveNumber(
    summary?.free_shipping_threshold,
    summary?.freeShippingThreshold,
    summary?.free_shipping_minimum,
    summary?.freeShippingMinimum,
    summary?.free_shipping_minimum_subtotal,
    summary?.freeShippingMinimumSubtotal,
    summary?.free_shipping_rule_minimum,
    summary?.freeShippingRuleMinimum,
    summary?.free_shipping_rule_minimum_subtotal,
    summary?.freeShippingRuleMinimumSubtotal,
    summary?.minimum_free_shipping_amount,
    summary?.minimumFreeShippingAmount,
    summary?.free_shipping_target,
    summary?.freeShippingTarget,
  );
}

function enrichFreeShippingProgress(summary: any, subtotal: number) {
  if (!summary || typeof summary !== "object") return summary;

  const threshold = getFreeShippingThreshold(summary);
  if (!(threshold > 0)) return summary;

  const remaining = Math.max(0, threshold - subtotal);
  const percent = Math.max(
    0,
    Math.min(100, Math.round((Math.max(0, subtotal) / threshold) * 100)),
  );

  const reached = remaining <= 0;

  return {
    ...summary,

    free_shipping_threshold: threshold,
    freeShippingThreshold: threshold,

    free_shipping_remaining: remaining,
    freeShippingRemaining: remaining,

    free_shipping_progress_percent: reached ? 100 : percent,
    freeShippingProgressPercent: reached ? 100 : percent,

    free_shipping_reached: reached,
    freeShippingReached: reached,

    free_shipping:
      reached || summary.free_shipping === true || summary.freeShipping === true,
    freeShipping:
      reached || summary.free_shipping === true || summary.freeShipping === true,
  };
}

function recomputeSummaryFromItems(
  nextItems: CartItemEnriched[],
  currentSummary: CartSummaryMoney | null,
) {
  const currentAny: any = currentSummary ?? {};

  const currency = String(currentAny?.currency || "SAR").trim().toUpperCase();

  const subtotal = nextItems.reduce((sum, item) => {
    const qty = Math.max(1, Math.floor(toNumber(item.qty)));
    return sum + readUnitPrice(item) * qty;
  }, 0);

  const currentDiscount = Math.max(0, toNumber(currentAny?.discount));
  const discount = Math.min(currentDiscount, subtotal);

  const tax = Math.max(0, toNumber(currentAny?.tax));
  const shipping = Math.max(0, toNumber(currentAny?.shipping));
  const paymentFee = Math.max(
    0,
    toNumber(currentAny?.payment_fee ?? currentAny?.paymentFee),
  );

  const total = Math.max(0, subtotal - discount + tax + shipping + paymentFee);

  return enrichFreeShippingProgress(
    {
      ...currentAny,

      subtotal,
      discount,
      tax,
      shipping,
      payment_fee: paymentFee,
      paymentFee,
      total,
      currency: currency || "SAR",
    },
    subtotal,
  );
}

function emitCartCountDelta(delta: number) {
  if (typeof window === "undefined") return;

  const qty = Math.abs(Math.floor(Number(delta || 0)));
  if (!qty) return;

  window.dispatchEvent(
    new CustomEvent(delta > 0 ? "cart:count:increment" : "cart:count:decrement", {
      detail: { qty },
    }),
  );
}

function shakeCartLine(cartItemId: string) {
  if (typeof document === "undefined") return;

  const selector = `[data-mk-cart-item-id="${CSS.escape(String(cartItemId))}"]`;
  const row = document.querySelector<HTMLElement>(selector);
  if (!row) return;

  row.classList.remove("mk-dcart-item--shake");
  void row.offsetWidth;
  row.classList.add("mk-dcart-item--shake");

  window.setTimeout(() => {
    row.classList.remove("mk-dcart-item--shake");
  }, 620);
}

export function useCart() {
  const [loading, setLoading] = useState(true);
  const [operationBusy, setOperationBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cart, setCart] = useState<any>(null);
  const [items, setItems] = useState<CartItemEnriched[]>([]);
  const [summary, setSummary] = useState<CartSummaryMoney | null>(null);
  const [coupon, setCoupon] = useState<CartCoupon>(null);
  const [toast, setToast] = useState<Toast>(null);

  const itemsRef = useRef<CartItemEnriched[]>([]);
  const summaryRef = useRef<CartSummaryMoney | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mountedRef = useRef(true);
  const reloadSeqRef = useRef(0);
  const suppressNextCartChangedRef = useRef(false);

  const syncingIdsRef = useRef<Set<string>>(new Set());

  const qtyTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const desiredQtyRef = useRef<Map<string, number>>(new Map());
  const versionRef = useRef<Map<string, number>>(new Map());

  const busy = operationBusy;

  const totalQty = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.qty ?? 0), 0),
    [items],
  );

  const markSyncing = useCallback((cartItemId: string, value: boolean) => {
    const id = String(cartItemId);
    if (!id) return;

    if (value) {
      syncingIdsRef.current.add(id);
    } else {
      syncingIdsRef.current.delete(id);
    }
  }, []);

  const flash = useCallback((message: string, kind: ToastKind = "info") => {
    const cleanMessage = String(message ?? "").trim();
    if (!cleanMessage) return;

    setToast({ message: cleanMessage, kind });

    if (toastTimer.current) clearTimeout(toastTimer.current);

    toastTimer.current = setTimeout(
      () => {
        if (!mountedRef.current) return;
        setToast(null);
      },
      kind === "error" ? 4200 : 2800,
    );
  }, []);

  const setItemsFast = useCallback((nextItems: CartItemEnriched[]) => {
    itemsRef.current = nextItems;
    setItems(nextItems);

    const nextSummary = recomputeSummaryFromItems(
      nextItems,
      summaryRef.current,
    );

    summaryRef.current = nextSummary;
    setSummary(nextSummary);
  }, []);

  const applyCartResponse = useCallback((json: CartResponse) => {
    const nextItems = (json?.data?.items ?? []) as CartItemEnriched[];
    const nextSummary = (json?.data?.summary ?? null) as CartSummaryMoney | null;

    setCart(json?.data?.cart ?? null);

    itemsRef.current = nextItems;
    summaryRef.current = nextSummary;

    setItems(nextItems);
    setSummary(nextSummary);
    setCoupon((json?.data?.coupon ?? null) as CartCoupon);
  }, []);

  const reload = useCallback(
    async (opts?: ReloadOptions) => {
      const silent = Boolean(opts?.silent);
      const requestId = ++reloadSeqRef.current;

      try {
        setError(null);
        if (!silent) setLoading(true);

        const json = (await apiGetCart()) as CartResponse;

        if (!mountedRef.current) return;
        if (requestId !== reloadSeqRef.current) return;

        if (
          silent &&
          (desiredQtyRef.current.size > 0 || qtyTimersRef.current.size > 0)
        ) {
          return;
        }

        applyCartResponse(json);
      } catch (e: any) {
        if (!mountedRef.current) return;
        if (requestId !== reloadSeqRef.current) return;

        setError(e?.message ?? "تعذر تحميل السلة");
      } finally {
        if (!mountedRef.current) return;
        if (!silent) setLoading(false);
      }
    },
    [applyCartResponse],
  );

  const scheduleSilentReload = useCallback(
    (delay = 1300) => {
      if (syncTimer.current) clearTimeout(syncTimer.current);

      syncTimer.current = setTimeout(() => {
        if (!mountedRef.current) return;
        void reload({ silent: true });
      }, delay);
    },
    [reload],
  );

  const emitCartChangedWithoutSelfReload = useCallback(() => {
    if (typeof window === "undefined") return;

    suppressNextCartChangedRef.current = true;
    window.dispatchEvent(new CustomEvent("cart:changed"));
  }, []);

  const flushQty = useCallback(
    async (cartItemId: string, version: number) => {
      const desiredQty = desiredQtyRef.current.get(cartItemId);

      if (!desiredQty) {
        markSyncing(cartItemId, false);
        return;
      }

      try {
        const res: any = await apiPatchCartItem({
          op: "set_qty",
          cart_item_id: cartItemId,
          qty: desiredQty,
        });

        const latestVersion = versionRef.current.get(cartItemId);
        if (latestVersion !== version) return;

        const serverQty = clampQty(
          res?.data?.item?.qty ??
            res?.data?.stock?.in_cart_after ??
            desiredQty,
        );

        const noticeCode = String(res?.data?.notice?.code ?? "").trim();
        const noticeMessage = String(res?.data?.notice?.message ?? "").trim();

        if (serverQty !== desiredQty) {
          const diff = serverQty - desiredQty;

          setItemsFast(
            itemsRef.current.map((item) => {
              if (String(item.id) !== String(cartItemId)) return item;
              return { ...item, qty: serverQty };
            }),
          );

          emitCartCountDelta(diff);
          shakeCartLine(cartItemId);

          flash(
            noticeMessage || "تم ضبط الكمية حسب المتاح في المخزون.",
            "error",
          );
        } else if (noticeMessage) {
          const isLimit =
            noticeCode.includes("LIMIT") ||
            noticeCode.includes("REDUCED") ||
            noticeCode.includes("QTY");

          flash(noticeMessage, isLimit ? "error" : "info");

          if (isLimit) {
            shakeCartLine(cartItemId);
          }
        }

        emitCartChangedWithoutSelfReload();
        scheduleSilentReload(1700);
      } catch (e: any) {
        const latestVersion = versionRef.current.get(cartItemId);
        if (latestVersion !== version) return;

        shakeCartLine(cartItemId);
        flash(e?.message ?? "تعذر تحديث الكمية", "error");

        await reload({ silent: true });
      } finally {
        const latestVersion = versionRef.current.get(cartItemId);

        if (latestVersion === version) {
          desiredQtyRef.current.delete(cartItemId);
          markSyncing(cartItemId, false);
        }
      }
    },
    [
      emitCartChangedWithoutSelfReload,
      flash,
      markSyncing,
      reload,
      scheduleSilentReload,
      setItemsFast,
    ],
  );

  useEffect(() => {
    mountedRef.current = true;

    void reload();

    const onChanged = () => {
      if (suppressNextCartChangedRef.current) {
        suppressNextCartChangedRef.current = false;
        return;
      }

      void reload({ silent: true });
    };

    window.addEventListener("cart:changed", onChanged as EventListener);

    return () => {
      mountedRef.current = false;
      reloadSeqRef.current += 1;

      window.removeEventListener("cart:changed", onChanged as EventListener);

      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (syncTimer.current) clearTimeout(syncTimer.current);

      syncingIdsRef.current.clear();

      qtyTimersRef.current.forEach((timer) => clearTimeout(timer));
      qtyTimersRef.current.clear();

      desiredQtyRef.current.clear();
      versionRef.current.clear();
    };
  }, [reload]);

  const inc = useCallback(
    async (cartItemId: string, delta: number) => {
      const id = String(cartItemId);
      const cleanDelta = Math.floor(Number(delta || 0));

      if (!id || !cleanDelta) return;

      const currentItems = itemsRef.current;
      const currentItem = currentItems.find(
        (item) => String(item.id) === String(id),
      );

      if (!currentItem) return;

      const currentQty = Math.max(1, Math.floor(toNumber(currentItem.qty)));
      const nextQty = Math.max(1, currentQty + cleanDelta);
      const actualDelta = nextQty - currentQty;

      if (!actualDelta) {
        shakeCartLine(id);
        return;
      }

      setItemsFast(
        currentItems.map((item) => {
          if (String(item.id) !== String(id)) return item;
          return { ...item, qty: nextQty };
        }),
      );

      emitCartCountDelta(actualDelta);
      markSyncing(id, true);

      const nextVersion = (versionRef.current.get(id) ?? 0) + 1;
      versionRef.current.set(id, nextVersion);
      desiredQtyRef.current.set(id, nextQty);

      const oldTimer = qtyTimersRef.current.get(id);
      if (oldTimer) clearTimeout(oldTimer);

      const timer = setTimeout(() => {
        qtyTimersRef.current.delete(id);
        void flushQty(id, nextVersion);
      }, 120);

      qtyTimersRef.current.set(id, timer);
    },
    [flushQty, markSyncing, setItemsFast],
  );

  const remove = useCallback(
    async (cartItemId: string) => {
      const id = String(cartItemId);
      const before = itemsRef.current;
      const removedItem = before.find((item) => String(item.id) === id);

      if (!removedItem) return;

      const oldTimer = qtyTimersRef.current.get(id);
      if (oldTimer) clearTimeout(oldTimer);

      qtyTimersRef.current.delete(id);
      desiredQtyRef.current.delete(id);
      versionRef.current.delete(id);
      markSyncing(id, true);

      const removedQty = Math.max(1, Math.floor(toNumber(removedItem.qty)));

      setItemsFast(before.filter((item) => String(item.id) !== id));
      emitCartCountDelta(-removedQty);

      try {
        const res: any = await apiRemoveCartItem(id);

        const msg = String(res?.data?.notice?.message ?? "").trim();
        flash(msg || "تم حذف المنتج من السلة", "info");

        emitCartChangedWithoutSelfReload();
        scheduleSilentReload(900);
      } catch (e: any) {
        setItemsFast(before);
        emitCartCountDelta(removedQty);

        flash(e?.message ?? "تعذر حذف المنتج", "error");
        await reload({ silent: true });
      } finally {
        markSyncing(id, false);
      }
    },
    [
      emitCartChangedWithoutSelfReload,
      flash,
      markSyncing,
      reload,
      scheduleSilentReload,
      setItemsFast,
    ],
  );

  const applyCoupon = useCallback(
    async (code: string) => {
      try {
        setOperationBusy(true);

        await apiApplyCoupon(code);

        flash("تم تطبيق الكوبون", "info");

        await reload({ silent: true });
        emitCartChangedWithoutSelfReload();
      } catch (e: any) {
        flash(e?.message ?? "تعذر تطبيق الكوبون", "error");
      } finally {
        if (mountedRef.current) setOperationBusy(false);
      }
    },
    [emitCartChangedWithoutSelfReload, flash, reload],
  );

  const removeCoupon = useCallback(async () => {
    try {
      setOperationBusy(true);

      await apiRemoveCoupon();

      flash("تم إزالة الكوبون", "info");

      await reload({ silent: true });
      emitCartChangedWithoutSelfReload();
    } catch (e: any) {
      flash(e?.message ?? "تعذر إزالة الكوبون", "error");
    } finally {
      if (mountedRef.current) setOperationBusy(false);
    }
  }, [emitCartChangedWithoutSelfReload, flash, reload]);

  return {
    loading,
    busy,
    error,
    cart,
    items,
    summary,
    coupon,
    totalQty,
    toast,
    flash,
    reload,
    inc,
    remove,
    applyCoupon,
    removeCoupon,
  };
}