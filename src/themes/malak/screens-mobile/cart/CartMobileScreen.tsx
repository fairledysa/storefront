// FILE: apps/storefront/src/themes/malak/screens-mobile/cart/CartMobileScreen.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavStack } from "../../app-navigation/stack";
import { useMobileCart } from "./useMobileCart";
import MobileCartHeader from "./_components/MobileCartHeader";
import MobileCartItemsList from "./_components/MobileCartItemsList";
import MobileCartSummarySheet from "./_components/MobileCartSummarySheet";
import CartOfferProgressBar from "../../components/cart-offers/CartOfferProgressBar";

type ToastViewKind = "success" | "error" | "info";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function resolveToastKind(message: string, kind: unknown): ToastViewKind {
  if (kind === "error") return "error";

  const text = message.trim();

  if (
    text.includes("تم") ||
    text.includes("نجاح") ||
    text.includes("حفظ") ||
    text.includes("تحديث") ||
    text.includes("مبروك") ||
    text.includes("حصلت")
  ) {
    return "success";
  }

  return "info";
}

function getToastTitle(kind: ToastViewKind) {
  if (kind === "error") return "تنبيه";
  if (kind === "success") return "تم";
  return "معلومة";
}

function getToastIcon(kind: ToastViewKind) {
  if (kind === "error") return "!";
  if (kind === "success") return "✓";
  return "i";
}

function cleanCartUrlParams(paramsToRemove: string[]) {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);

  for (const param of paramsToRemove) {
    params.delete(param);
  }

  const nextUrl =
    window.location.pathname +
    (params.toString() ? `?${params.toString()}` : "") +
    window.location.hash;

  window.history.replaceState({}, "", nextUrl);
}

function resolveAbandonedReminderJobId() {
  if (typeof window === "undefined") return "";

  const params = new URLSearchParams(window.location.search);

  return cleanText(
    params.get("acj") ||
      params.get("abandoned_job") ||
      params.get("abandoned_job_id") ||
      params.get("abandonedCartJob") ||
      params.get("abandoned_cart_job"),
  );
}

async function trackAbandonedCartVisit(jobId: string) {
  const cleanJobId = cleanText(jobId);

  if (!cleanJobId) return;

  await fetch("/api/cart/abandoned-visit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jobId: cleanJobId,
    }),
    keepalive: true,
  }).catch(() => null);
}

function pickCartOfferProgress(source: any) {
  return (
    source?.cartOfferProgress ||
    source?.cart_offer_progress ||
    source?.cartOffers?.progress ||
    source?.cart_offers?.progress ||
    source?.summary?.cartOfferProgress ||
    source?.summary?.cart_offer_progress ||
    source?.summary?.cartOffers?.progress ||
    source?.summary?.cart_offers?.progress ||
    null
  );
}

