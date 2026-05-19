// FILE: apps/storefront/src/themes/malak/screens-mobile/account/OrdersMobileScreen.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AccountMobileLayout from "./AccountMobileLayout";
import MobileOrdersList from "./_components/MobileOrdersList";
import MobileOrderReviewSheet from "./_components/MobileOrderReviewSheet";
import RequireCustomer from "../../screens/account/_components/RequireCustomer";
import type { OrdersApiRow } from "../../screens/account/_components/OrdersTable";

type State =
  | { kind: "loading" }
  | { kind: "unauth" }
  | { kind: "error"; status: number; error: string }
  | { kind: "ready"; orders: OrdersApiRow[] };

export default function OrdersMobileScreen() {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [reviewOrder, setReviewOrder] = useState<OrdersApiRow | null>(null);

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        setState({ kind: "loading" });

        const res = await fetch("/api/account/orders", {
          cache: "no-store",
          credentials: "include",
        });

        const json = await res.json().catch(() => ({}));

        if (!alive) return;

        if (res.status === 401) {
          setState({ kind: "unauth" });
          return;
        }

        if (!res.ok) {
          setState({
            kind: "error",
            status: res.status,
            error: json?.error || "REQUEST_FAILED",
          });
          return;
        }

        const rows = Array.isArray(json?.orders) ? json.orders : [];

        const orders: OrdersApiRow[] = rows
          .filter((o: any) => o && o.id)
          .map((o: any) => ({
            id: String(o.id),
            public_no: Number(o.public_no ?? 0),
            order_number: Number(o.order_number ?? 0),
            status: String(o.status ?? ""),
            payment_status: String(o.payment_status ?? ""),
            total_amount: Number(o.total_amount ?? 0),
            currency: String(o.currency ?? "SAR"),
            created_at: String(o.created_at ?? ""),
          }));

        setState({ kind: "ready", orders });
      } catch (e: any) {
        if (!alive) return;

        setState({
          kind: "error",
          status: 500,
          error: e?.message ? String(e.message) : "UNHANDLED",
        });
      }
    }

    void run();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <RequireCustomer>
      <AccountMobileLayout active="orders" title="الطلبات">
        {state.kind === "loading" ? (
          <div className="mk-maccount-state">جاري تحميل الطلبات...</div>
        ) : state.kind === "unauth" ? (
          <div className="mk-maccount-state">
            لازم تسجل دخول عشان تشوف الطلبات.
          </div>
        ) : state.kind === "error" ? (
          <div className="mk-maccount-state">
            <div className="mk-maccount-state__title">
              حصل خطأ أثناء جلب الطلبات
            </div>

            <div className="mk-maccount-state__sub">
              {state.error} ({state.status})
            </div>

            <button
              type="button"
              onClick={() => router.push("/account")}
              className="mk-maccount-state__btn"
            >
              الرجوع للحساب
            </button>
          </div>
        ) : (
          <MobileOrdersList
            orders={state.orders}
            onOpenReview={(order) => setReviewOrder(order)}
          />
        )}

        <MobileOrderReviewSheet
          open={!!reviewOrder}
          order={reviewOrder}
          onClose={() => setReviewOrder(null)}
        />
      </AccountMobileLayout>
    </RequireCustomer>
  );
}