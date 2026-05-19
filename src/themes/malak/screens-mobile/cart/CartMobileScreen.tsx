// FILE: apps/storefront/src/themes/malak/screens-mobile/cart/CartMobileScreen.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useNavStack } from "../../app-navigation/stack";
import { useMobileCart } from "./useMobileCart";
import MobileCartHeader from "./_components/MobileCartHeader";
import MobileCartItemsList from "./_components/MobileCartItemsList";
import MobileCartSummarySheet from "./_components/MobileCartSummarySheet";
import MobileEditOptionsSheet from "./_components/MobileEditOptionsSheet";

export default function CartMobileScreen() {
  const router = useRouter();

  const setCurrent = useNavStack((s) => s.setCurrent);

  const {
    loading,
    busy,
    refreshing,
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
  } = useMobileCart();

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  useEffect(() => {
    setCurrent("cart");
  }, [setCurrent]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const shouldOpenAuth = params.get("auth") === "1";

    if (shouldOpenAuth) {
      window.dispatchEvent(new CustomEvent("auth:open"));

      params.delete("auth");

      const newUrl =
        window.location.pathname +
        (params.toString() ? `?${params.toString()}` : "");

      window.history.replaceState({}, "", newUrl);
    }
  }, []);

  const editingItem = useMemo(() => {
    return items.find((x) => String(x.id) === String(editingItemId)) ?? null;
  }, [items, editingItemId]);

  const total = Number(summary?.total ?? 0);
  const subtotal = Number(summary?.subtotal ?? 0);
  const currency = summary?.currency || "SAR";
  const hasItems = items.length > 0;

  function moneyCompact(v: number) {
    return `${new Intl.NumberFormat("ar-SA", {
      maximumFractionDigits: 0,
    }).format(Number(v || 0))} ${currency}`;
  }

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }

  function handleContinueShopping() {
    router.push("/");
  }

  return (
    <div dir="rtl" className="mk-mobile-cart">
      <MobileCartHeader
        title="سلة التسوق"
        subtitle={
          loading
            ? "نجهز سلتك..."
            : totalQty > 0
              ? `${totalQty} قطعة داخل السلة`
              : "سلتك فارغة"
        }
        refreshing={refreshing}
        onBack={handleBack}
        onContinueShopping={handleContinueShopping}
      />

      {toast?.message ? (
        <div className="mk-mobile-cart-toast">
          <div
            className={[
              "mk-mobile-cart-toast__inner",
              toast.kind === "error"
                ? "mk-mobile-cart-toast__inner--error"
                : "",
            ].join(" ")}
          >
            {toast.message}
          </div>
        </div>
      ) : null}

      <MobileCartItemsList
        items={items}
        loading={loading}
        busy={busy}
        onInc={inc}
        onRemove={remove}
        onEdit={setEditingItemId}
        onContinueShopping={handleContinueShopping}
      />

      {hasItems ? (
        <div className="mk-mobile-cart-checkout">
          <div className="mk-mobile-cart-checkout__card">
            {busy || refreshing ? (
              <div className="mk-mobile-cart-checkout__loadingBar" />
            ) : null}

            <div className="mk-mobile-cart-checkout__top">
              <button
                type="button"
                onClick={() => setSummaryOpen(true)}
                className="mk-mobile-cart-checkout__totalBtn"
              >
                <div className="mk-mobile-cart-checkout__label">الإجمالي</div>

                <div className="mk-mobile-cart-checkout__prices">
                  <div className="mk-mobile-cart-checkout__total">
                    {moneyCompact(total)}
                  </div>

                  {subtotal > total ? (
                    <div className="mk-mobile-cart-checkout__subtotal">
                      {moneyCompact(subtotal)}
                    </div>
                  ) : null}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSummaryOpen(true)}
                className="mk-mobile-cart-checkout__details"
              >
                التفاصيل
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/checkout";
              }}
              disabled={loading || busy || items.length === 0}
              className="mk-mobile-cart-checkout__submit"
            >
              {busy ? "جاري التحديث..." : "متابعة الدفع"}
            </button>
          </div>
        </div>
      ) : null}

      <MobileCartSummarySheet
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        onCheckout={() => {
          window.location.href = "/checkout";
        }}
        summary={summary}
        itemsCount={items.length}
        totalQty={totalQty}
        coupon={coupon}
        loading={loading}
        busy={busy}
        onApplyCoupon={applyCoupon}
        onRemoveCoupon={removeCoupon}
      />

      <MobileEditOptionsSheet
        open={Boolean(editingItem)}
        item={editingItem}
        onClose={() => setEditingItemId(null)}
        onChanged={() => load({ silent: true })}
        flash={flash}
      />
    </div>
  );
}