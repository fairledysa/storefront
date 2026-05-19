// FILE: apps/storefront/src/app/checkout/page.tsx

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";

import CheckoutHeader from "./_components/CheckoutHeader";
import CheckoutFlow from "./_components/CheckoutFlow";
import CheckoutSummarySlot from "./_components/CheckoutSummarySlot";
import CompleteProfileGate from "./_components/CompleteProfileGate";
import CheckoutUiLock from "./_components/CheckoutUiLock";

import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { verifySession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/data/store/supabase.server";
import { getStoreMaintenanceSettings } from "@/data/store/maintenance";
import { renderMalakMaintenancePage } from "@/themes/malak/screens/maintenance/render-maintenance-page";
export const dynamic = "force-dynamic";

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

async function hasOpenCartItems(storeId: string, customerId: string) {
  const sb: any = supabaseAdmin();

  const cartR = await sb
    .from("carts")
    .select("id")
    .eq("store_id", storeId)
    .eq("user_id", customerId)
    .eq("status", "open")
    .limit(1)
    .maybeSingle();

  if (cartR.error) {
    throw new Error(cartR.error.message);
  }

  const cartId = cartR.data?.id ? String(cartR.data.id) : null;
  if (!cartId) return false;

  const itemsR = await sb
    .from("cart_items")
    .select("id", { count: "exact", head: true })
    .eq("cart_id", cartId);

  if (itemsR.error) {
    throw new Error(itemsR.error.message);
  }

  return Number(itemsR.count ?? 0) > 0;
}

function CheckoutUnavailableState() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8 lg:py-14">
      <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.08)] sm:rounded-[30px]">
        <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-5 sm:px-6">
          <div className="text-xs font-extrabold text-zinc-500">
            إتمام الطلب
          </div>

          <h1 className="mt-1 text-2xl font-black tracking-tight text-zinc-950">
            تعذر متابعة الدفع
          </h1>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-900">
            بعض المنتجات في طلبك لم تعد متاحة، أو تم إخفاؤها من المتجر، لذلك لا
            يمكن إكمال عملية الدفع بهذه السلة.
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm leading-7 text-zinc-700">
            قد يكون السبب أحد الحالات التالية:
            <div className="mt-2 space-y-1">
              <div>• تم إخفاء المنتج من الإدارة.</div>
              <div>• المنتج لم يعد متاحًا في الويب.</div>
              <div>• نفدت الكمية أثناء وجودك في صفحة الدفع.</div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/cart"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-extrabold text-white transition hover:bg-zinc-800"
            >
              العودة إلى سلة التسوق
            </Link>

            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white px-5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50"
            >
              متابعة التسوق
            </Link>
          </div>
        </div>
      </div>
    </section>
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

  const hasItems = await hasOpenCartItems(ctx.store.id, customerId);

  return (
    <>
      <CheckoutHeader storeName={ctx.store.name} logoUrl={ctx.store.logo_url} />
      <CheckoutUiLock />

      {!hasItems ? (
        <CheckoutUnavailableState />
      ) : (
        <main
          className={[
            "mx-auto w-full max-w-[1320px]",
            "px-2.5 pt-3 sm:px-4 sm:pt-4",
            "pb-[calc(9rem+env(safe-area-inset-bottom))]",
            "lg:px-4 lg:pb-7 lg:pt-7",
          ].join(" ")}
        >
          <div
            className={[
              "w-full",
              "lg:rounded-[34px] lg:border lg:border-zinc-200 lg:bg-[#fffefa]",
              "lg:p-5 lg:shadow-[0_28px_90px_rgba(15,23,42,0.09)]",
            ].join(" ")}
          >
            <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12 lg:gap-5">
              <section className="space-y-3.5 lg:col-span-8 lg:space-y-4">
                <CompleteProfileGate />
                <CheckoutFlow />
              </section>

              <aside className="lg:col-span-4">
                <CheckoutSummarySlot />
              </aside>
            </div>
          </div>
        </main>
      )}

      <footer className="hidden py-6 lg:block">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs leading-6 text-zinc-500">
          تجربة دفع آمنة وسريعة — راجع بياناتك قبل تأكيد الطلب.
        </div>
      </footer>
    </>
  );
}