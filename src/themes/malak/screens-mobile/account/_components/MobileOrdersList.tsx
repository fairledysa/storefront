// FILE: apps/storefront/src/themes/malak/screens-mobile/account/_components/MobileOrdersList.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import type { OrdersApiRow } from "../../../screens/account/_components/OrdersTable";

function s(value: unknown) {
  return String(value ?? "").trim();
}

function money(x: unknown, c: unknown) {
  const n = Number(x ?? 0);
  const cur = s(c) || "SAR";
  return `${cur} ${n.toFixed(2)}`.trim();
}

function fmtDate(x: string) {
  if (!x) return "-";

  const d = new Date(x);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });
}

function orderNo(order: OrdersApiRow) {
  return order.order_number || order.public_no || 0;
}

function fallbackStatusLabel(value: unknown) {
  const key = s(value).toLowerCase();

  const map: Record<string, string> = {
    pending: "قيد الانتظار",
    processing: "قيد التنفيذ",
    paid: "مدفوع",
    failed: "فشل",
    cancelled: "ملغي",
    canceled: "ملغي",
    shipped: "تم الشحن",
    completed: "مكتمل",
    refunded: "مسترجع",
    unpaid: "غير مدفوع",
  };

  return map[key] || s(value) || "-";
}

function orderStatusLabel(order: OrdersApiRow) {
  return (
    s(order.status_display?.label) ||
    fallbackStatusLabel(order.base_status_key || order.status)
  );
}

function paymentStatusLabel(order: OrdersApiRow) {
  return s(order.payment_status_display?.label) || fallbackStatusLabel(order.payment_status);
}

function orderTone(order: OrdersApiRow) {
  const key = s(order.base_status_key || order.status).toLowerCase();

  if (key === "completed") return "success";
  if (key === "shipped") return "green";
  if (key === "cancelled" || key === "canceled" || key === "failed" || key === "refunded") {
    return "neutral";
  }

  return "warning";
}

function paymentTone(status: string) {
  const key = s(status).toLowerCase();

  if (key === "paid") return "paid";
  if (key === "failed") return "failed";
  if (key === "refunded") return "refunded";

  return "unpaid";
}

function paymentMethodLabel(method?: string | null) {
  const key = s(method).toLowerCase();

  const map: Record<string, string> = {
    cod: "الدفع عند الاستلام",
    mada: "مدى",
    visa: "فيزا",
    mastercard: "ماستر كارد",
    bank_transfer: "تحويل بنكي",
    apple_pay: "Apple Pay",
    stc_pay: "STC Pay",
  };

  return map[key] || s(method) || "-";
}

function previewItems(order: OrdersApiRow) {
  return Array.isArray(order.items_preview) ? order.items_preview : [];
}

function itemsCount(order: OrdersApiRow) {
  const explicit = Number(order.items_count ?? 0);
  return explicit > 0 ? explicit : previewItems(order).length;
}

function remainingItemsCount(order: OrdersApiRow) {
  return Math.max(Number(order.remaining_items_count ?? 0), 0);
}

function isReviewableStatus(status: string) {
  const key = s(status).toLowerCase();
  return key === "shipped" || key === "completed";
}

function searchText(order: OrdersApiRow) {
  return [
    order.public_no,
    order.order_number,
    order.status,
    order.base_status_key,
    orderStatusLabel(order),
    order.payment_status,
    paymentStatusLabel(order),
    order.payment_method,
    ...previewItems(order).map((x) => x.name),
  ]
    .join(" ")
    .toLowerCase();
}

