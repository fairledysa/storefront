// FILE: apps/storefront/src/themes/malak/screens/cart/CartScreen.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavStack } from "../../app-navigation/stack";
import { useCart } from "./useCart";
import CartItemsList from "./_components/CartItemsList";
import CartSummary from "./_components/CartSummary";

type ToastViewKind = "success" | "error" | "info";

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function resolveToastKind(message: string, kind: unknown): ToastViewKind {
  if (kind === "error") return "error";

  const m = message.trim();

  if (
    m.includes("تم") ||
    m.includes("نجاح") ||
    m.includes("حفظ") ||
    m.includes("تحديث") ||
    m.includes("مبروك") ||
    m.includes("حصلت")
  ) {
    return "success";
  }

  return "info";
}

function getToastTitle(kind: ToastViewKind) {
  if (kind === "error") return "تنبيه مهم";
  if (kind === "success") return "تم التحديث";
  return "معلومة";
}

function getToastIcon(kind: ToastViewKind) {
  if (kind === "error") return "!";
  if (kind === "success") return "✓";
  return "i";
}

export default function CartScreen() {
  const pop = useNavStack((s) => s.pop);
  const push = useNavStack((s) => s.push);

  const {
    loading,
    busy,
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
  } = useCart();

  const [dismissedToastKey, setDismissedToastKey] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const shouldOpenAuth = params.get("auth") === "1";

    if (!shouldOpenAuth) return;

    window.dispatchEvent(new CustomEvent("auth:open"));

    params.delete("auth");

    const newUrl =
      window.location.pathname +
      (params.toString() ? `?${params.toString()}` : "");

    window.history.replaceState({}, "", newUrl);
  }, []);

  const toastView = useMemo(() => {
    const message = normalizeText(toast?.message);

    if (!message) {
      return {
        message: "",
        key: "",
        kind: "info" as ToastViewKind,
        title: "",
        icon: "",
      };
    }

    const kind = resolveToastKind(message, toast?.kind);
    const key = `${normalizeText(toast?.kind || "info")}:${message}`;

    return {
      message,
      key,
      kind,
      title: getToastTitle(kind),
      icon: getToastIcon(kind),
    };
  }, [toast?.kind, toast?.message]);

 useEffect(() => {
  if (toastView.key || !dismissedToastKey) return;

  const timer = window.setTimeout(() => {
    setDismissedToastKey("");
  }, 0);

  return () => {
    window.clearTimeout(timer);
  };
}, [toastView.key, dismissedToastKey]);

  const showToast = Boolean(
    toastView.message && dismissedToastKey !== toastView.key,
  );

  const isEmpty = !loading && items.length === 0;

  const handleContinueShopping = useCallback(() => {
    push("home");
  }, [push]);

  const handleReloadSilent = useCallback(() => {
    reload({ silent: true });
  }, [reload]);

  const handleCheckout = useCallback(() => {
    window.location.href = "/checkout";
  }, []);

  const handleDismissToast = useCallback(() => {
    setDismissedToastKey(toastView.key);
  }, [toastView.key]);

  return (
    <div dir="rtl" className="mk-dcart">
      <div className="mk-dcart-hero">
        <div className="mk-dcart-hero__row">
          <button
            type="button"
            onClick={pop}
            aria-label="رجوع"
            className="mk-dcart-hero__back"
          >
            →
          </button>

          <div className="mk-dcart-hero__content">
            <div className="mk-dcart-hero__titleRow">
              <div className="mk-dcart-hero__title">حقيبة التسوق</div>

              {totalQty > 0 ? (
                <div className="mk-dcart-hero__badge">{totalQty}</div>
              ) : null}
            </div>

            <div className="mk-dcart-hero__desc">
              {loading
                ? "نجهز محتويات السلة..."
                : totalQty > 0
                  ? `${totalQty} قطعة داخل الحقيبة — راجع طلبك قبل الدفع`
                  : "سلتك فارغة — ابدأ بإضافة منتجاتك المفضلة"}
            </div>
          </div>

          <button
            type="button"
            onClick={handleContinueShopping}
            className="mk-dcart-hero__continue"
            title="متابعة التسوق"
          >
            متابعة التسوق
          </button>
        </div>
      </div>

      {showToast ? (
        <div className="mk-dcart-popToastDock">
          <div
            key={toastView.key}
            role={toastView.kind === "error" ? "alert" : "status"}
            aria-live={toastView.kind === "error" ? "assertive" : "polite"}
            className={[
              "mk-dcart-popToast",
              `mk-dcart-popToast--${toastView.kind}`,
            ].join(" ")}
          >
            <div className="mk-dcart-popToast__icon" aria-hidden="true">
              <span>{toastView.icon}</span>
            </div>

            <div className="mk-dcart-popToast__content">
              <div className="mk-dcart-popToast__title">
                {toastView.title}
              </div>

              <div className="mk-dcart-popToast__message">
                {toastView.message}
              </div>
            </div>

            <button
              type="button"
              className="mk-dcart-popToast__close"
              onClick={handleDismissToast}
              aria-label="إغلاق التنبيه"
            >
              ×
            </button>

            <div className="mk-dcart-popToast__bar" aria-hidden="true">
              <span />
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={`mk-dcart-layout ${isEmpty ? "mk-dcart-layout--empty" : ""}`}
      >
   <CartItemsList
  items={items}
  summary={summary}
  loading={loading}
  busy={busy}
  onInc={inc}
  onRemove={remove}
  onReload={handleReloadSilent}
  flash={flash}
/>

        {!isEmpty ? (
          <div className="mk-dcart-summarySticky">
            <CartSummary
              summary={summary}
              itemsCount={items.length}
              totalQty={totalQty}
              coupon={coupon}
              loading={loading}
              busy={busy}
              onApplyCoupon={applyCoupon}
              onRemoveCoupon={removeCoupon}
              onCheckout={handleCheckout}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}