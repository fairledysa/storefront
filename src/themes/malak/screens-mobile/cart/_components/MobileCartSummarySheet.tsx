// FILE: apps/storefront/src/themes/malak/screens-mobile/cart/_components/MobileCartSummarySheet.tsx
"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import type {
  CartCoupon,
  CartSummaryMoney,
} from "../../../screens/cart/_components/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onCheckout: () => void;
  summary: CartSummaryMoney | null;
  itemsCount: number;
  totalQty: number;
  coupon: CartCoupon;
  loading: boolean;
  busy: boolean;
  onApplyCoupon: (code: string) => void;
  onRemoveCoupon: () => void;
};

function fmt(amount: number, currency: string) {
  const n = Number(amount ?? 0);
  const val = Number.isFinite(n) ? n : 0;

  return `${new Intl.NumberFormat("ar-SA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val)} ${currency}`;
}

function fmtCompact(amount: number, currency: string) {
  const n = Number(amount ?? 0);
  const val = Number.isFinite(n) ? n : 0;

  return `${new Intl.NumberFormat("ar-SA", {
    maximumFractionDigits: 0,
  }).format(val)} ${currency}`;
}

function useBottomOffsetPx() {
  const [px, setPx] = useState(0);

  useEffect(() => {
    const findTabbarEl = () => {
      const byClass = document.querySelector(".mk-tabbar") as HTMLElement | null;
      if (byClass) return byClass;

      const byId = document.getElementById("dvxTabbar_70421");
      if (byId) return byId as HTMLElement;

      const any =
        (document.querySelector('[id^="dvxTabbar_"]') as HTMLElement | null) ??
        (document.querySelector('[data-dvx-tabbar="1"]') as HTMLElement | null);

      return any ?? null;
    };

    const measure = () => {
      const el = findTabbarEl();
      if (!el) {
        setPx(0);
        return;
      }

      const h = Math.max(0, Math.round(el.getBoundingClientRect().height || 0));
      setPx(h ? h + 8 : 0);
    };

    measure();

    const ro =
      typeof window !== "undefined" && "ResizeObserver" in window
        ? new ResizeObserver(() => measure())
        : null;

    const el = findTabbarEl();
    if (el && ro) ro.observe(el);

    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);

    const t = window.setInterval(measure, 800);

    return () => {
      window.clearInterval(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      if (el && ro) ro.unobserve(el);
      if (ro) ro.disconnect();
    };
  }, []);

  return px;
}

function SkeletonText({
  width,
  height = 14,
}: {
  width: number | string;
  height?: number;
}) {
  return (
    <div
      aria-hidden
      className="mk-cart-skeleton-line"
      style={{ width, height }}
    />
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
  valueColor,
  loading = false,
}: {
  label: string;
  value: string | null;
  strong?: boolean;
  valueColor?: string;
  loading?: boolean;
}) {
  return (
    <div
      className={[
        "mk-cart-summary-row",
        strong ? "mk-cart-summary-row--strong" : "",
      ].join(" ")}
    >
      <div className="mk-cart-summary-row__label">{label}</div>

      {loading || value == null ? (
        <SkeletonText width={76} />
      ) : (
        <div
          className="mk-cart-summary-row__value"
          style={valueColor ? { color: valueColor } : undefined}
        >
          {value}
        </div>
      )}
    </div>
  );
}

