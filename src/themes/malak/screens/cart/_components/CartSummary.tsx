// FILE: apps/storefront/src/themes/malak/screens/cart/_components/CartSummary.tsx
"use client";

import {
  memo,
  useCallback,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";
import type { CartCoupon, CartSummaryMoney } from "./types";

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

const COMPACT_FORMATTER = new Intl.NumberFormat("ar-SA-u-nu-latn", {
  maximumFractionDigits: 2,
});

function clampDecimals(value: any) {
  const n = Number(value ?? 2);
  if (!Number.isFinite(n)) return 2;

  return Math.max(0, Math.min(4, Math.floor(n)));
}

function readNumber(value: any) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function readPositiveNumber(...values: any[]) {
  for (const value of values) {
    const n = readNumber(value);

    if (n != null && n > 0) return n;
  }

  return null;
}

function readFiniteNumber(...values: any[]) {
  for (const value of values) {
    const n = readNumber(value);

    if (n != null) return n;
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

  return symbol
    ? `${val.toFixed(decimalDigits)} ${symbol}`
    : val.toFixed(decimalDigits);
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
    minimumFractionDigits: maximumFractionDigits > 0 ? 0 : 0,
  }).format(val);

  return symbol ? `${formatted} ${symbol}` : formatted;
}

function CartSummary({
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
  const [code, setCode] = useState("");

  const summaryAny = summary as any;
  const isLoading = loading || !summary;

  const currency = String(summaryAny?.currency ?? "").trim();
  const currencySymbol = String(
    summaryAny?.currency_symbol ?? summaryAny?.currencySymbol ?? currency,
  ).trim();

  const currencyDecimals = clampDecimals(
    summaryAny?.currency_decimals ?? summaryAny?.currencyDecimals,
  );

  const canCheckout = useMemo(
    () => !isLoading && !busy && itemsCount > 0,
    [isLoading, busy, itemsCount],
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

  const freeShippingMeta = useMemo(() => {
    if (isLoading) {
      return {
        available: false,
        applied: false,
        source: "",
        ruleName: "",
        threshold: null as number | null,
        remaining: null as number | null,
        discount: 0,
      };
    }

    /*
      مهم:
      صفحة السلة تعتمد فقط على /api/cart.
      لا نقرأ /api/checkout/prepare هنا لأنه قد يحسب حسب العنوان/الشحن
      ويخرب عرض شريط الشحن المجاني في السلة عند تغيير العملة.
    */
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

    const source = readText(
      sourceAny?.free_shipping_source,
      sourceAny?.freeShippingSource,
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
      source,
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
        threshold: 0,
        percent: 36,
        reached: false,
        applied: false,
        fillStyle: { width: "36%" },
        truckStyle: { left: "34%" },
      };
    }

    const subtotal = Math.max(0, totals.subtotal);
    const threshold = freeShippingMeta.threshold;

    if (!freeShippingMeta.available || !threshold || threshold <= 0) {
      return {
        available: false,
        remaining: 0,
        threshold: 0,
        percent: 0,
        reached: false,
        applied: false,
        fillStyle: { width: "0%" },
        truckStyle: { left: "0%" },
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
      threshold,
      percent,
      reached,
      applied: freeShippingMeta.applied,
      fillStyle: { width: `${percent}%` },
      truckStyle: { left: `calc(${percent}% - 10px)` },
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
    const c = code.trim();
    if (!c || busy || isLoading) return;

    onApplyCoupon(c);
    setCode("");
  }, [busy, code, isLoading, onApplyCoupon]);

  const handleCouponKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      handleApplyCoupon();
    },
    [handleApplyCoupon],
  );

  return (
    <div
      className={[
        "mk-dcart-summary",
        isLoading ? "is-loading" : "",
        isRepricing ? "is-repricing" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-busy={isLoading ? "true" : "false"}
    >
      <div className="mk-dcart-summary__head">
        <div>
          <div className="mk-dcart-summary__title">ملخص الطلب</div>

          <div className="mk-dcart-summary__sub">
            {isLoading
              ? "جاري تحميل ملخص الطلب..."
              : totalQty
                ? `${totalQty} قطعة داخل الحقيبة`
                : "لا توجد منتجات"}
          </div>
        </div>

        {busy ? (
          <div className="mk-dcart-summary__busy">جاري التحديث...</div>
        ) : null}
      </div>

      {isLoading || shippingProgress.available ? (
        <div
          className={[
            "mk-dcart-free",
            !isLoading && shippingProgress.reached ? "is-reached" : "",
            isLoading ? "mk-dcart-free--loading" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="mk-dcart-free__head">
            <div className="mk-dcart-free__percent">
              {isLoading ? (
                <span className="mk-dcart-loadingPill" />
              ) : (
                `%${shippingProgress.percent}`
              )}
            </div>

            <div className="mk-dcart-free__text">
              {isLoading ? (
                <span className="mk-dcart-loadingText">
                  جاري تجهيز بيانات الشحن...
                </span>
              ) : shippingProgress.applied ? (
                <>
                  مبروك 🎉 الشحن مجاني
                  {freeShippingMeta.ruleName ? (
                    <span> — {freeShippingMeta.ruleName}</span>
                  ) : null}
                </>
              ) : shippingProgress.reached ? (
                <>مبروك 🎉 وصلت لشرط الشحن المجاني</>
              ) : (
                <>
                  يتبقى <span>{formatted.remaining}</span> للشحن المجاني
                </>
              )}
            </div>
          </div>

          <div className="mk-dcart-free__bar">
            <div
              className="mk-dcart-free__fill"
              style={shippingProgress.fillStyle}
            />

            {!isLoading ? (
              <div
                className="mk-dcart-free__truck"
                style={shippingProgress.truckStyle}
              >
                🚚
              </div>
            ) : null}
          </div>

          <div className="mk-dcart-free__hint">
            {isLoading
              ? "سيظهر المبلغ والعملة بعد اكتمال تحميل السلة."
              : shippingProgress.applied
                ? "سيتم تطبيق الشحن المجاني حسب إعدادات المتجر."
                : shippingProgress.reached
                  ? "سيتم التحقق من العنوان وشركة الشحن في خطوة الدفع."
                  : "أضف منتجات أكثر للوصول إلى الشحن المجاني 🚚"}
          </div>
        </div>
      ) : null}

      <div className="mk-dcart-box">
        <Row
          label={hasTax ? "مجموع المنتجات (بدون ضريبة)" : "مجموع المنتجات"}
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
          <div className="mk-dcart-repriceHint">يعاد احتساب العروض...</div>
        ) : null}

        {hasMoney(couponDiscount) ? (
          <Row
            label="كوبون الخصم"
            value={formatted.couponDiscount}
            loading={isLoading}
            valueColor="#b91c1c"
          />
        ) : null}

        {hasMoney(specialOffersDiscount) ? (
          <Row
            label="العروض الخاصة"
            value={formatted.specialOffersDiscount}
            loading={isLoading || isRepricing}
            valueColor="#b91c1c"
          />
        ) : null}

        {hasMoney(cartOffersDiscount) ? (
          <>
            <Row
              label="عروض السلة"
              value={formatted.cartOffersDiscount}
              loading={isLoading || isRepricing}
              valueColor="#b91c1c"
            />

            {cartOfferMessages.length > 0 ? (
              <div className="mk-dcart-free__hint">
                {cartOfferMessages.slice(0, 2).join(" · ")}
              </div>
            ) : null}
          </>
        ) : null}

        {hasMoney(unclassifiedDiscount) ? (
          <Row
            label="الخصم"
            value={formatted.unclassifiedDiscount}
            loading={isLoading || isRepricing}
            valueColor="#b91c1c"
          />
        ) : null}

        <Row label="الشحن" value={formatted.shipping} loading={isLoading} />

        <div className="mk-dcart-divider" />

        <Row
          label="الإجمالي"
          value={formatted.total}
          strong
          loading={isLoading || isRepricing}
        />
      </div>

      <div className="mk-dcart-box mk-dcart-box--coupon">
        <div className="mk-dcart-coupon__title">لديك كوبون خصم؟</div>

        {coupon?.code && !isLoading ? (
          <div className="mk-dcart-coupon__applied">
            <div className="mk-dcart-coupon__appliedText">
              الكوبون المطبق:{" "}
              <span className="mk-dcart-coupon__code">{coupon.code}</span>
            </div>

            <button
              type="button"
              onClick={onRemoveCoupon}
              disabled={busy || isLoading}
              className="mk-dcart-coupon__remove"
            >
              إزالة
            </button>
          </div>
        ) : (
          <div className="mk-dcart-coupon__form">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleCouponKeyDown}
              placeholder="أدخل كود الخصم"
              disabled={busy || isLoading}
              className="mk-dcart-coupon__input"
            />

            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={busy || isLoading || !code.trim()}
              className="mk-dcart-coupon__submit"
            >
              تطبيق
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onCheckout}
        disabled={!canCheckout}
        className="mk-dcart-checkout"
      >
        {busy ? "جاري التحديث..." : isLoading ? "انتظر قليلًا" : "متابعة الدفع"}
      </button>

      <div className="mk-dcart-summary__foot">
        {hasTax
          ? "* الأسعار شاملة للضريبة"
          : "سيتم تأكيد الشحن والدفع في الخطوة التالية."}
      </div>
    </div>
  );
}

const Row = memo(function Row({
  label,
  value,
  strong = false,
  valueColor,
  loading = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  valueColor?: string;
  loading?: boolean;
}) {
  return (
    <div className={`mk-dcart-row ${strong ? "mk-dcart-row--strong" : ""}`}>
      <div className="mk-dcart-row__label">{label}</div>

      <div
        className="mk-dcart-row__value"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {loading ? <span className="mk-dcart-row__skeleton" /> : value}
      </div>
    </div>
  );
});

export default memo(CartSummary);
