// FILE: apps/storefront/src/app/checkout/_components/CheckoutTokenSummary.tsx

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Package, ShoppingCart, X } from "lucide-react";

type OrderItemRow = {
  id?: string | null;
  product_id?: string | null;
  variant_id?: string | null;
  name?: string | null;
  sku?: string | null;
  qty?: number | string | null;
  currency?: string | null;
  unit_price?: number | string | null;
  total_price?: number | string | null;
  selected_options?: any;
};

type PaymentState = {
  currentTotal: number;
  paidReference: number;
  walletRefunded: number;
  walletUsed: number;
};

type Props = {
  orderNo: string;
  items: OrderItemRow[];
  imageByProduct: Record<string, string>;
  currency: string;
  effectiveAmountDue: number;
  paymentState: PaymentState;
};

const DRAWER_CLOSE_MS = 240;

function s(value: unknown) {
  return String(value ?? "").trim();
}

function n(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function round2(value: unknown) {
  return Math.round(n(value) * 100) / 100;
}

function safeArray(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function money(amount: unknown, currency = "SAR") {
  const value = round2(amount);

  return `${currency} ${new Intl.NumberFormat("en-SA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

function selectedOptionsText(value: any) {
  const rows = safeArray(value);

  return rows
    .map((row: any) => {
      const name = s(row?.name);
      const val = s(row?.value);

      if (name && val) return `${name}: ${val}`;
      if (val) return val;

      return "";
    })
    .filter(Boolean)
    .join("، ");
}

function getLineTotal(item: OrderItemRow) {
  const direct = n(item.total_price);
  if (direct > 0) return round2(direct);

  return round2(n(item.unit_price) * Math.max(1, Math.floor(n(item.qty) || 1)));
}

function getItemCount(items: OrderItemRow[]) {
  return items.reduce(
    (acc, item) => acc + Math.max(1, Math.floor(n(item.qty) || 1)),
    0,
  );
}

function getItemCountText(count: number) {
  if (count === 1) return "منتج واحد";
  if (count === 2) return "منتجان";
  return `${count} منتجات`;
}

export default function CheckoutTokenSummary({
  orderNo,
  items,
  imageByProduct,
  currency,
  effectiveAmountDue,
  paymentState,
}: Props) {
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [drawerClosing, setDrawerClosing] = useState(false);

  const drawerCloseTimerRef = useRef<number | null>(null);

  const itemCount = useMemo(() => getItemCount(items), [items]);
  const itemCountText = useMemo(() => getItemCountText(itemCount), [itemCount]);

  const drawerOpen = drawerMounted && !drawerClosing;

  const clearDrawerCloseTimer = useCallback(() => {
    if (drawerCloseTimerRef.current !== null) {
      window.clearTimeout(drawerCloseTimerRef.current);
      drawerCloseTimerRef.current = null;
    }
  }, []);

  const openDrawer = useCallback(() => {
    clearDrawerCloseTimer();
    setDrawerMounted(true);
    setDrawerClosing(false);
  }, [clearDrawerCloseTimer]);

  const closeDrawer = useCallback(() => {
    if (!drawerMounted || drawerClosing) return;

    clearDrawerCloseTimer();
    setDrawerClosing(true);

    drawerCloseTimerRef.current = window.setTimeout(() => {
      drawerCloseTimerRef.current = null;
      setDrawerMounted(false);
      setDrawerClosing(false);
    }, DRAWER_CLOSE_MS);
  }, [clearDrawerCloseTimer, drawerClosing, drawerMounted]);

  useEffect(() => {
    return () => {
      clearDrawerCloseTimer();
    };
  }, [clearDrawerCloseTimer]);

  useEffect(() => {
    if (!drawerMounted) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerMounted]);

  useEffect(() => {
    if (!drawerMounted) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      closeDrawer();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeDrawer, drawerMounted]);

  return (
    <>
      <section className="co-summary-wrapper">
        <div className="co-summary">
          <div className="co-summary__main">
            <div className="co-summary__right">
              <span className="co-summary__icon">
                <ShoppingCart size={22} />
              </span>

              <div className="co-summary__title">
                <h1>إجمالي الطلب</h1>
                <p>
                  {itemCountText}
                  <span>طلب #{orderNo}</span>
                </p>
              </div>

              <div className="co-summary__thumbs" aria-hidden>
                {items.slice(0, 3).map((item, index) => {
                  const productId = s(item.product_id);
                  const image = imageByProduct[productId] || "";

                  return (
                    <span key={s(item.id) || `${productId}-${index}`}>
                      {image ? (
                        <img src={image} alt="" />
                      ) : (
                        <Package size={15} />
                      )}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="co-summary__left">
              <strong dir="ltr">{money(effectiveAmountDue, currency)}</strong>
              <span className="co-coupon-link is-applied">
                مبلغ مطلوب على نفس الطلب
              </span>
            </div>
          </div>
        </div>

        <div className="co-summary__toggle-bg">
          <div className="co-summary__toggle">
            <button
              type="button"
              className="co-summary__details"
              aria-expanded={drawerOpen}
              onClick={openDrawer}
            >
              تفاصيل الطلب
              <ChevronDown size={15} />
            </button>
          </div>
        </div>
      </section>

      {drawerMounted ? (
        <div
          className={[
            "co-drawer-layer",
            drawerClosing ? "is-closing" : "is-open",
          ]
            .filter(Boolean)
            .join(" ")}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="co-drawer-backdrop"
            aria-label="إغلاق تفاصيل الطلب"
            onClick={closeDrawer}
          />

          <aside className="co-drawer">
            <div className="co-drawer__head">
              <button
                type="button"
                className="co-drawer__close"
                aria-label="إغلاق"
                onClick={closeDrawer}
              >
                <X size={20} />
              </button>

              <div>
                <h2>تفاصيل الطلب</h2>
                <p>راجع المنتجات والإجمالي قبل تأكيد الدفع</p>
              </div>
            </div>

            <div className="co-drawer__body">
              <section className="co-drawer-section">
                <h3>المنتجات</h3>

                {items.length > 0 ? (
                  <div className="co-summary-items">
                    {items.map((item, index) => {
                      const productId = s(item.product_id);
                      const image = imageByProduct[productId] || "";
                      const qty = Math.max(1, Math.floor(n(item.qty) || 1));
                      const optionText = selectedOptionsText(
                        item.selected_options,
                      );

                      return (
                        <div
                          key={
                            s(item.id) ||
                            `${productId}-${s(item.sku)}-${index}`
                          }
                          className="co-summary-item"
                        >
                          <div className="co-summary-item__image">
                            {image ? (
                              <img src={image} alt={s(item.name) || "منتج"} />
                            ) : (
                              <Package size={18} />
                            )}

                            <span>{qty}</span>
                          </div>

                          <div className="co-summary-item__info">
                            <strong>{s(item.name) || "منتج"}</strong>
                            <p>{optionText || `الكمية: ${qty}`}</p>
                          </div>

                          <div dir="ltr" className="co-summary-item__price">
                            {money(getLineTotal(item), s(item.currency) || currency)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="co-empty-small">لا توجد منتجات في الملخص</div>
                )}
              </section>

              <section className="co-drawer-section">
                <h3>ملخص الدفع</h3>

                <div className="co-totals">
                  <div className="co-total-row">
                    <span>إجمالي الطلب الحالي</span>
                    <strong dir="ltr">
                      {money(paymentState.currentTotal, currency)}
                    </strong>
                  </div>

                  {paymentState.paidReference > 0 ? (
                    <div className="co-total-row">
                      <span>المدفوع سابقًا</span>
                      <strong dir="ltr">
                        {money(paymentState.paidReference, currency)}
                      </strong>
                    </div>
                  ) : null}

                  {paymentState.walletRefunded > 0 ? (
                    <div className="co-total-row">
                      <span>إرجاع للمحفظة</span>
                      <strong dir="ltr">
                        {money(paymentState.walletRefunded, currency)}
                      </strong>
                    </div>
                  ) : null}

                  {paymentState.walletUsed > 0 ? (
                    <div className="co-total-row">
                      <span>خصم من المحفظة</span>
                      <strong dir="ltr">
                        {money(paymentState.walletUsed, currency)}
                      </strong>
                    </div>
                  ) : null}

                  <div className="co-total-line">
                    <span>المبلغ المطلوب</span>
                    <strong dir="ltr">
                      {money(effectiveAmountDue, currency)}
                    </strong>
                  </div>
                </div>
              </section>

              <div className="co-secure-note">
                <span>دفع آمن ومشفّر</span>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}