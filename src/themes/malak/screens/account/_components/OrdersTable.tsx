// FILE: apps/storefront/src/themes/malak/screens/account/_components/OrdersTable.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Eye,
  Package,
  Search,
  SlidersHorizontal,
  Star,
} from "lucide-react";

export type AccountCustomerSummary = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string | null;
};

export type OrdersStats = {
  total: number;
  processing: number;
  completed: number;
};

export type OrderPreviewItem = {
  id: string;
  product_id: string | null;
  name: string;
  qty: number;
  image_url: string | null;
  image_alt: string | null;
};

export type OrdersApiRow = {
  id: string;
  public_no: number;
  order_number: number;
  status: string;

  base_status_key?: string | null;
  store_status_id?: string | null;

  status_display?: {
    label: string;
    color?: string | null;
    icon?: string | null;
  };

  payment_status: string;

  payment_status_display?: {
    label: string;
  };

  payment_method?: string | null;

  total_amount: number;
  currency: string;
  created_at: string;

  items_count?: number;
  items_qty?: number;
  remaining_items_count?: number;
  items_preview?: OrderPreviewItem[];

  has_review?: boolean;
  review_id?: string | null;
  review_status?: string | null;
  review_published_at?: string | null;
  review_created_at?: string | null;
  can_review?: boolean;
};

