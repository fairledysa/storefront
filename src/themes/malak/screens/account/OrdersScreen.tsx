// FILE: apps/storefront/src/themes/malak/screens/account/OrdersScreen.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";

import AccountLayout from "./AccountLayout";
import OrdersTable, {
  type AccountCustomerSummary,
  type OrdersApiRow,
  type OrdersStats,
} from "./_components/OrdersTable";
import OrderReviewModal from "./_components/OrderReviewModal";

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
    id: String(raw?.id ?? ""),
    public_no: Number(raw?.public_no ?? 0),
    order_number: Number(raw?.order_number ?? 0),
    status: String(raw?.status ?? ""),
    base_status_key: raw?.base_status_key ? String(raw.base_status_key) : null,
    store_status_id: raw?.store_status_id ? String(raw.store_status_id) : null,
    status_display: {
      label: String(raw?.status_display?.label ?? raw?.status ?? "-"),
      color: raw?.status_display?.color
        ? String(raw.status_display.color)
        : null,
      icon: raw?.status_display?.icon ? String(raw.status_display.icon) : null,
    },
    payment_status: String(raw?.payment_status ?? ""),
    payment_status_display: {
      label: String(
        raw?.payment_status_display?.label ?? raw?.payment_status ?? "-",
      ),
    },
    payment_method: raw?.payment_method ? String(raw.payment_method) : null,
    total_amount: Number(raw?.total_amount ?? 0),
    currency: String(raw?.currency ?? "SAR"),
    created_at: String(raw?.created_at ?? ""),
    items_count: Number(raw?.items_count ?? 0),
    items_qty: Number(raw?.items_qty ?? 0),
    remaining_items_count: Number(raw?.remaining_items_count ?? 0),
    items_preview: Array.isArray(raw?.items_preview)
      ? raw.items_preview
          .filter((x: any) => x && x.id)
          .map((x: any) => ({
            id: String(x.id),
            product_id: x.product_id ? String(x.product_id) : null,
            name: String(x.name ?? "منتج"),
            qty: Number(x.qty ?? 1),
            image_url: x.image_url ? String(x.image_url) : null,
            image_alt: x.image_alt ? String(x.image_alt) : null,
          }))
      : [],

    has_review: Boolean(raw?.has_review),
    review_id: raw?.review_id ? String(raw.review_id) : null,
    review_status: raw?.review_status ? String(raw.review_status) : null,
    review_published_at: raw?.review_published_at
      ? String(raw.review_published_at)
      : null,
    review_created_at: raw?.review_created_at
      ? String(raw.review_created_at)
      : null,
    can_review:
      typeof raw?.can_review === "boolean" ? Boolean(raw.can_review) : undefined,
  };
}

export default function OrdersScreen() {
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
            error: json?.error || "REQUEST_FAILED",
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
              id: String(json.customer.id ?? ""),
              full_name: json.customer.full_name
                ? String(json.customer.full_name)
                : null,
              email: json.customer.email ? String(json.customer.email) : null,
              created_at: json.customer.created_at
                ? String(json.customer.created_at)
                : null,
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
    <AccountLayout
      active="orders"
      title="طلباتي"
      subtitle="تابعي جميع طلباتك وحالة الشحن من هنا."
      customerName={ready?.customer?.full_name}
      memberSince={formatMemberSince(ready?.customer?.created_at)}
    >
      {state.kind === "loading" ? (
        <div className="mk-orders-loading">
          <div className="mk-orders-loading__pulse" />
          <div>
            <div className="mk-orders-loading__title">جاري تحميل الطلبات...</div>
            <div className="mk-orders-loading__text">
              يتم تجهيز ملخص طلباتك بأسرع طريقة.
            </div>
          </div>
        </div>
      ) : state.kind === "unauth" ? (
        <div className="mk-orders-empty">
          <div className="mk-orders-empty__icon">
            <ShoppingBag size={28} strokeWidth={1.8} />
          </div>
          <div className="mk-orders-empty__title">سجلي دخولك أولًا</div>
          <div className="mk-orders-empty__text">
            لازم تسجل دخول عشان تظهر لك طلباتك السابقة.
          </div>
          <button
            type="button"
            onClick={() => router.push("/account")}
            className="mk-account-btn mk-account-btn--primary"
          >
            الذهاب للحساب
          </button>
        </div>
      ) : state.kind === "error" ? (
        <div className="mk-orders-error">
          <div className="mk-orders-error__icon">
            <AlertTriangle size={26} strokeWidth={1.9} />
          </div>

          <div className="mk-orders-error__body">
            <div className="mk-orders-errorTitle">حصل خطأ أثناء جلب الطلبات.</div>
            <div className="mk-orders-errorText">
              {state.error} ({state.status})
            </div>

            <button
              type="button"
              onClick={() => void loadOrders()}
              className="mk-orders-error__retry"
            >
              <RefreshCw size={15} strokeWidth={2} />
              إعادة المحاولة
            </button>
          </div>
        </div>
      ) : (
        <div className="mk-orders-page">
          <div className="mk-orders-stats" aria-label="ملخص الطلبات">
            <div className="mk-orders-stat">
              <div className="mk-orders-stat__icon">
                <ShoppingBag size={24} strokeWidth={1.8} />
              </div>
              <div>
                <div className="mk-orders-stat__label">إجمالي الطلبات</div>
                <div className="mk-orders-stat__value">{state.stats.total}</div>
                <div className="mk-orders-stat__hint">طلب</div>
              </div>
            </div>

            <div className="mk-orders-stat">
              <div className="mk-orders-stat__icon">
                <Clock3 size={24} strokeWidth={1.8} />
              </div>
              <div>
                <div className="mk-orders-stat__label">قيد التنفيذ</div>
                <div className="mk-orders-stat__value">
                  {state.stats.processing}
                </div>
                <div className="mk-orders-stat__hint">طلبات</div>
              </div>
            </div>

            <div className="mk-orders-stat">
              <div className="mk-orders-stat__icon">
                <CheckCircle2 size={24} strokeWidth={1.8} />
              </div>
              <div>
                <div className="mk-orders-stat__label">المكتملة</div>
                <div className="mk-orders-stat__value">
                  {state.stats.completed}
                </div>
                <div className="mk-orders-stat__hint">طلب</div>
              </div>
            </div>
          </div>

          <OrdersTable
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
    </AccountLayout>
  );
}