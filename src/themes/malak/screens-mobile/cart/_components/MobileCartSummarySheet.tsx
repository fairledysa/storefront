// FILE: apps/storefront/src/themes/malak/screens-mobile/cart/_components/MobileCartSummarySheet.tsx
"use client";

import { memo, useCallback, useMemo, useState, type KeyboardEvent } from "react";
import CircleArrowDown01 from "@/components/icon/huge/CircleArrowDown01";
import CircleArrowUp01 from "@/components/icon/huge/CircleArrowUp01";
import type {
  CartCoupon,
  CartSummaryMoney,
} from "../../../screens/cart/_components/types";

type Props = {
  onCheckout: () => void;
  summary: CartSummaryMoney | null;
  itemsCount: number;
  totalQty: number;
  coupon: CartCoupon;
  loading: boolean;
  busy: boolean;
  isRepricing?: boolean;
  onApplyCoupon: (code: string) => void;
  onRemoveCoupon: () => void;
};

function clampDecimals(value: any) {
  const n = Number(value ?? 2);
  if (!Number.isFinite(n)) return 2;
  return Math.max(0, Math.min(4, Math.floor(n)));
}

function readNumber(value: any) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function readFiniteNumber(...values: any[]) {
  for (const value of values) {
    const n = readNumber(value);
    if (n != null) return n;
  }

  return null;
}

function readPositiveNumber(...values: any[]) {
  for (const value of values) {
    const n = readNumber(value);
    if (n != null && n > 0) return n;
  }

  return null;
}

function readBool(value: any, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const text = value.trim().toLowerCase();

    if (["true", "1", "yes", "on", "enabled", "active"].includes(text)) {
      return true;
    }

    if (["false", "0", "no", "off", "disabled", "inactive"].includes(text)) {
      return false;
    }
  }

  return fallback;
}

function readBoolMaybe(value: any) {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const text = value.trim().toLowerCase();

    if (["true", "1", "yes", "on", "enabled", "active"].includes(text)) {
      return true;
    }

    if (["false", "0", "no", "off", "disabled", "inactive"].includes(text)) {
      return false;
    }
  }

  return null;
}

function readText(...values: any[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }

  return "";
}

function hasMoney(value: unknown) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) && Math.abs(amount) > 0.009;
}

function fmt(amount: number, currencySymbol: string, decimalDigits: number) {
  const n = Number(amount ?? 0);
  const val = Number.isFinite(n) ? n : 0;
  const symbol = String(currencySymbol || "").trim();

  const formatted = new Intl.NumberFormat("ar-SA-u-nu-latn", {
    minimumFractionDigits: decimalDigits,
    maximumFractionDigits: decimalDigits,
  }).format(val);

  return symbol ? `${formatted} ${symbol}` : formatted;
}

