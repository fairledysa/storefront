// FILE: apps/storefront/src/app/checkout/page.tsx

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";

import CheckoutHeader from "./_components/CheckoutHeader";
import CheckoutFlow from "./_components/CheckoutFlow";
import CheckoutSummarySlot from "./_components/CheckoutSummarySlot";
import CompleteProfileGate from "./_components/CompleteProfileGate";
import CheckoutUiLock from "./_components/CheckoutUiLock";

import { getOrdersDb } from "@/data/db/orders-db.server";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { verifySession } from "@/lib/auth/session";
import { getStoreMaintenanceSettings } from "@/data/store/maintenance";
import { renderMalakMaintenancePage } from "@/themes/malak/screens/maintenance/render-maintenance-page";
import {
  buildCartSummary,
  type CartSummaryOut,
} from "@/app/(store)/api/checkout/lib/summary";

export const dynamic = "force-dynamic";

type CheckoutInitialState = {
  address_id: string | null;
  shipping_id: string | null;
  payment_method: string | null;
};

type CheckoutPageState = {
  hasItems: boolean;
  state: CheckoutInitialState;
  summary: CartSummaryOut | null;
};

async function getCustomerIdFromSession() {
  const jar = await cookies();
  const token = jar.get("elyaia_session")?.value || "";

  if (!token) return null;

  try {
    const session: any = await verifySession(token);
    return session?.customer_id ? String(session.customer_id) : null;
  } catch {
    return null;
  }
}

async function getOpenCartCheckoutState(
  storeId: string,
  customerId: string,
): Promise<CheckoutPageState> {
  const sb: any = await getOrdersDb(storeId);

  const emptyState: CheckoutInitialState = {
    address_id: null,
    shipping_id: null,
    payment_method: null,
  };

  const cartR = await sb
    .from("carts")
    .select("id,address_id,shipping_id,payment_method,item_count")
    .eq("store_id", storeId)
    .eq("user_id", customerId)
    .eq("status", "open")
    .limit(1)
    .maybeSingle();

  if (cartR.error) throw new Error(cartR.error.message);

  const cartId = cartR.data?.id ? String(cartR.data.id) : "";

  if (!cartId) {
    return {
      hasItems: false,
      state: emptyState,
      summary: null,
    };
  }

  const state: CheckoutInitialState = {
    address_id: cartR.data.address_id ? String(cartR.data.address_id) : null,
    shipping_id: cartR.data.shipping_id ? String(cartR.data.shipping_id) : null,
    payment_method: cartR.data.payment_method
      ? String(cartR.data.payment_method)
      : null,
  };

  let hasItems = Number(cartR.data.item_count ?? 0) > 0;

  /*
   * حماية من item_count لو كان قديم أو غير محدث.
   * لا نفحص cart_items إلا إذا item_count طلع صفر.
   */
  if (!hasItems) {
    const itemsR = await sb
      .from("cart_items")
      .select("id", { count: "exact", head: true })
      .eq("cart_id", cartId);

    if (itemsR.error) throw new Error(itemsR.error.message);

    hasItems = Number(itemsR.count ?? 0) > 0;
  }

  if (!hasItems) {
    return {
      hasItems: false,
      state,
      summary: null,
    };
  }

  let summary: CartSummaryOut | null = null;

  try {
    summary = await buildCartSummary({
      store_id: storeId,
      cart_id: cartId,
    });

    if (Array.isArray(summary.items) && summary.items.length === 0) {
      return {
        hasItems: false,
        state,
        summary: null,
      };
    }
  } catch (error) {
    /*
     * لا نكسر صفحة الدفع إذا فشل بناء الملخص الأولي.
     * OrderSummary سيعمل fallback ويطلب /api/checkout/prepare.
     */
    console.error("[checkout] initial summary failed", error);
  }

  return {
    hasItems: true,
    state,
    summary,
  };
}

function CheckoutUnavailableState() {
  return (
    <main className="co-page">
      <section className="co-container co-unavailable-wrap">
        <div className="co-empty-card">
          <div className="co-empty-card__head">
            <div className="co-eyebrow">إتمام الطلب</div>
            <h1>تعذر متابعة الدفع</h1>
          </div>

          <div className="co-empty-card__body">
            <div className="co-alert co-alert--warning">
              بعض المنتجات في طلبك لم تعد متاحة، أو تم إخفاؤها من المتجر، لذلك لا
              يمكن إكمال عملية الدفع بهذه السلة.
            </div>

            <div className="co-note">
              قد يكون السبب أحد الحالات التالية:
              <div className="co-note__list">
                <div>• تم إخفاء المنتج من الإدارة.</div>
                <div>• المنتج لم يعد متاحًا في الويب.</div>
                <div>• نفدت الكمية أثناء وجودك في صفحة الدفع.</div>
              </div>
            </div>

            <div className="co-actions-row">
              <Link href="/cart" className="co-btn co-btn--dark">
                العودة إلى سلة التسوق
              </Link>

              <Link href="/" className="co-btn co-btn--light">
                متابعة التسوق
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default async function CheckoutPage() {
  const ctx = await resolveStoreContext();

  if (!ctx.store) return notFound();

  const maintenance = await getStoreMaintenanceSettings(ctx.store.id);

  if (maintenance.enabled) {
    return await renderMalakMaintenancePage({
      ctx,
      settings: maintenance,
    });
  }

  const customerId = await getCustomerIdFromSession();

  if (!customerId) {
    redirect("/cart?auth=1");
  }

  const cartState = await getOpenCartCheckoutState(ctx.store.id, customerId);

  return (
    <>
      <CheckoutHeader storeName={ctx.store.name} logoUrl={ctx.store.logo_url} />
      <CheckoutUiLock />

      {!cartState.hasItems ? (
        <CheckoutUnavailableState />
      ) : (
        <main className="co-page">
          <div className="co-container">
            <CompleteProfileGate />
            <CheckoutSummarySlot initialSummary={cartState.summary} />

            <section className="co-checkout-area">
              <CheckoutFlow initialState={cartState.state} />
            </section>
          </div>
        </main>
      )}

      <footer className="co-footer">
        دفع آمن ومشفّر — راجع بياناتك قبل تأكيد الطلب.
      </footer>
    </>
  );
}