// FILE: apps/storefront/src/themes/malak/screens-mobile/account/OrdersMobileScreen.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AccountMobileLayout from "./AccountMobileLayout";
import MobileOrdersList from "./_components/MobileOrdersList";
import OrderReviewModal from "../../screens/account/_components/OrderReviewModal";
import RequireCustomer from "../../screens/account/_components/RequireCustomer";
import type {
  AccountCustomerSummary,
  OrdersApiRow,
  OrdersStats,
} from "../../screens/account/_components/OrdersTable";

type State =
  | { kind: "loading" }
  | { kind: "unauth" }
  | { kind: "error"; status: number; error: string }
  | {
      kind: "ready";
      orders: OrdersApiRow[];
      stats: OrdersStats;
      customer: AccountCustomerSummary | null;
    };

const EMPTY_STATS: OrdersStats = {
  total: 0,
  processing: 0,
  completed: 0,
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

function formatMemberSince(value?: string | null) {
  if (!value) return undefined;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;

  return `عضو منذ ${d.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
  })}`;
}

function normalizeOrder(raw: any): OrdersApiRow {
  return {
    id: s(raw?.id),
    public_no: Number(raw?.public_no ?? 0),
    order_number: Number(raw?.order_number ?? 0),
    status: s(raw?.status),
    base_status_key: raw?.base_status_key ? s(raw.base_status_key) : null,
    store_status_id: raw?.store_status_id ? s(raw.store_status_id) : null,
    status_display: {
      label: s(raw?.status_display?.label) || s(raw?.status) || "-",
      color: raw?.status_display?.color ? s(raw.status_display.color) : null,
      icon: raw?.status_display?.icon ? s(raw.status_display.icon) : null,
    },
    payment_status: s(raw?.payment_status),
    payment_status_display: {
      label: s(raw?.payment_status_display?.label) || s(raw?.payment_status) || "-",
    },
    payment_method: raw?.payment_method ? s(raw.payment_method) : null,
    total_amount: Number(raw?.total_amount ?? 0),
    currency: s(raw?.currency) || "SAR",
    created_at: s(raw?.created_at),
    items_count: Number(raw?.items_count ?? 0),
    items_qty: Number(raw?.items_qty ?? 0),
    remaining_items_count: Number(raw?.remaining_items_count ?? 0),
    items_preview: Array.isArray(raw?.items_preview)
      ? raw.items_preview
          .filter((x: any) => x && x.id)
          .map((x: any) => ({
            id: s(x.id),
            product_id: x.product_id ? s(x.product_id) : null,
            name: s(x.name) || "منتج",
            qty: Number(x.qty ?? 1),
            image_url: x.image_url ? s(x.image_url) : null,
            image_alt: x.image_alt ? s(x.image_alt) : null,
          }))
      : [],
    has_review: Boolean(raw?.has_review),
    review_id: raw?.review_id ? s(raw.review_id) : null,
    review_status: raw?.review_status ? s(raw.review_status) : null,
    review_published_at: raw?.review_published_at ? s(raw.review_published_at) : null,
    review_created_at: raw?.review_created_at ? s(raw.review_created_at) : null,
    can_review:
      typeof raw?.can_review === "boolean" ? Boolean(raw.can_review) : undefined,
  };
}

export default function OrdersMobileScreen() {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [reviewOrder, setReviewOrder] = useState<OrdersApiRow | null>(null);

  const loadOrders = useCallback(
    async (signal?: AbortSignal, options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      try {
        if (!silent) setState({ kind: "loading" });

        const res = await fetch("/api/account/orders", {
          cache: "no-store",
          credentials: "include",
          signal,
        });

        const json = await res.json().catch(() => ({}));

        if (signal?.aborted) return;

        if (res.status === 401) {
          setState({ kind: "unauth" });
          return;
        }

        if (!res.ok || !json?.ok) {
          setState({
            kind: "error",
            status: res.status,
            error: s(json?.error) || "REQUEST_FAILED",
          });
          return;
        }

        const orders: OrdersApiRow[] = Array.isArray(json?.orders)
          ? json.orders
              .map(normalizeOrder)
              .filter(
                (order: OrdersApiRow) =>
                  order.id && (order.order_number || order.public_no),
              )
          : [];

        const stats: OrdersStats = {
          total: Number(json?.stats?.total ?? orders.length),
          processing: Number(json?.stats?.processing ?? 0),
          completed: Number(json?.stats?.completed ?? 0),
        };

        const customer: AccountCustomerSummary | null = json?.customer
          ? {
              id: s(json.customer.id),
              full_name: json.customer.full_name ? s(json.customer.full_name) : null,
              email: json.customer.email ? s(json.customer.email) : null,
              created_at: json.customer.created_at ? s(json.customer.created_at) : null,
            }
          : null;

        setState({ kind: "ready", orders, stats, customer });
      } catch (e: any) {
        if (signal?.aborted) return;

        if (!silent) {
          setState({
            kind: "error",
            status: 500,
            error: e?.message ? String(e.message) : "UNHANDLED",
          });
        }
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      void loadOrders(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadOrders]);

  const ready = state.kind === "ready" ? state : null;

  return (
    <RequireCustomer>
      <AccountMobileLayout active="orders" title="طلباتي">
        {ready?.customer ? (
          <div className="mk-morders-hello">
            <div>
              <strong>{ready.customer.full_name || "حسابي"}</strong>
              {formatMemberSince(ready.customer.created_at) ? (
                <span>{formatMemberSince(ready.customer.created_at)}</span>
              ) : null}
            </div>
          </div>
        ) : null}

        {state.kind === "loading" ? (
          <div className="mk-morders-loading">
            <span className="mk-morders-loading__pulse" />
            <div>
              <strong>جاري تحميل الطلبات...</strong>
              <p>يتم تجهيز ملخص طلباتك بأسرع طريقة.</p>
            </div>
          </div>
        ) : state.kind === "unauth" ? (
          <div className="mk-maccount-state">
            <div className="mk-maccount-state__title">سجلي دخولك أولًا</div>
            <div className="mk-maccount-state__sub">
              لازم تسجل دخول عشان تظهر لك طلباتك السابقة.
            </div>
            <button
              type="button"
              onClick={() => router.push("/account")}
              className="mk-maccount-state__btn"
            >
              الذهاب للحساب
            </button>
          </div>
        ) : state.kind === "error" ? (
          <div className="mk-maccount-state mk-maccount-state--error">
            <div className="mk-maccount-state__title">
              حصل خطأ أثناء جلب الطلبات
            </div>
            <div className="mk-maccount-state__sub">
              {state.error} ({state.status})
            </div>
            <button
              type="button"
              onClick={() => void loadOrders()}
              className="mk-maccount-state__btn"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <div className="mk-morders-page">
            <section className="mk-morders-stats" aria-label="ملخص الطلبات">
              <Stat label="إجمالي الطلبات" value={state.stats.total} hint="طلب" />
              <Stat label="قيد التنفيذ" value={state.stats.processing} hint="طلبات" />
              <Stat label="المكتملة" value={state.stats.completed} hint="طلب" />
            </section>

            <MobileOrdersList
              orders={state.orders}
              onOpenReview={(order) => setReviewOrder(order)}
            />
          </div>
        )}

        <OrderReviewModal
          open={Boolean(reviewOrder)}
          order={reviewOrder}
          onClose={() => setReviewOrder(null)}
          onSubmitted={() => {
            void loadOrders(undefined, { silent: true });
          }}
        />
      </AccountMobileLayout>
    </RequireCustomer>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="mk-morders-stat">
      <div className="mk-morders-stat__value">{value}</div>
      <div className="mk-morders-stat__label">{label}</div>
      <div className="mk-morders-stat__hint">{hint}</div>
    </div>
  );
}
