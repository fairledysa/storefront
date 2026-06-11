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
  force?: boolean;
};

type CouponPreview = {
  code: string;
  ratio: number | null;
  amount: number;
  maxAmount: number | null;
};

function toNumber(value: any) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function round2(value: any) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function pickCartSummary(payload: any) {
  return (
    payload?.summary ||
    payload?.cart?.summary ||
    payload?.data?.summary ||
    payload?.checkout?.summary ||
    payload
  );
}

function pickCartData(payload: any) {
  return payload?.data && typeof payload.data === "object"
    ? payload.data
    : payload && typeof payload === "object"
      ? payload
      : {};
}

function hasUsableCartSummary(value: any) {
  if (!value || typeof value !== "object") return false;

  return (
    "subtotal" in value ||
    "total" in value ||
    "cartOfferProgress" in value ||
    "cart_offer_progress" in value ||
    "cartOffers" in value ||
    "cart_offers" in value
  );
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
    itemAny.unit_price_before_tax,
    itemAny.unitPriceBeforeTax,
    itemAny.final_unit_price_before_tax,
    itemAny.finalUnitPriceBeforeTax,
    itemAny.unit_price,
    itemAny.unitPrice,
    itemAny.final_unit_price,
    itemAny.finalUnitPrice,
    itemAny.price,
  );

  if (directUnit > 0) return directUnit;

  const lineSubtotal = firstPositiveNumber(
    itemAny.line_subtotal,
    itemAny.lineSubtotal,
  );

  if (lineSubtotal > 0) return lineSubtotal / qty;

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

function buildCouponPreview(
  summary: CartSummaryMoney | null,
  coupon: CartCoupon,
): CouponPreview | null {
  const couponAny: any = coupon ?? null;
  const summaryAny: any = summary ?? null;

  const code = String(couponAny?.code ?? "").trim();
  if (!code) return null;

  const subtotal = Math.max(0, toNumber(summaryAny?.subtotal));
  const discount = Math.max(0, toNumber(summaryAny?.discount));

  const maxAmountFromCoupon = firstPositiveNumber(
    couponAny?.maximum_amount,
    couponAny?.maximumAmount,
    couponAny?.max_amount,
    couponAny?.maxAmount,
  );

  const explicitType = String(
    couponAny?.discount_type ??
      couponAny?.discountType ??
      couponAny?.type ??
      "",
  )
    .trim()
    .toUpperCase();

  if (!(subtotal > 0) || !(discount > 0)) {
    return {
      code,
      ratio: null,
      amount: 0,
      maxAmount: maxAmountFromCoupon > 0 ? maxAmountFromCoupon : null,
    };
  }

  if (
    explicitType === "P" ||
    explicitType === "PERCENT" ||
    explicitType === "PERCENTAGE"
  ) {
    const explicitAmount = toNumber(couponAny?.amount ?? couponAny?.value);
    const ratio =
      explicitAmount > 0 && explicitAmount <= 100
        ? explicitAmount / 100
        : discount / subtotal;

    const safeRatio = Math.max(0, Math.min(0.95, ratio));
    const rawPercentDiscount = subtotal * safeRatio;

    const inferredMaxAmount =
      maxAmountFromCoupon > 0
        ? maxAmountFromCoupon
        : rawPercentDiscount > discount + 0.01
          ? discount
          : null;

    return {
      code,
      ratio: safeRatio,
      amount: discount,
      maxAmount: inferredMaxAmount,
    };
  }

  if (
    explicitType === "F" ||
    explicitType === "FIXED" ||
    explicitType === "AMOUNT"
  ) {
    return {
      code,
      ratio: null,
      amount: discount,
      maxAmount: maxAmountFromCoupon > 0 ? maxAmountFromCoupon : null,
    };
  }

  const ratio = discount / subtotal;

  return {
    code,
    ratio: ratio > 0 && ratio <= 0.95 ? ratio : null,
    amount: discount,
    maxAmount: maxAmountFromCoupon > 0 ? maxAmountFromCoupon : null,
  };
}

function computeLocalCouponDiscount(args: {
  subtotal: number;
  currentSummary: CartSummaryMoney | null;
  couponPreview: CouponPreview | null;
}) {
  const subtotal = Math.max(0, toNumber(args.subtotal));
  if (!(subtotal > 0)) return 0;

  const preview = args.couponPreview;
  if (!preview?.code) return 0;

  let discount = 0;

  if (preview.ratio !== null && preview.ratio > 0) {
    discount = subtotal * preview.ratio;
  } else {
    const currentAny: any = args.currentSummary ?? {};
    const currentDiscount = Math.max(0, toNumber(currentAny?.discount));
    const fallbackAmount = Math.max(
      0,
      preview.amount > 0 ? preview.amount : currentDiscount,
    );

    discount = fallbackAmount;
  }

  if (preview.maxAmount !== null && preview.maxAmount > 0) {
    discount = Math.min(discount, preview.maxAmount);
  }

  return round2(Math.max(0, Math.min(subtotal, discount)));
}