export default function CartMobileScreen() {
  const pop = useNavStack((s) => s.pop);
  const push = useNavStack((s) => s.push);

  const autoCouponAttemptedRef = useRef(false);
  const abandonedVisitAttemptedRef = useRef(false);

  const {
    loading,
    busy,
    isRepricing,
    error,
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
  } = useMobileCart();

  const [dismissedToastKey, setDismissedToastKey] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const shouldOpenAuth = params.get("auth") === "1";

    if (!shouldOpenAuth) return;

    window.dispatchEvent(new CustomEvent("auth:open"));
    params.delete("auth");

    const nextUrl =
      window.location.pathname +
      (params.toString() ? `?${params.toString()}` : "") +
      window.location.hash;

    window.history.replaceState({}, "", nextUrl);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (abandonedVisitAttemptedRef.current) return;

    const jobId = resolveAbandonedReminderJobId();

    if (!jobId) return;

    abandonedVisitAttemptedRef.current = true;

    const storageKey = `mk:abandoned-cart-visit:${jobId}`;

    try {
      if (window.localStorage.getItem(storageKey)) {
        cleanCartUrlParams([
          "acj",
          "abandoned_job",
          "abandoned_job_id",
          "abandonedCartJob",
          "abandoned_cart_job",
        ]);
        return;
      }

      window.localStorage.setItem(storageKey, new Date().toISOString());
    } catch {
      // تجاهل منع localStorage
    }

    cleanCartUrlParams([
      "acj",
      "abandoned_job",
      "abandoned_job_id",
      "abandonedCartJob",
      "abandoned_cart_job",
    ]);

    void trackAbandonedCartVisit(jobId);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (autoCouponAttemptedRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const code = cleanText(
      params.get("coupon") ||
        params.get("coupon_code") ||
        params.get("discount_code"),
    );

    if (!code) return;

    autoCouponAttemptedRef.current = true;

    cleanCartUrlParams(["coupon", "coupon_code", "discount_code"]);

    void applyCoupon(code);
  }, [applyCoupon]);

  const toastView = useMemo(() => {
    const message = cleanText(toast?.message);

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
    const key = `${cleanText(toast?.kind || "info")}:${message}`;

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

    return () => window.clearTimeout(timer);
  }, [toastView.key, dismissedToastKey]);

  const showToast = Boolean(
    toastView.message && dismissedToastKey !== toastView.key,
  );

  const isEmpty = !loading && items.length === 0;
  const summaryAny = summary as any;
  const cartOfferProgress = pickCartOfferProgress(summaryAny);
  const currency = cleanText(summaryAny?.currency);
  const currencySymbol = cleanText(
    summaryAny?.currency_symbol ?? summaryAny?.currencySymbol ?? currency,
  );
  const currencyDecimals = Number(
    summaryAny?.currency_decimals ?? summaryAny?.currencyDecimals ?? 2,
  );

  const handleBack = useCallback(() => {
    pop();
  }, [pop]);

  const handleContinueShopping = useCallback(() => {
    push("home");
  }, [push]);

  const handleReloadSilent = useCallback(() => {
    reload({ silent: true });
  }, [reload]);

  const handleReload = useCallback(() => {
    reload();
  }, [reload]);

  const handleCheckout = useCallback(() => {
    window.location.href = "/checkout";
  }, []);

  const handleDismissToast = useCallback(() => {
    setDismissedToastKey(toastView.key);
  }, [toastView.key]);

  return (
    <div dir="rtl" className="mk-mcart">
      <MobileCartHeader
        loading={loading}
        totalQty={totalQty}
        isEmpty={isEmpty}
        onBack={handleBack}
        onContinueShopping={handleContinueShopping}
      />

      {showToast ? (
        <div className="mk-mcart-toastDock">
          <div
            role={toastView.kind === "error" ? "alert" : "status"}
            aria-live={toastView.kind === "error" ? "assertive" : "polite"}
            className={[
              "mk-mcart-toast",
              `mk-mcart-toast--${toastView.kind}`,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="mk-mcart-toast__icon" aria-hidden="true">
              {toastView.icon}
            </div>

            <div className="mk-mcart-toast__body">
              <div className="mk-mcart-toast__title">{toastView.title}</div>
              <div className="mk-mcart-toast__message">
                {toastView.message}
              </div>
            </div>

            <button
              type="button"
              className="mk-mcart-toast__close"
              onClick={handleDismissToast}
              aria-label="إغلاق التنبيه"
            >
              ×
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mk-mcart-error">
          <div>
            <strong>تعذر تحميل السلة</strong>
            <span>{error}</span>
          </div>

          <button type="button" onClick={handleReload}>
            إعادة المحاولة
          </button>
        </div>
      ) : null}

      <main
        className={[
          "mk-mcart-content",
          !isEmpty ? "mk-mcart-content--withSheet" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {!loading && cartOfferProgress ? (
          <div
            className={[
              "mk-mobile-cart-offer-progress",
              isRepricing ? "is-repricing" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <CartOfferProgressBar
              progress={cartOfferProgress}
              currencySymbol={currencySymbol}
              currencyDecimals={currencyDecimals}
              variant="mobile"
            />
            {isRepricing ? (
              <div className="mk-mcart-repriceHint">يعاد احتساب العروض...</div>
            ) : null}
          </div>
        ) : null}

        <MobileCartItemsList
          items={items}
          summary={summary}
          loading={loading}
          busy={busy}
          onInc={inc}
          onRemove={remove}
          onReload={handleReloadSilent}
          flash={flash}
          onContinueShopping={handleContinueShopping}
        />

        {!isEmpty ? (
          <MobileCartSummarySheet
            summary={summary}
            itemsCount={items.length}
            totalQty={totalQty}
            coupon={coupon}
            loading={loading}
            busy={busy}
            isRepricing={isRepricing}
            onApplyCoupon={applyCoupon}
            onRemoveCoupon={removeCoupon}
            onCheckout={handleCheckout}
          />
        ) : null}
      </main>
    </div>
  );
}