export default function MobileCartSummarySheet({
  open,
  onClose,
  onCheckout,
  summary,
  itemsCount,
  totalQty,
  coupon,
  loading,
  busy,
  onApplyCoupon,
  onRemoveCoupon,
}: Props) {
  const currency = summary?.currency || "SAR";
  const [code, setCode] = useState("");

  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  const bottomOffsetPx = useBottomOffsetPx();

  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(raf);
    }

    setVisible(false);

    const t = window.setTimeout(() => setMounted(false), 260);
    return () => window.clearTimeout(t);
  }, [open]);

  const canCheckout = useMemo(
    () => !loading && !busy && itemsCount > 0,
    [loading, busy, itemsCount],
  );

  const subtotal = Number(summary?.subtotal ?? summary?.total ?? 0);
  const discount = Number(summary?.discount ?? 0);
  const shipping = Number(summary?.shipping ?? 0);
  const total = Number(summary?.total ?? 0);

  const FREE_SHIPPING_THRESHOLD = 300;

  const shippingProgress = useMemo(() => {
    const safeSubtotal = Math.max(0, subtotal);
    const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - safeSubtotal);
    const percentRaw =
      FREE_SHIPPING_THRESHOLD > 0
        ? (safeSubtotal / FREE_SHIPPING_THRESHOLD) * 100
        : 100;

    const percent = Math.max(0, Math.min(100, Math.round(percentRaw)));
    const reached = safeSubtotal >= FREE_SHIPPING_THRESHOLD;

    return {
      remaining,
      percent,
      reached,
    };
  }, [subtotal]);

  if (!mounted) return null;

  return (
    <div
      className={["mk-cart-sheet", visible ? "is-visible" : ""].join(" ")}
      style={
        {
          "--mk-cart-sheet-bottom": `${bottomOffsetPx}px`,
        } as CSSProperties
      }
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="إغلاق"
        className="mk-cart-sheet__overlay"
      />

      <div dir="rtl" className="mk-cart-sheet__panel">
        <div className="mk-cart-sheet__head">
          <div className="mk-cart-sheet__handleWrap">
            <div className="mk-cart-sheet__handle" />
          </div>

          <div className="mk-cart-sheet__titleRow">
            <div className="mk-cart-sheet__titleBox">
              <div className="mk-cart-sheet__title">ملخص الطلب</div>

              <div className="mk-cart-sheet__subtitle">
                {totalQty ? `${totalQty} قطعة داخل السلة` : "لا توجد منتجات"}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="mk-cart-sheet__close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="mk-cart-sheet__body">
          <div className="mk-cart-summary-card">
            <div className="mk-cart-free-row">
              <div className="mk-cart-free-percent">
                %{shippingProgress.percent}
              </div>

              <div className="mk-cart-free-text">
                {shippingProgress.reached ? (
                  <>مبروك 🎉 حصلت على الشحن المجاني</>
                ) : (
                  <>
                    يتبقى{" "}
                    <strong>
                      {fmtCompact(shippingProgress.remaining, currency)}
                    </strong>{" "}
                    للشحن المجاني
                  </>
                )}
              </div>
            </div>

            <div className="mk-cart-free-track">
              <div
                className="mk-cart-free-bar"
                style={
                  {
                    "--mk-cart-free-percent": `${shippingProgress.percent}%`,
                  } as CSSProperties
                }
              />
            </div>

            <div className="mk-cart-free-note">
              أضف منتجات أكثر للوصول إلى الشحن المجاني
            </div>
          </div>

          <div className="mk-cart-summary-card">
            <div className="mk-cart-summary-rows">
              <SummaryRow
                label="مجموع المنتجات"
                value={loading ? null : fmt(subtotal, currency)}
                loading={loading}
              />

              <SummaryRow
                label="الشحن"
                value={loading ? null : fmt(shipping, currency)}
                loading={loading}
              />

              {!loading && discount > 0 ? (
                <SummaryRow
                  label="الخصم"
                  value={`- ${fmt(discount, currency)}`}
                  valueColor="#059669"
                />
              ) : loading ? (
                <SummaryRow label="الخصم" value={null} loading />
              ) : null}

              <div className="mk-cart-summary-divider" />

              <SummaryRow
                label="الإجمالي"
                value={loading ? null : fmt(total, currency)}
                strong
                loading={loading}
              />
            </div>
          </div>

          <div className="mk-cart-summary-card">
            <div className="mk-cart-coupon-title">كوبون خصم</div>

            {coupon?.code ? (
              <div className="mk-cart-coupon-applied">
                <div className="mk-cart-coupon-applied__text">
                  الكوبون المطبق:{" "}
                  <span className="mk-cart-coupon-applied__code">
                    {coupon.code}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onRemoveCoupon}
                  disabled={busy || loading}
                  className="mk-cart-coupon-remove"
                >
                  إزالة
                </button>
              </div>
            ) : (
              <div className="mk-cart-coupon-form">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="أدخل رمز الكوبون"
                  className="mk-cart-coupon-input"
                />

                <button
                  type="button"
                  onClick={() => {
                    const c = code.trim();
                    if (!c) return;

                    onApplyCoupon(c);
                    setCode("");
                  }}
                  disabled={busy || loading || !code.trim()}
                  className="mk-cart-coupon-apply"
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
            className="mk-cart-sheet__checkout"
          >
            {busy ? "جاري التحديث..." : "متابعة الدفع"}
          </button>

          <div className="mk-cart-sheet__hint">
            راجع الطلب قبل إكمال عملية الدفع
          </div>
        </div>
      </div>
    </div>
  );
}