function recomputeSummaryFromItems(
  nextItems: CartItemEnriched[],
  currentSummary: CartSummaryMoney | null,
  couponPreview: CouponPreview | null,
) {
  const currentAny: any = currentSummary ?? {};

  const currency = String(currentAny?.currency || "SAR").trim().toUpperCase();

  const subtotal = round2(
    nextItems.reduce((sum, item) => {
      const qty = Math.max(1, Math.floor(toNumber(item.qty)));
      return sum + readUnitPrice(item) * qty;
    }, 0),
  );

  const previousSubtotal = Math.max(0, toNumber(currentAny?.subtotal));
  const previousTax = Math.max(0, toNumber(currentAny?.tax));

  const taxRate =
    previousSubtotal > 0 && previousTax > 0 ? previousTax / previousSubtotal : 0;

  const tax = round2(taxRate > 0 ? Math.max(0, subtotal * taxRate) : 0);

  const discount = computeLocalCouponDiscount({
    subtotal,
    currentSummary,
    couponPreview,
  });

  const shipping = Math.max(0, toNumber(currentAny?.shipping));
  const paymentFee = Math.max(
    0,
    toNumber(currentAny?.payment_fee ?? currentAny?.paymentFee),
  );

  const total = round2(
    Math.max(0, subtotal - discount + tax + shipping + paymentFee),
  );

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

function patchCouponDiscount(coupon: CartCoupon, discount: number): CartCoupon {
  const couponAny: any = coupon ?? null;
  if (!couponAny?.code) return coupon;

  return {
    ...couponAny,
    discount_amount: round2(discount),
  } as CartCoupon;
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
  const [isRepricing, setIsRepricing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cart, setCart] = useState<any>(null);
  const [items, setItems] = useState<CartItemEnriched[]>([]);
  const [summary, setSummary] = useState<CartSummaryMoney | null>(null);
  const [coupon, setCoupon] = useState<CartCoupon>(null);
  const [toast, setToast] = useState<Toast>(null);

  const itemsRef = useRef<CartItemEnriched[]>([]);
  const summaryRef = useRef<CartSummaryMoney | null>(null);
  const couponRef = useRef<CartCoupon>(null);
  const couponPreviewRef = useRef<CouponPreview | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const reloadSeqRef = useRef(0);
  const repriceSeqRef = useRef(0);
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

  const applyCartResponse = useCallback((json: CartResponse | any) => {
    const data = pickCartData(json);
    const nextItems = (
      Array.isArray(data?.items) ? data.items : itemsRef.current
    ) as CartItemEnriched[];
    const pickedSummary = pickCartSummary(json);
    const nextSummary = (hasUsableCartSummary(pickedSummary)
      ? pickedSummary
      : null) as CartSummaryMoney | null;
    const nextCoupon = (
      "coupon" in data ? data?.coupon ?? null : couponRef.current
    ) as CartCoupon;

    if ("cart" in data) {
      setCart(data?.cart ?? null);
    }

    itemsRef.current = nextItems;
    summaryRef.current = nextSummary;
    couponRef.current = nextCoupon;
    couponPreviewRef.current = buildCouponPreview(nextSummary, nextCoupon);

    setItems(nextItems);
    setSummary(nextSummary);
    setCoupon(nextCoupon);
  }, []);

  const reload = useCallback(
    async (opts?: ReloadOptions) => {
      const silent = Boolean(opts?.silent);
      const force = Boolean(opts?.force);
      const requestId = ++reloadSeqRef.current;

      try {
        setError(null);
        if (!silent) setLoading(true);

        const json = (await apiGetCart()) as CartResponse;

        if (!mountedRef.current) return;
        if (requestId !== reloadSeqRef.current) return;

        if (
          silent &&
          !force &&
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

  const refreshCartPricing = useCallback(
    async (reason?: string, payload?: any) => {
      void reason;
      void payload;

      const seq = ++repriceSeqRef.current;

      try {
        setIsRepricing(true);

        const json = await apiGetCart();

        if (!mountedRef.current) return;
        if (seq !== repriceSeqRef.current) return;

        applyCartResponse(json);
      } catch (e: any) {
        if (!mountedRef.current) return;
        if (seq !== repriceSeqRef.current) return;

        flash(e?.message ?? "تعذر تحديث عروض السلة", "error");
      } finally {
        if (!mountedRef.current) return;
        if (seq === repriceSeqRef.current) {
          setIsRepricing(false);
        }
      }
    },
    [applyCartResponse, flash],
  );

  const setItemsFast = useCallback((nextItems: CartItemEnriched[]) => {
    itemsRef.current = nextItems;
    setItems(nextItems);

    const nextSummary = recomputeSummaryFromItems(
      nextItems,
      summaryRef.current,
      couponPreviewRef.current,
    );

    summaryRef.current = nextSummary;
    setSummary(nextSummary);

    if (couponRef.current) {
      const nextCoupon = patchCouponDiscount(
        couponRef.current,
        toNumber((nextSummary as any)?.discount),
      );

      couponRef.current = nextCoupon;
      setCoupon(nextCoupon);
    }
  }, []);

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

        desiredQtyRef.current.delete(cartItemId);
        qtyTimersRef.current.delete(cartItemId);
        markSyncing(cartItemId, false);

        emitCartChangedWithoutSelfReload();
        await refreshCartPricing("qty", res);
      } catch (e: any) {
        const latestVersion = versionRef.current.get(cartItemId);
        if (latestVersion !== version) return;

        shakeCartLine(cartItemId);
        flash(e?.message ?? "تعذر تحديث الكمية", "error");

        void reload({ silent: true, force: true });
        if (mountedRef.current) setIsRepricing(false);
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
      refreshCartPricing,
      reload,
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

      void reload({ silent: true, force: true });
    };

    window.addEventListener("cart:changed", onChanged as EventListener);

    return () => {
      mountedRef.current = false;
      reloadSeqRef.current += 1;
      repriceSeqRef.current += 1;

      window.removeEventListener("cart:changed", onChanged as EventListener);

      if (toastTimer.current) clearTimeout(toastTimer.current);
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

      setIsRepricing(true);
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

      setIsRepricing(true);
      setItemsFast(before.filter((item) => String(item.id) !== id));
      emitCartCountDelta(-removedQty);

      try {
        const res: any = await apiRemoveCartItem(id);

        const msg = String(res?.data?.notice?.message ?? "").trim();
        flash(msg || "تم حذف المنتج من السلة", "info");

        emitCartChangedWithoutSelfReload();
        await refreshCartPricing("remove", res);
      } catch (e: any) {
        setItemsFast(before);
        emitCartCountDelta(removedQty);

        flash(e?.message ?? "تعذر حذف المنتج", "error");
        void reload({ silent: true, force: true });
        if (mountedRef.current) setIsRepricing(false);
      } finally {
        markSyncing(id, false);
      }
    },
    [
      emitCartChangedWithoutSelfReload,
      flash,
      markSyncing,
      refreshCartPricing,
      reload,
      setItemsFast,
    ],
  );

  const applyCoupon = useCallback(
    async (code: string) => {
      try {
        setOperationBusy(true);
        setIsRepricing(true);

        const res = await apiApplyCoupon(code);

        flash("تم تطبيق الكوبون", "info");

        await refreshCartPricing("apply-coupon", res);
        emitCartChangedWithoutSelfReload();
      } catch (e: any) {
        flash(e?.message ?? "تعذر تطبيق الكوبون", "error");
        if (mountedRef.current) setIsRepricing(false);
      } finally {
        if (mountedRef.current) setOperationBusy(false);
      }
    },
    [emitCartChangedWithoutSelfReload, flash, refreshCartPricing],
  );

  const removeCoupon = useCallback(async () => {
    try {
      setOperationBusy(true);
      setIsRepricing(true);

      const res = await apiRemoveCoupon();

      couponRef.current = null;
      couponPreviewRef.current = null;
      setCoupon(null);
      setItemsFast(itemsRef.current);

      flash("تم إزالة الكوبون", "info");

      await refreshCartPricing("remove-coupon", res);
      emitCartChangedWithoutSelfReload();
    } catch (e: any) {
      flash(e?.message ?? "تعذر إزالة الكوبون", "error");
      if (mountedRef.current) setIsRepricing(false);
    } finally {
      if (mountedRef.current) setOperationBusy(false);
    }
  }, [emitCartChangedWithoutSelfReload, flash, refreshCartPricing, setItemsFast]);

  return {
    loading,
    busy,
    isRepricing,
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