export default function MobileOrdersList({
  orders,
  onOpenReview,
}: {
  orders: OrdersApiRow[];
  onOpenReview: (order: OrdersApiRow) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const statusOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const order of orders) {
      const label = orderStatusLabel(order);
      if (label && label !== "-") map.set(label, label);
    }

    return Array.from(map.values());
  }, [orders]);

  const visibleOrders = useMemo(() => {
    const q = query.trim().toLowerCase();

    return [...orders]
      .filter((order) => {
        if (statusFilter !== "all" && orderStatusLabel(order) !== statusFilter) {
          return false;
        }

        if (!q) return true;
        return searchText(order).includes(q);
      })
      .sort((a, b) => {
        const at = new Date(a.created_at).getTime() || 0;
        const bt = new Date(b.created_at).getTime() || 0;
        return sort === "newest" ? bt - at : at - bt;
      });
  }, [orders, query, sort, statusFilter]);

  if (!orders.length) {
    return (
      <div className="mk-morders-empty">
        <div className="mk-morders-empty__icon">📦</div>
        <div className="mk-morders-empty__title">ما عندك طلبات حتى الآن</div>
        <div className="mk-morders-empty__text">
          بعد إتمام أول طلب، سيظهر هنا مع تفاصيله وحالة الشحن والفاتورة.
        </div>
      </div>
    );
  }

  return (
    <div className="mk-morders">
      <section className="mk-morders-toolbar">
        <label className="mk-morders-search">
          <span aria-hidden="true">⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث برقم الطلب أو المنتج"
            aria-label="ابحث برقم الطلب أو المنتج"
          />
        </label>

        <div className="mk-morders-filterGrid">
          <label className="mk-morders-select">
            <span>الحالة</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="تصفية حسب الحالة"
            >
              <option value="all">جميع الحالات</option>
              {statusOptions.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="mk-morders-select">
            <span>الترتيب</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
              aria-label="ترتيب الطلبات"
            >
              <option value="newest">الأحدث أولاً</option>
              <option value="oldest">الأقدم أولاً</option>
            </select>
          </label>
        </div>
      </section>

      {!visibleOrders.length ? (
        <div className="mk-morders-empty mk-morders-empty--inside">
          <div className="mk-morders-empty__title">لا توجد نتائج مطابقة</div>
          <div className="mk-morders-empty__text">
            جرّب تغيير الفلتر أو البحث برقم الطلب.
          </div>
        </div>
      ) : (
        <div className="mk-morders-list">
          {visibleOrders.map((order) => {
            const products = previewItems(order);
            const detailsHref = `/account/orders/${orderNo(order)}`;
            const alreadyReviewed = Boolean(order.has_review || order.review_id);
            const reviewPending = order.review_status === "pending";
            const canReview =
              !alreadyReviewed &&
              (typeof order.can_review === "boolean"
                ? order.can_review
                : isReviewableStatus(order.base_status_key || order.status));

            return (
              <article key={order.id} className="mk-morder-card">
                <div className="mk-morder-card__top">
                  <div>
                    <div className="mk-morder-card__label">رقم الطلب</div>
                    <button
                      type="button"
                      className="mk-morder-card__number"
                      onClick={() => router.push(detailsHref)}
                    >
                      #{orderNo(order)}
                    </button>
                  </div>

                  <span
                    className="mk-morder-card__badge"
                    data-tone={orderTone(order)}
                    style={
                      order.status_display?.color
                        ? ({
                            "--order-status-color": order.status_display.color,
                          } as CSSProperties)
                        : undefined
                    }
                  >
                    {orderStatusLabel(order)}
                  </span>
                </div>

                <div className="mk-morder-card__meta">
                  <span>{fmtDate(order.created_at)}</span>
                  <span>{itemsCount(order)} منتج</span>
                  <span>{money(order.total_amount, order.currency)}</span>
                </div>

                <div className="mk-morder-products">
                  <div className="mk-morder-products__media">
                    {products.length ? (
                      products.slice(0, 4).map((item) => (
                        <span key={item.id} className="mk-morder-products__img">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.image_alt || item.name}
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <span>📦</span>
                          )}
                        </span>
                      ))
                    ) : (
                      <span className="mk-morder-products__img">
                        <span>📦</span>
                      </span>
                    )}
                  </div>

                  <div className="mk-morder-products__names">
                    {products.slice(0, 2).map((item) => (
                      <div key={item.id} className="mk-morder-products__name">
                        {item.name}
                        {item.qty > 1 ? <small>×{item.qty}</small> : null}
                      </div>
                    ))}

                    {remainingItemsCount(order) > 0 ? (
                      <div className="mk-morder-products__more">
                        + {remainingItemsCount(order)} المزيد
                      </div>
                    ) : null}

                    {!products.length ? (
                      <div className="mk-morder-products__more">
                        افتح التفاصيل لعرض المنتجات والفاتورة
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mk-morder-card__invoice">
                  <Info label="طريقة الدفع" value={paymentMethodLabel(order.payment_method)} />
                  <Info
                    label="حالة الدفع"
                    value={paymentStatusLabel(order)}
                    tone={paymentTone(order.payment_status)}
                  />
                </div>

                <div className="mk-morder-card__actions">
                  <button
                    type="button"
                    onClick={() => router.push(detailsHref)}
                    className="mk-morder-card__btn mk-morder-card__btn--details"
                  >
                    الفاتورة والتفاصيل
                  </button>

                  {alreadyReviewed ? (
                    <button
                      type="button"
                      onClick={() => onOpenReview(order)}
                      className={[
                        "mk-morder-card__btn",
                        "mk-morder-card__btn--reviewed",
                        reviewPending ? "is-pending" : "is-published",
                      ].join(" ")}
                    >
                      {reviewPending ? "التقييم بانتظار النشر" : "تم تقييم الطلب"}
                    </button>
                  ) : canReview ? (
                    <button
                      type="button"
                      onClick={() => onOpenReview(order)}
                      className="mk-morder-card__btn mk-morder-card__btn--review"
                    >
                      تقييم الطلب
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Info({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="mk-morder-info" data-tone={tone}>
      <div className="mk-morder-info__label">{label}</div>
      <div className="mk-morder-info__value">{value}</div>
    </div>
  );
}