function fmtCompact(
  amount: number,
  currencySymbol: string,
  decimalDigits: number,
) {
  const n = Number(amount ?? 0);
  const val = Number.isFinite(n) ? n : 0;
  const symbol = String(currencySymbol || "").trim();

  const maximumFractionDigits = Math.max(
    0,
    Math.min(2, Math.floor(Number(decimalDigits ?? 2))),
  );

  const formatted = new Intl.NumberFormat("ar-SA-u-nu-latn", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(val);

  return symbol ? `${formatted} ${symbol}` : formatted;
}

function MobileCartSummarySheet({
  onCheckout,
  summary,
  itemsCount,
  totalQty,
  coupon,
  loading,
  busy,
  isRepricing = false,
  onApplyCoupon,
  onRemoveCoupon,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [code, setCode] = useState("");

  const summaryAny: any = summary ?? null;
  const isLoading = loading || !summary;

  const currency = String(summaryAny?.currency ?? "").trim();
  const currencySymbol = String(
    summaryAny?.currency_symbol ?? summaryAny?.currencySymbol ?? currency,
  ).trim();

  const currencyDecimals = clampDecimals(
    summaryAny?.currency_decimals ?? summaryAny?.currencyDecimals,
  );

  const totals = useMemo(() => {
    if (isLoading) {
      return {
        subtotal: 0,
        discount: 0,
        tax: 0,
        shipping: 0,
        total: 0,
      };
    }

    const subtotal = Number(summary?.subtotal ?? 0);
    const discount = Number(summary?.discount ?? 0);
    const tax = Number(summary?.tax ?? 0);
    const shipping = Number(summary?.shipping ?? 0);
    const total = Number(summary?.total ?? 0);

    return {
      subtotal: Number.isFinite(subtotal) ? subtotal : 0,
      discount: Number.isFinite(discount) ? discount : 0,
      tax: Number.isFinite(tax) ? tax : 0,
      shipping: Number.isFinite(shipping) ? shipping : 0,
      total: Number.isFinite(total) ? total : 0,
    };
  }, [
    isLoading,
    summary?.subtotal,
    summary?.discount,
    summary?.tax,
    summary?.shipping,
    summary?.total,
  ]);

  const hasTax = !isLoading && totals.tax > 0;

  const couponDiscount = Math.max(
    0,
    readFiniteNumber(
      summaryAny?.coupon_discount,
      summaryAny?.couponDiscount,
      coupon?.discount_amount,
    ) ?? 0,
  );

  const specialOffersDiscount = Math.max(
    0,
    readFiniteNumber(
      summaryAny?.special_offers_discount,
      summaryAny?.specialOffersDiscount,
      summaryAny?.special_offer_discount,
      summaryAny?.specialOfferDiscount,
    ) ?? 0,
  );

  const cartOffersSource =
    summaryAny?.cartOffers && typeof summaryAny.cartOffers === "object"
      ? summaryAny.cartOffers
      : summaryAny?.cart_offers && typeof summaryAny.cart_offers === "object"
        ? summaryAny.cart_offers
        : {};

  const cartOffersDiscount = Math.max(
    0,
    readFiniteNumber(
      summaryAny?.cart_offers_discount,
      summaryAny?.cartOffersDiscount,
      cartOffersSource?.discount,
    ) ?? 0,
  );

  const cartOfferMessages = useMemo(() => {
    const messages = Array.isArray(cartOffersSource?.messages)
      ? cartOffersSource.messages
      : [];

    const applied = Array.isArray(cartOffersSource?.appliedOffers)
      ? cartOffersSource.appliedOffers
      : Array.isArray(cartOffersSource?.applied_offers)
        ? cartOffersSource.applied_offers
        : [];

    return Array.from(
      new Set([
        ...messages.map(readText).filter(Boolean),
        ...applied
          .map((offer: any) => readText(offer?.message, offer?.title))
          .filter(Boolean),
      ]),
    );
  }, [cartOffersSource]);

  const unclassifiedDiscount = Math.max(
    0,
    totals.discount -
      couponDiscount -
      specialOffersDiscount -
      cartOffersDiscount,
  );

  const canCheckout = useMemo(
    () => !isLoading && !busy && itemsCount > 0,
    [busy, isLoading, itemsCount],
  );

  const freeShippingMeta = useMemo(() => {
    if (isLoading) {
      return {
        available: false,
        applied: false,
        ruleName: "",
        threshold: null as number | null,
        remaining: null as number | null,
        discount: 0,
      };
    }

    const sourceAny = summaryAny;

    const shippingDiscount = Math.max(
      0,
      readFiniteNumber(
        sourceAny?.shipping_discount,
        sourceAny?.shippingDiscount,
        sourceAny?.free_shipping_discount,
        sourceAny?.freeShippingDiscount,
      ) ?? 0,
    );

    const ruleName = readText(
      sourceAny?.free_shipping_rule_name,
      sourceAny?.freeShippingRuleName,
      sourceAny?.free_shipping_name,
      sourceAny?.freeShippingName,
    );

    const explicitApplied = readBool(
      sourceAny?.free_shipping ??
        sourceAny?.freeShipping ??
        sourceAny?.free_shipping_applied ??
        sourceAny?.freeShippingApplied,
      false,
    );

    const explicitAvailable = readBoolMaybe(
      sourceAny?.free_shipping_available ??
        sourceAny?.freeShippingAvailable ??
        sourceAny?.has_free_shipping_rule ??
        sourceAny?.hasFreeShippingRule,
    );

    const applied = Boolean(explicitApplied || shippingDiscount > 0);

    let threshold = readPositiveNumber(
      sourceAny?.free_shipping_threshold,
      sourceAny?.freeShippingThreshold,
      sourceAny?.free_shipping_minimum,
      sourceAny?.freeShippingMinimum,
      sourceAny?.free_shipping_minimum_subtotal,
      sourceAny?.freeShippingMinimumSubtotal,
      sourceAny?.free_shipping_rule_minimum,
      sourceAny?.freeShippingRuleMinimum,
      sourceAny?.free_shipping_rule_minimum_subtotal,
      sourceAny?.freeShippingRuleMinimumSubtotal,
      sourceAny?.minimum_free_shipping_amount,
      sourceAny?.minimumFreeShippingAmount,
      sourceAny?.free_shipping_target,
      sourceAny?.freeShippingTarget,
      sourceAny?.minimumSubtotal,
      sourceAny?.minimum_subtotal,
    );

    const explicitRemaining = readFiniteNumber(
      sourceAny?.free_shipping_remaining,
      sourceAny?.freeShippingRemaining,
      sourceAny?.free_shipping_remaining_amount,
      sourceAny?.freeShippingRemainingAmount,
      sourceAny?.remaining_for_free_shipping,
      sourceAny?.remainingForFreeShipping,
    );

    if (!threshold && explicitRemaining != null && explicitRemaining > 0) {
      threshold = Math.max(0, totals.subtotal) + explicitRemaining;
    }

    if (!threshold && applied) {
      threshold = Math.max(1, totals.subtotal);
    }

    const available =
      explicitAvailable === true ||
      Boolean(threshold && threshold > 0) ||
      applied;

    return {
      available,
      applied,
      ruleName,
      threshold,
      remaining: explicitRemaining,
      discount: shippingDiscount,
    };
  }, [isLoading, summaryAny, totals.subtotal]);

  const shippingProgress = useMemo(() => {
    if (isLoading) {
      return {
        available: true,
        remaining: 0,
        percent: 30,
        reached: false,
        applied: false,
      };
    }

    const subtotal = Math.max(0, totals.subtotal);
    const threshold = freeShippingMeta.threshold;

    if (!freeShippingMeta.available || !threshold || threshold <= 0) {
      return {
        available: false,
        remaining: 0,
        percent: 0,
        reached: false,
        applied: false,
      };
    }

    const remaining = freeShippingMeta.applied
      ? 0
      : Math.max(0, freeShippingMeta.remaining ?? threshold - subtotal);

    const reached =
      freeShippingMeta.applied || remaining <= 0 || subtotal >= threshold;

    const percentRaw = threshold > 0 ? (subtotal / threshold) * 100 : 0;
    const percent = reached
      ? 100
      : Math.max(0, Math.min(100, Math.round(percentRaw)));

    return {
      available: true,
      remaining,
      percent,
      reached,
      applied: freeShippingMeta.applied,
    };
  }, [isLoading, totals.subtotal, freeShippingMeta]);

  const formatted = useMemo(
    () => ({
      subtotal: fmt(totals.subtotal, currencySymbol, currencyDecimals),
      tax: fmt(totals.tax, currencySymbol, currencyDecimals),
      discount:
        totals.discount > 0
          ? `- ${fmt(totals.discount, currencySymbol, currencyDecimals)}`
          : fmt(0, currencySymbol, currencyDecimals),
      couponDiscount: `- ${fmt(couponDiscount, currencySymbol, currencyDecimals)}`,
      specialOffersDiscount: `- ${fmt(
        specialOffersDiscount,
        currencySymbol,
        currencyDecimals,
      )}`,
      cartOffersDiscount: `- ${fmt(
        cartOffersDiscount,
        currencySymbol,
        currencyDecimals,
      )}`,
      unclassifiedDiscount: `- ${fmt(
        unclassifiedDiscount,
        currencySymbol,
        currencyDecimals,
      )}`,
      shipping: fmt(totals.shipping, currencySymbol, currencyDecimals),
      total: fmt(totals.total, currencySymbol, currencyDecimals),
      remaining: fmtCompact(
        shippingProgress.remaining,
        currencySymbol,
        currencyDecimals,
      ),
    }),
    [
      currencySymbol,
      currencyDecimals,
      totals.subtotal,
      totals.tax,
      totals.discount,
      couponDiscount,
      specialOffersDiscount,
      cartOffersDiscount,
      unclassifiedDiscount,
      totals.shipping,
      totals.total,
      shippingProgress.remaining,
    ],
  );

  const handleApplyCoupon = useCallback(() => {
    const clean = code.trim();
    if (!clean || busy || isLoading) return;

    onApplyCoupon(clean);
    setCode("");
  }, [busy, code, isLoading, onApplyCoupon]);

  const handleCouponKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") return;
      handleApplyCoupon();
    },
    [handleApplyCoupon],
  );

  return (
    <>
      {expanded ? (
        <button
          type="button"
          className="mk-mcart-sheetBackdrop"
          onClick={() => setExpanded(false)}
          aria-label="إغلاق تفاصيل الطلب"
        />
      ) : null}

      <aside
        className={[
          "mk-mcart-sheet",
          expanded ? "is-expanded" : "",
          isLoading ? "is-loading" : "",
          isRepricing ? "is-repricing" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-busy={isLoading ? "true" : "false"}
      >
        <button
          type="button"
          className="mk-mcart-sheet__peek"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          <span className="mk-mcart-sheet__handle" />

          <span className="mk-mcart-sheet__peekText">
            {expanded ? "إخفاء تفاصيل الطلب" : "عرض تفاصيل الطلب"}
          </span>

          <span className="mk-mcart-sheet__peekIcon" aria-hidden="true">
            {expanded ? <CircleArrowDown01 /> : <CircleArrowUp01 />}
          </span>
        </button>

        <div className="mk-mcart-sheet__hero">
          <div className="mk-mcart-sheet__heroMeta">
            <span>{totalQty ? `${totalQty} قطعة` : "الإجمالي"}</span>
            <strong>{isLoading ? "—" : formatted.total}</strong>
          </div>

          <button
            type="button"
            onClick={onCheckout}
            disabled={!canCheckout}
            className="mk-mcart-checkout"
          >
            <span>
              {busy
                ? "جاري التحديث..."
                : isLoading
                  ? "انتظر قليلًا"
                  : "إتمام الطلب"}
            </span>
          </button>
        </div>

        {expanded ? (
          <div className="mk-mcart-sheet__body">
            {isLoading || shippingProgress.available ? (
              <div
                className={[
                  "mk-mcart-free",
                  !isLoading && shippingProgress.reached ? "is-reached" : "",
                  isLoading ? "is-loading" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="mk-mcart-free__top">
                  <span>%{shippingProgress.percent}</span>

                  <strong>
                    {isLoading
                      ? "جاري تجهيز بيانات الشحن..."
                      : shippingProgress.applied
                        ? `مبروك، الشحن مجاني${
                            freeShippingMeta.ruleName
                              ? ` — ${freeShippingMeta.ruleName}`
                              : ""
                          }`
                        : shippingProgress.reached
                          ? "وصلت لشرط الشحن المجاني"
                          : `يتبقى ${formatted.remaining} للشحن المجاني`}
                  </strong>
                </div>

                <div className="mk-mcart-free__bar">
                  <span style={{ width: `${shippingProgress.percent}%` }} />
                </div>
              </div>
            ) : null}

            <div className="mk-mcart-totalBox">
              <Row
                label={hasTax ? "مجموع المنتجات بدون ضريبة" : "مجموع المنتجات"}
                value={formatted.subtotal}
                loading={isLoading}
              />

              {hasTax ? (
                <Row
                  label="ضريبة القيمة المضافة"
                  value={formatted.tax}
                  loading={isLoading}
                />
              ) : null}

              {isRepricing ? (
                <div className="mk-mcart-repriceHint">يعاد احتساب العروض...</div>
              ) : null}

              {hasMoney(couponDiscount) ? (
                <Row
                  label="كوبون الخصم"
                  value={formatted.couponDiscount}
                  loading={isLoading}
                  negative
                />
              ) : null}

              {hasMoney(specialOffersDiscount) ? (
                <Row
                  label="العروض الخاصة"
                  value={formatted.specialOffersDiscount}
                  loading={isLoading || isRepricing}
                  negative
                />
              ) : null}

              {hasMoney(cartOffersDiscount) ? (
                <>
                  <Row
                    label="عروض السلة"
                    value={formatted.cartOffersDiscount}
                    loading={isLoading || isRepricing}
                    negative
                  />

                  {cartOfferMessages.length > 0 ? (
                    <div className="mk-mcart-free__top">
                      <strong>{cartOfferMessages.slice(0, 2).join(" · ")}</strong>
                    </div>
                  ) : null}
                </>
              ) : null}

              {hasMoney(unclassifiedDiscount) ? (
                <Row
                  label="الخصم"
                  value={formatted.unclassifiedDiscount}
                  loading={isLoading || isRepricing}
                  negative
                />
              ) : null}

              <Row
                label="الشحن"
                value={formatted.shipping}
                loading={isLoading}
              />

              <div className="mk-mcart-totalBox__divider" />

              <Row
                label="الإجمالي"
                value={formatted.total}
                strong
                loading={isLoading || isRepricing}
              />
            </div>

            <div className="mk-mcart-coupon">
              <div className="mk-mcart-coupon__title">كوبون الخصم</div>

              {coupon?.code && !isLoading ? (
                <div className="mk-mcart-coupon__applied">
                  <div>
                    مطبق: <strong>{coupon.code}</strong>
                  </div>

                  <button
                    type="button"
                    onClick={onRemoveCoupon}
                    disabled={busy || isLoading}
                  >
                    إزالة
                  </button>
                </div>
              ) : (
                <div className="mk-mcart-coupon__form">
                  <input
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    onKeyDown={handleCouponKeyDown}
                    placeholder="أدخل كود الخصم"
                    disabled={busy || isLoading}
                  />

                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={busy || isLoading || !code.trim()}
                  >
                    تطبيق
                  </button>
                </div>
              )}
            </div>

            <div className="mk-mcart-sheet__note">
              {hasTax
                ? "الأسعار شاملة للضريبة حسب إعدادات المتجر."
                : "سيتم تأكيد الشحن والدفع في الخطوة التالية."}
            </div>
          </div>
        ) : null}
      </aside>
    </>
  );
}

const Row = memo(function Row({
  label,
  value,
  strong = false,
  negative = false,
  loading = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  negative?: boolean;
  loading?: boolean;
}) {
  return (
    <div
      className={[
        "mk-mcart-row",
        strong ? "mk-mcart-row--strong" : "",
        negative ? "mk-mcart-row--negative" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span>{label}</span>
      <strong>{loading ? <em /> : value}</strong>
    </div>
  );
});

export default memo(MobileCartSummarySheet);