function money(x: unknown, c: unknown) {
  const n = Number(x ?? 0);
  const cur = String(c ?? "SAR");
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

function orderStatusLabel(order: OrdersApiRow) {
  return (
    String(order.status_display?.label || "").trim() ||
    String(order.base_status_key || order.status || "-").trim()
  );
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

function orderStatusTone(order: OrdersApiRow) {
  const s = String(order.base_status_key || order.status || "")
    .trim()
    .toLowerCase();

  if (s === "completed") return "success";
  if (s === "shipped") return "green";
  if (s === "cancelled" || s === "failed" || s === "refunded") {
    return "neutral";
  }

  return "warning";
}

function paymentTone(status: string) {
  const s = String(status || "").trim().toLowerCase();

  if (s === "paid") return "paid";
  if (s === "failed") return "failed";
  if (s === "refunded") return "refunded";

  return "unpaid";
}

function paymentMethodLabel(method?: string | null) {
  const key = String(method || "").trim().toLowerCase();

  const map: Record<string, string> = {
    cod: "الدفع عند الاستلام",
    mada: "مدى",
    visa: "فيزا",
    mastercard: "ماستر كارد",
    bank_transfer: "تحويل بنكي",
    apple_pay: "Apple Pay",
  };

  return map[key] || method || "-";
}

function isReviewableStatus(status: string) {
  const s = String(status ?? "").trim().toLowerCase();
  return s === "shipped" || s === "completed";
}

function searchText(order: OrdersApiRow) {
  return [
    order.public_no,
    order.order_number,
    order.status,
    order.base_status_key,
    orderStatusLabel(order),
    order.payment_status,
    order.payment_method,
    ...previewItems(order).map((x) => x.name),
  ]
    .join(" ")
    .toLowerCase();
}

export default function OrdersTable({
  orders,
  onOpenReview,
}: {
  orders: OrdersApiRow[];
  onOpenReview: (order: OrdersApiRow) => void;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const statusOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const order of orders) {
      const label = orderStatusLabel(order);
      if (label && label !== "-") {
        map.set(label, label);
      }
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
      <div className="mk-orders-empty">
        <div className="mk-orders-empty__icon">
          <Package size={30} strokeWidth={1.8} />
        </div>

        <div className="mk-orders-empty__title">ما عندك طلبات حتى الآن</div>

        <div className="mk-orders-empty__text">
          بعد إتمام أول طلب، سيظهر هنا مع تفاصيله وحالة الشحن.
        </div>
      </div>
    );
  }

  return (
    <div className="mk-orders-card">
      <div className="mk-orders-toolbar">
        <label className="mk-orders-search">
          <Search size={18} strokeWidth={1.9} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="تصفية الطلبات"
            aria-label="تصفية الطلبات"
          />
        </label>

        <div className="mk-orders-filters">
          <label className="mk-orders-select">
            <SlidersHorizontal size={16} strokeWidth={1.9} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="جميع الحالات"
            >
              <option value="all">جميع الحالات</option>
              {statusOptions.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="mk-orders-select">
            <ArrowUpDown size={16} strokeWidth={1.9} />
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
      </div>

      {!visibleOrders.length ? (
        <div className="mk-orders-empty mk-orders-empty--inside">
          <div className="mk-orders-empty__title">لا توجد نتائج مطابقة</div>
          <div className="mk-orders-empty__text">
            جرّب تغيير الفلتر أو البحث برقم الطلب.
          </div>
        </div>
      ) : (
        <div className="mk-orders-list">
          {visibleOrders.map((order) => {
            const products = previewItems(order);
            const alreadyReviewed = Boolean(order.has_review || order.review_id);

            const canReview =
              !alreadyReviewed &&
              (typeof order.can_review === "boolean"
                ? order.can_review
                : isReviewableStatus(order.base_status_key || order.status));

            const detailsHref = `/account/orders/${orderNo(order)}`;
            const reviewPending = order.review_status === "pending";

            return (
              <article key={order.id} className="mk-order-row mk-order-row--swap">
                <div className="mk-order-row__left">
                  <div className="mk-order-row__totalBlock">
                    <div className="mk-order-row__label">المجموع</div>
                    <div className="mk-order-row__amount">
                      {money(order.total_amount, order.currency)}
                    </div>
                  </div>

                  <div className="mk-order-row__actions">
                    <Link
                      className="mk-order-action mk-order-action--primary"
                      href={detailsHref}
                    >
                      <Eye size={16} strokeWidth={2} />
                      <span>عرض التفاصيل</span>
                    </Link>

                    {alreadyReviewed ? (
                      <button
                        type="button"
                        onClick={() => onOpenReview(order)}
                        className={[
                          "mk-order-action",
                          "mk-order-action--reviewed",
                          reviewPending ? "is-pending" : "is-published",
                        ].join(" ")}
                        title={
                          reviewPending
                            ? "عرض التقييم أو تعديله إذا لم تتجاوز مدة التعديل"
                            : "عرض التقييم أو تعديله إذا لم تتجاوز مدة التعديل"
                        }
                      >
                        <CheckCircle2 size={16} strokeWidth={2.4} />
                        <span>
                          {reviewPending
                            ? "التقييم بانتظار النشر"
                            : "تم تقييم الطلب"}
                        </span>
                      </button>
                    ) : canReview ? (
                      <button
                        type="button"
                        onClick={() => onOpenReview(order)}
                        className="mk-order-action mk-order-action--soft"
                      >
                        <Star size={15} strokeWidth={2} />
                        <span>تقييم الطلب</span>
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mk-order-row__center">
                  <div className="mk-order-row__productsBlock">
                    <div className="mk-order-row__label">
                      المنتجات ({itemsCount(order)})
                    </div>

                    <div className="mk-order-products">
                      <div className="mk-order-products__imgs">
                        {products.length ? (
                          products.map((item) => (
                            <div
                              key={item.id}
                              className="mk-order-products__imgBox"
                            >
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.image_alt || item.name}
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : (
                                <div className="mk-order-products__placeholder">
                                  <Package size={16} strokeWidth={1.8} />
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="mk-order-products__imgBox">
                            <div className="mk-order-products__placeholder">
                              <Package size={16} strokeWidth={1.8} />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mk-order-products__names">
                        {products.slice(0, 2).map((item) => (
                          <div key={item.id} className="mk-order-products__name">
                            {item.name}
                            {item.qty > 1 ? (
                              <span className="mk-order-products__qty">
                                ×{item.qty}
                              </span>
                            ) : null}
                          </div>
                        ))}

                        {remainingItemsCount(order) > 0 ? (
                          <div className="mk-order-products__more">
                            + {remainingItemsCount(order)} المزيد
                          </div>
                        ) : null}

                        {!products.length ? (
                          <div className="mk-order-products__more">
                            تفاصيل المنتجات داخل الطلب
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mk-order-row__paymentBlock">
                    <div className="mk-order-row__label">طريقة الدفع</div>

                    <div className="mk-order-payment-method">
                      {paymentMethodLabel(order.payment_method)}
                    </div>

                    <span
                      className="mk-order-payBadge"
                      data-tone={paymentTone(order.payment_status)}
                    >
                      <CreditCard size={13} strokeWidth={2} />
                      {order.payment_status_display?.label ||
                        order.payment_status ||
                        "-"}
                    </span>
                  </div>
                </div>

                <div className="mk-order-row__right">
                  <div className="mk-order-row__head">
                    <div className="mk-order-row__label">رقم الطلب</div>

                    <Link href={detailsHref} className="mk-order-row__number">
                      #{orderNo(order)}
                    </Link>

                    <div className="mk-order-row__date">
                      <CalendarDays size={14} strokeWidth={1.9} />
                      <span>{fmtDate(order.created_at)}</span>
                    </div>
                  </div>

                  <div className="mk-order-row__statusBlock">
                    <div className="mk-order-row__label">حالة الطلب</div>

                    <span
                      className="mk-order-badge"
                      data-tone={orderStatusTone(order)}
                    >
                      {orderStatusLabel(order)}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}