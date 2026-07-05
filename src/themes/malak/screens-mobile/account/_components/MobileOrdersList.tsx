// FILE: apps/storefront/src/themes/malak/screens-mobile/account/_components/MobileOrdersList.tsx
"use client";

import { useRouter } from "next/navigation";
import type { OrdersApiRow } from "../../../screens/account/_components/OrdersTable";

function money(x: unknown, c: unknown) {
  const n = Number(x ?? 0);
  const cur = String(c ?? "");
  return `${n.toFixed(2)} ${cur}`.trim();
}

function fmtDate(x: string) {
  if (!x) return "-";

  const d = new Date(x);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleDateString("ar-SA");
}

function isReviewableStatus(status: string) {
  const s = String(status ?? "").trim().toLowerCase();
  return s === "shipped" || s === "completed";
}

function statusBadge(status: string) {
  const s = String(status ?? "").trim().toLowerCase();

  if (s === "completed") {
    return {
      label: status || "completed",
      className: "mk-morder-card__badge",
      style: {
        background: "#ecfdf5",
        color: "#047857",
        border: "1px solid rgba(16,185,129,0.14)",
      } as React.CSSProperties,
    };
  }

  if (s === "shipped") {
    return {
      label: status || "shipped",
      className: "mk-morder-card__badge",
      style: {
        background: "#eff6ff",
        color: "#1d4ed8",
        border: "1px solid rgba(59,130,246,0.14)",
      } as React.CSSProperties,
    };
  }

  if (s === "pending") {
    return {
      label: status || "pending",
      className: "mk-morder-card__badge",
      style: {
        background: "#fff7ed",
        color: "#c2410c",
        border: "1px solid rgba(249,115,22,0.14)",
      } as React.CSSProperties,
    };
  }

  if (s === "cancelled") {
    return {
      label: status || "cancelled",
      className: "mk-morder-card__badge",
      style: {
        background: "#fef2f2",
        color: "#b91c1c",
        border: "1px solid rgba(239,68,68,0.14)",
      } as React.CSSProperties,
    };
  }

  return {
    label: status || "-",
    className: "mk-morder-card__badge",
    style: {
      background: "#f8fafc",
      color: "#475569",
      border: "1px solid rgba(148,163,184,0.16)",
    } as React.CSSProperties,
  };
}

export default function MobileOrdersList({
  orders,
  onOpenReview,
}: {
  orders: OrdersApiRow[];
  onOpenReview: (order: OrdersApiRow) => void;
}) {
  const router = useRouter();

  if (!orders.length) {
    return (
      <div className="mk-morders-empty">
        <div className="mk-morders-empty__title">ما عندك طلبات حتى الآن</div>

        <div className="mk-morders-empty__text">
          أول ما تطلب من المتجر راح تظهر طلباتك هنا بشكل مرتب.
        </div>
      </div>
    );
  }

  return (
    <div className="mk-morders">
      {orders.map((o) => {
        const canReview = isReviewableStatus(o.status);
        const badge = statusBadge(o.status);

        return (
          <div key={o.id} className="mk-morder-card">
            <div className="mk-morder-card__head">
              <div>
                <div className="mk-morder-card__number">
                  #{o.order_number || o.public_no}
                </div>
              </div>

              <div className={badge.className} style={badge.style}>
                {badge.label}
              </div>
            </div>

            <div className="mk-morder-card__infoGrid">
              <InfoBox label="الدفع" value={o.payment_status || "-"} />
              <InfoBox
                label="الإجمالي"
                value={money(o.total_amount, o.currency)}
              />
              <InfoBox label="التاريخ" value={fmtDate(o.created_at)} />
              <InfoBox label="الحالة" value={o.status || "-"} />
            </div>

            <div className="mk-morder-card__actions">
              <button
                type="button"
                onClick={() => router.push(`/account/orders/${o.order_number || o.public_no}`)}
                className="mk-morder-card__btn mk-morder-card__btn--details"
              >
                التفاصيل
              </button>

              {canReview ? (
                <button
                  type="button"
                  onClick={() => onOpenReview(o)}
                  className="mk-morder-card__btn mk-morder-card__btn--review"
                >
                  تقييم
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="mk-morder-info">
      <div className="mk-morder-info__label">{label}</div>
      <div className="mk-morder-info__value">{value}</div>
    </div>
  );
}