// FILE: apps/storefront/src/themes/malak/screens-mobile/cart/useMobileCart.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  apiApplyCoupon,
  apiGetCart,
  apiPatchCartItem,
  apiRemoveCartItem,
  apiRemoveCoupon,
} from "../../screens/cart/_components/cart-api";
import type {
  CartCoupon,
  CartItemEnriched,
  CartResponse,
  CartSummaryMoney,
} from "../../screens/cart/_components/types";

type ToastState = null | {
  message: string;
  kind: "info" | "error";
};

type LoadOptions = {
  silent?: boolean;
};

function readCartResponse(json: CartResponse | any) {
  const data = json?.data ?? {};
  const items = Array.isArray(data?.items) ? data.items : [];
  const summary = (data?.summary ?? null) as CartSummaryMoney | null;
  const coupon = (data?.coupon ?? null) as CartCoupon;
  return { items, summary, coupon };
}

function clampQty(v: any) {
  const n = Number(v ?? 1);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.floor(n));
}

function calculateSummaryFromItems(
  items: CartItemEnriched[],
  oldSummary: CartSummaryMoney | null,
  coupon: CartCoupon,
): CartSummaryMoney | null {
  const currency = oldSummary?.currency || "SAR";

  let subtotal = 0;

  for (const item of items) {
    const qty = clampQty(item?.qty);
    const sale = Number(item?.product?.sale_price ?? 0);
    const base = Number(item?.product?.price ?? 0);

    const price =
      Number.isFinite(sale) && sale > 0
        ? sale
        : Number.isFinite(base) && base > 0
          ? base
          : 0;

    subtotal += price * qty;
  }

  const discount = coupon
    ? Math.max(0, Math.min(Number(coupon.discount_amount ?? 0), subtotal))
    : Number(oldSummary?.discount ?? 0) > 0
      ? Math.max(0, Math.min(Number(oldSummary?.discount ?? 0), subtotal))
      : 0;

  const tax = Number(oldSummary?.tax ?? 0);
  const shipping = Number(oldSummary?.shipping ?? 0);

  return {
    subtotal,
    discount,
    tax,
    shipping,
    total: Math.max(0, subtotal - discount + tax + shipping),
    currency,
  };
}

export function useMobileCart() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const [items, setItems] = useState<CartItemEnriched[]>([]);
  const [summary, setSummary] = useState<CartSummaryMoney | null>(null);
  const [coupon, setCoupon] = useState<CartCoupon>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const toastTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const skipNextCartChangedRef = useRef(false);
  const lastLoadIdRef = useRef(0);

  const flash = useCallback((message: string, kind: "info" | "error" = "info") => {
    if (!message) return;

    setToast({ message, kind });

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 2400);
  }, []);

  const load = useCallback(
    async (opts: LoadOptions = {}) => {
      const loadId = lastLoadIdRef.current + 1;
      lastLoadIdRef.current = loadId;

      try {
        if (!opts.silent) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        const json = await apiGetCart();
        if (!mountedRef.current || loadId !== lastLoadIdRef.current) return;

        const next = readCartResponse(json);

        setItems(next.items);
        setSummary(next.summary);
        setCoupon(next.coupon);
      } catch (e: any) {
        if (!mountedRef.current) return;

        flash(e?.message || "تعذر تحميل السلة", "error");

        if (!opts.silent) {
          setItems([]);
          setSummary(null);
          setCoupon(null);
        }
      } finally {
        if (!mountedRef.current || loadId !== lastLoadIdRef.current) return;

        setLoading(false);
        setRefreshing(false);
      }
    },
    [flash],
  );

  useEffect(() => {
    mountedRef.current = true;

    load();

    const onCartChanged = () => {
      if (skipNextCartChangedRef.current) {
        skipNextCartChangedRef.current = false;
        return;
      }

      load({ silent: true });
    };

    window.addEventListener("cart:changed", onCartChanged);

    return () => {
      mountedRef.current = false;
      window.removeEventListener("cart:changed", onCartChanged);

      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, [load]);

  const totalQty = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + Math.max(0, Number(item?.qty ?? 0)),
      0,
    );
  }, [items]);

  const inc = useCallback(
    async (cart_item_id: string, delta: number) => {
      const item = items.find((x) => String(x.id) === String(cart_item_id));
      if (!item) return;

      const currentQty = clampQty(item.qty);
      const nextQty = clampQty(currentQty + Number(delta ?? 0));

      if (nextQty === currentQty) return;

      const beforeItems = items;
      const beforeSummary = summary;

      const optimisticItems = items.map((x) =>
        String(x.id) === String(cart_item_id) ? { ...x, qty: nextQty } : x,
      );

      setItems(optimisticItems);
      setSummary(calculateSummaryFromItems(optimisticItems, summary, coupon));

      try {
        setBusy(true);

        const res: any = await apiPatchCartItem({
          op: "set_qty",
          cart_item_id,
          qty: nextQty,
        });

        const msg = res?.data?.notice?.message;
        if (msg) flash(msg, "info");

        await load({ silent: true });

        skipNextCartChangedRef.current = true;
        window.dispatchEvent(new CustomEvent("cart:changed"));
      } catch (e: any) {
        setItems(beforeItems);
        setSummary(beforeSummary);
        flash(e?.message || "تعذر تحديث الكمية", "error");
      } finally {
        setBusy(false);
      }
    },
    [items, summary, coupon, load, flash],
  );

  const remove = useCallback(
    async (cart_item_id: string) => {
      const beforeItems = items;
      const beforeSummary = summary;

      const optimisticItems = items.filter(
        (x) => String(x.id) !== String(cart_item_id),
      );

      setItems(optimisticItems);
      setSummary(calculateSummaryFromItems(optimisticItems, summary, coupon));

      try {
        setBusy(true);

        await apiRemoveCartItem(cart_item_id);

        await load({ silent: true });

        skipNextCartChangedRef.current = true;
        window.dispatchEvent(new CustomEvent("cart:changed"));

        flash("تم حذف المنتج من السلة", "info");
      } catch (e: any) {
        setItems(beforeItems);
        setSummary(beforeSummary);
        flash(e?.message || "تعذر حذف المنتج من السلة", "error");
      } finally {
        setBusy(false);
      }
    },
    [items, summary, coupon, load, flash],
  );

  const applyCoupon = useCallback(
    async (code: string) => {
      const clean = String(code ?? "").trim();
      if (!clean) return;

      try {
        setBusy(true);

        await apiApplyCoupon(clean);
        await load({ silent: true });

        skipNextCartChangedRef.current = true;
        window.dispatchEvent(new CustomEvent("cart:changed"));

        flash("تم تطبيق الكوبون", "info");
      } catch (e: any) {
        flash(e?.message || "تعذر تطبيق الكوبون", "error");
      } finally {
        setBusy(false);
      }
    },
    [load, flash],
  );

  const removeCoupon = useCallback(async () => {
    try {
      setBusy(true);

      await apiRemoveCoupon();
      await load({ silent: true });

      skipNextCartChangedRef.current = true;
      window.dispatchEvent(new CustomEvent("cart:changed"));

      flash("تمت إزالة الكوبون", "info");
    } catch (e: any) {
      flash(e?.message || "تعذر إزالة الكوبون", "error");
    } finally {
      setBusy(false);
    }
  }, [load, flash]);

  return {
    loading,
    refreshing,
    busy,
    items,
    summary,
    coupon,
    totalQty,
    toast,
    flash,
    load,
    inc,
    remove,
    applyCoupon,
    removeCoupon,
  };
}