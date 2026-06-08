// FILE: apps/storefront/src/app/(store)/pay/order/[publicNo]/page.tsx

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getOrdersDb } from "@/data/db/orders-db.server";
import { getStoreDb } from "@/data/db/store-db.server";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

type PageProps = {
  params?: Promise<{ publicNo?: string }> | { publicNo?: string };
  searchParams?: Promise<SP> | SP;
};

type BankAccount = {
  id?: string | null;
  bank_name?: string | null;
  account_holder?: string | null;
  iban?: string | null;
  is_primary?: boolean | null;
  status?: string | null;
};

type ProviderMethod = {
  id?: string | null;
  provider_code?: string | null;
  enabled?: boolean | null;
  status?: string | null;
  sort_order?: number | null;
};

type OrderItemRow = {
  id?: string | null;
  product_id?: string | null;
  name?: string | null;
  sku?: string | null;
  qty?: number | string | null;
  currency?: string | null;
  unit_price?: number | string | null;
  total_price?: number | string | null;
  selected_options?: any;
};

type ProductImageRow = {
  product_id?: string | null;
  original_url?: string | null;
  thumbnail_url?: string | null;
  is_default?: boolean | null;
  sort_order?: number | null;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "دفع الطلب",
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}

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

function safeObject(value: any): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      //
    }
  }

  return {};
}

function safeArray(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function firstValue(...values: any[]) {
  for (const value of values) {
    if (value !== null && value !== undefined && s(value) !== "") {
      return value;
    }
  }

  return null;
}

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return s(value[0]);
  return s(value);
}

function parsePublicNo(value: unknown) {
  const raw = s(value).replace(/[^\d]/g, "");
  const num = Number.parseInt(raw, 10);

  return Number.isFinite(num) && num > 0 ? num : 0;
}

function money(amount: unknown, currency = "SAR") {
  const value = round2(amount);

  return `${currency} ${new Intl.NumberFormat("en-SA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

function paymentMethodLabel(value: unknown) {
  const method = s(value).toLowerCase();

  if (!method) return "غير محدد";
  if (method === "cod") return "الدفع عند الاستلام";
  if (method === "bank_transfer") return "تحويل بنكي";
  if (method.includes("tamara")) return "تمارا";
  if (method.includes("tabby")) return "تابي";
  if (method.startsWith("provider:")) {
    return `دفع إلكتروني - ${method.replace("provider:", "")}`;
  }

  return s(value) || "طريقة دفع";
}

function paymentStatusLabel(value: unknown) {
  const status = s(value).toLowerCase();

  if (status === "paid") return "مدفوع";
  if (status === "unpaid") return "غير مدفوع";
  if (status === "failed") return "فشل الدفع";
  if (status === "refunded") return "تم الاسترجاع";

  return s(value) || "غير محدد";
}

function providerLabel(code: unknown) {
  const value = s(code).toLowerCase();

  if (!value) return "مزود دفع";
  if (value.includes("tamara")) return "تمارا";
  if (value.includes("tabby")) return "تابي";
  if (value.includes("moyasar")) return "ميسّر";
  if (value.includes("hyperpay")) return "HyperPay";
  if (value.includes("stripe")) return "Stripe";
  if (value.includes("tap")) return "Tap";

  return s(code);
}

function selectedOptionsText(value: any) {
  const rows = safeArray(value);

  const parts = rows
    .map((row: any) => {
      const name = s(row?.name);
      const val = s(row?.value);

      if (name && val) return `${name}: ${val}`;
      if (val) return val;

      return "";
    })
    .filter(Boolean);

  return parts.join("، ");
}

function readAdminFinancial(snapshot: any) {
  const root = safeObject(snapshot);

  return safeObject(
    root.admin_financial ||
      root.adminFinancial ||
      root.order_edit_financial ||
      root.orderEditFinancial,
  );
}

function calculatePaymentState(order: any) {
  const currency = s(order?.currency) || "SAR";
  const paymentStatus = s(order?.payment_status).toLowerCase();
  const currentTotal = round2(order?.total_amount);

  const financial = readAdminFinancial(order?.shipping_snapshot);
  const hasFinancial = Object.keys(financial).length > 0;

  const paidReference = Math.max(
    0,
    round2(financial.paid_total_reference_order_amount),
  );

  const walletRefunded = Math.max(
    0,
    round2(financial.wallet_refunded_order_amount),
  );

  const walletUsed = Math.max(
    0,
    round2(
      firstValue(
        financial.wallet_used_order_amount,
        financial.wallet_debited_order_amount,
        financial.wallet_charged_order_amount,
        0,
      ),
    ),
  );

  const netPaid = Math.max(0, round2(paidReference - walletRefunded + walletUsed));

  const dueForPaidOrder =
    hasFinancial && paidReference > 0
      ? Math.max(0, round2(currentTotal - netPaid))
      : 0;

  const dueForUnpaidOrder = Math.max(0, round2(currentTotal - walletUsed));

  const amountDue =
    paymentStatus === "paid" ? dueForPaidOrder : dueForUnpaidOrder;

  const refundable =
    paymentStatus === "paid" && hasFinancial
      ? Math.max(0, round2(netPaid - currentTotal))
      : 0;

  const kind =
    paymentStatus === "paid"
      ? amountDue > 0
        ? "difference_due"
        : refundable > 0
          ? "refund_due"
          : "settled"
      : amountDue > 0
        ? "unpaid_order"
        : "settled";

  return {
    kind,
    currency,
    paymentStatus,
    currentTotal,
    paidReference,
    walletRefunded,
    walletUsed,
    netPaid,
    amountDue,
    refundable,
    hasFinancial,
  };
}

function orderDisplayNo(order: any, fallback: string) {
  return (
    s(order?.public_no) ||
    s(order?.order_number) ||
    s(order?.invoice_no) ||
    fallback
  );
}

function imageUrlFromRows(rows: ProductImageRow[]) {
  const sorted = rows.slice().sort((a, b) => {
    const aDefault = a?.is_default ? 0 : 1000;
    const bDefault = b?.is_default ? 0 : 1000;

    if (aDefault !== bDefault) return aDefault - bDefault;

    return Number(a?.sort_order ?? 0) - Number(b?.sort_order ?? 0);
  });

  const first = sorted[0];

  return s(first?.thumbnail_url) || s(first?.original_url) || "";
}

function ErrorState({
  title,
  message,
  storeName,
}: {
  title: string;
  message: string;
  storeName: string;
}) {
  return (
    <main dir="rtl" className="min-h-screen bg-zinc-50 text-zinc-950">
      <section className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-10">
        <div className="w-full rounded-[28px] border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-950 text-xl font-black text-white">
            !
          </div>

          <p className="mb-2 text-sm font-bold text-zinc-500">{storeName}</p>

          <h1 className="text-2xl font-black text-zinc-950">{title}</h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-zinc-500">
            {message}
          </p>

          <Link
            href="/"
            className="mt-7 inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-6 text-sm font-black text-white"
          >
            العودة للمتجر
          </Link>
        </div>
      </section>
    </main>
  );
}

function StatusPill({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "neutral" | "danger";
  children: React.ReactNode;
}) {
  const classes =
    tone === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "danger"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-zinc-200 bg-zinc-50 text-zinc-600";

  return (
    <span
      className={[
        "inline-flex h-8 items-center rounded-full border px-3 text-xs font-black",
        classes,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function BankAccountCard({ bank }: { bank: BankAccount }) {
  const bankName = s(bank.bank_name) || "حساب بنكي";
  const holder = s(bank.account_holder) || "اسم المستفيد غير محدد";
  const iban = s(bank.iban) || "IBAN غير محدد";

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-zinc-950">{bankName}</h3>
          <p className="mt-1 text-sm font-semibold text-zinc-500">{holder}</p>
        </div>

        {bank.is_primary ? (
          <span className="rounded-full bg-[#faf4e1] px-3 py-1 text-xs font-black text-[#8a641f]">
            أساسي
          </span>
        ) : null}
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4">
        <p className="mb-1 text-xs font-bold text-zinc-500">IBAN</p>
        <p dir="ltr" className="break-all text-left text-sm font-black text-zinc-950">
          {iban}
        </p>
      </div>

      <p className="mt-3 text-xs leading-6 text-zinc-500">
        بعد التحويل، أرسل صورة الإيصال لخدمة العملاء مع رقم الطلب ليتم اعتماد
        الدفع.
      </p>
    </div>
  );
}

function OrderItemsMini({
  items,
  images,
  currency,
}: {
  items: OrderItemRow[];
  images: Map<string, string>;
  currency: string;
}) {
  if (!items.length) return null;

  return (
    <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-black text-zinc-950">منتجات الطلب</h2>
        <span className="text-xs font-bold text-zinc-500">
          {items.length} منتج
        </span>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => {
          const productId = s(item.product_id);
          const image = productId ? images.get(productId) || "" : "";
          const options = selectedOptionsText(item.selected_options);

          return (
            <div
              key={
  s(item.id) ||
  `${s(item.product_id)}-${s(item.sku)}-${s(item.name)}-${index}`
}
              className="flex gap-3 rounded-3xl border border-zinc-100 bg-zinc-50 p-3"
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white">
                {image ? (
                  <img
                    src={image}
                    alt={s(item.name) || "منتج"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-black text-zinc-300">
                    صورة
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="line-clamp-1 text-sm font-black text-zinc-950">
                  {s(item.name) || "منتج"}
                </div>

                {options ? (
                  <div className="mt-1 line-clamp-1 text-xs font-semibold text-zinc-500">
                    {options}
                  </div>
                ) : s(item.sku) ? (
                  <div className="mt-1 text-xs font-semibold text-zinc-500">
                    SKU: {s(item.sku)}
                  </div>
                ) : null}

                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-zinc-500">
                    الكمية: {n(item.qty) || 1}
                  </span>

                  <span dir="ltr" className="text-sm font-black text-zinc-950">
                    {money(item.total_price, s(item.currency) || currency)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default async function OrderPaymentPage(props: PageProps) {
  const ctx = await resolveStoreContext();

  if (!ctx.store?.id) return notFound();

  const params = ((await props.params) ?? {}) as { publicNo?: string };
  const searchParams = ((await props.searchParams) ?? {}) as SP;

  const publicNoText = s(params.publicNo);
  const publicNo = parsePublicNo(publicNoText);
  const token = firstParam(searchParams.token);

  const storeName = s(ctx.store.name) || "المتجر";
  const storeLogo = s(ctx.store.logo_url);

  if (!publicNo || !token) {
    return (
      <ErrorState
        storeName={storeName}
        title="رابط الدفع غير صالح"
        message="الرابط ناقص أو لا يحتوي على رمز التحقق الخاص بالطلب."
      />
    );
  }

  const ordersDb: any = await getOrdersDb(ctx.store.id);
  const storeDb: any = await getStoreDb(ctx.store.id);

  const orderR = await ordersDb
    .from("orders")
    .select(
      [
        "id",
        "store_id",
        "customer_id",
        "order_number",
        "public_no",
        "public_token",
        "invoice_no",
        "status",
        "base_status_key",
        "payment_status",
        "payment_method",
        "currency",
        "subtotal",
        "shipping_amount",
        "tax_amount",
        "discount_amount",
        "total_amount",
        "created_at",
        "updated_at",
        "shipping_address",
        "shipping_snapshot",
      ].join(","),
    )
    .eq("store_id", ctx.store.id)
    .eq("public_token", token)
    .or(`public_no.eq.${publicNo},order_number.eq.${publicNo}`)
    .maybeSingle();

  if (orderR.error || !orderR.data?.id) {
    return (
      <ErrorState
        storeName={storeName}
        title="رابط الدفع غير متوفر"
        message="لم نتمكن من العثور على الطلب أو أن رابط الدفع منتهي/غير صحيح."
      />
    );
  }

  const order = orderR.data;
  const paymentState = calculatePaymentState(order);
  const orderNo = orderDisplayNo(order, publicNoText);

  const [itemsR, banksR, providersR] = await Promise.all([
    ordersDb
      .from("order_items")
      .select(
        [
          "id",
          "order_id",
          "store_id",
          "product_id",
          "variant_id",
          "name",
          "sku",
          "qty",
          "currency",
          "unit_price",
          "total_price",
          "selected_options",
          "selected_option_value_ids",
          "created_at",
        ].join(","),
      )
      .eq("store_id", ctx.store.id)
      .eq("order_id", order.id)
      .order("created_at", { ascending: true }),

    storeDb
      .from("store_bank_accounts")
      .select("id,bank_name,account_holder,iban,is_primary,status")
      .eq("store_id", ctx.store.id)
      .eq("status", "active")
      .order("is_primary", { ascending: false })
      .order("updated_at", { ascending: false }),

    storeDb
      .from("store_payment_methods")
      .select("id,provider_code,enabled,status,sort_order")
      .eq("store_id", ctx.store.id)
      .eq("enabled", true)
      .eq("status", "active")
      .order("sort_order", { ascending: true }),
  ]);

  const items: OrderItemRow[] =
    !itemsR.error && Array.isArray(itemsR.data) ? itemsR.data : [];

  const banks: BankAccount[] =
    !banksR.error && Array.isArray(banksR.data) ? banksR.data : [];

  const providers: ProviderMethod[] =
    !providersR.error && Array.isArray(providersR.data) ? providersR.data : [];

  const productIds = Array.from(
    new Set(items.map((item) => s(item.product_id)).filter(Boolean)),
  );

  const mediaR =
    productIds.length > 0
      ? await storeDb
          .from("product_media")
          .select("product_id,original_url,thumbnail_url,is_default,sort_order")
          .eq("store_id", ctx.store.id)
          .in("product_id", productIds)
      : { data: [], error: null };

  const imagesByProduct = new Map<string, string>();

  if (!mediaR.error && Array.isArray(mediaR.data)) {
    const grouped = new Map<string, ProductImageRow[]>();

    for (const row of mediaR.data as ProductImageRow[]) {
      const productId = s(row.product_id);
      if (!productId) continue;

      const list = grouped.get(productId) ?? [];
      list.push(row);
      grouped.set(productId, list);
    }

    for (const [productId, rows] of grouped.entries()) {
      const image = imageUrlFromRows(rows);
      if (image) imagesByProduct.set(productId, image);
    }
  }

  const hasAmountDue = paymentState.amountDue > 0;
  const isDifferencePayment = paymentState.kind === "difference_due";
  const isUnpaidOrder = paymentState.kind === "unpaid_order";
  const isSettled = paymentState.kind === "settled";
  const hasRefund = paymentState.kind === "refund_due";

  const pageTitle = isDifferencePayment
    ? "دفع فرق الطلب"
    : isUnpaidOrder
      ? "إكمال دفع الطلب"
      : hasRefund
        ? "يوجد مبلغ مستحق للعميل"
        : "تمت تسوية الطلب";

  return (
    <main dir="rtl" className="min-h-screen bg-[#fafafa] text-zinc-950">
      <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
        <header className="mb-6 flex items-center justify-between gap-4 rounded-[28px] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
              {storeLogo ? (
                <img
                  src={storeLogo}
                  alt={storeName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-black text-zinc-400">
                  {storeName.slice(0, 1)}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-zinc-500">
                {storeName}
              </p>
              <h1 className="truncate text-lg font-black text-zinc-950 sm:text-2xl">
                {pageTitle}
              </h1>
            </div>
          </div>

          <Link
            href="/"
            className="hidden h-10 items-center justify-center rounded-2xl border border-zinc-200 px-4 text-sm font-black text-zinc-700 transition hover:border-zinc-950 sm:inline-flex"
          >
            العودة للمتجر
          </Link>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5">
            <section className="overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-sm">
              <div className="bg-gradient-to-l from-[#ecfaf5] via-white to-[#faf4e1] p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-zinc-500">
                      طلب رقم
                    </p>

                    <h2 dir="ltr" className="mt-1 text-3xl font-black text-zinc-950">
                      #{orderNo}
                    </h2>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <StatusPill tone={hasAmountDue ? "warn" : "ok"}>
                      {paymentStatusLabel(order.payment_status)}
                    </StatusPill>

                    <StatusPill tone="neutral">
                      {paymentMethodLabel(order.payment_method)}
                    </StatusPill>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 p-5 sm:grid-cols-2">
                <div className="rounded-3xl border border-zinc-100 bg-zinc-50 p-4">
                  <p className="text-xs font-bold text-zinc-500">
                    إجمالي الطلب الحالي
                  </p>
                  <p dir="ltr" className="mt-2 text-xl font-black text-zinc-950">
                    {money(paymentState.currentTotal, paymentState.currency)}
                  </p>
                </div>

                {paymentState.paidReference > 0 ? (
                  <div className="rounded-3xl border border-zinc-100 bg-zinc-50 p-4">
                    <p className="text-xs font-bold text-zinc-500">
                      المدفوع سابقًا
                    </p>
                    <p dir="ltr" className="mt-2 text-xl font-black text-zinc-950">
                      {money(paymentState.paidReference, paymentState.currency)}
                    </p>
                  </div>
                ) : null}

                {paymentState.walletRefunded > 0 ? (
                  <div className="rounded-3xl border border-zinc-100 bg-zinc-50 p-4">
                    <p className="text-xs font-bold text-zinc-500">
                      تم إرجاعه للمحفظة
                    </p>
                    <p dir="ltr" className="mt-2 text-xl font-black text-zinc-950">
                      {money(paymentState.walletRefunded, paymentState.currency)}
                    </p>
                  </div>
                ) : null}

                {paymentState.walletUsed > 0 ? (
                  <div className="rounded-3xl border border-zinc-100 bg-zinc-50 p-4">
                    <p className="text-xs font-bold text-zinc-500">
                      تم استخدامه من المحفظة
                    </p>
                    <p dir="ltr" className="mt-2 text-xl font-black text-zinc-950">
                      {money(paymentState.walletUsed, paymentState.currency)}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="border-t border-zinc-100 p-5">
                {hasAmountDue ? (
                  <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5">
                    <p className="text-sm font-black text-amber-700">
                      المبلغ المطلوب دفعه الآن
                    </p>

                    <p
                      dir="ltr"
                      className="mt-2 text-4xl font-black tracking-tight text-zinc-950"
                    >
                      {money(paymentState.amountDue, paymentState.currency)}
                    </p>

                    <p className="mt-3 text-sm leading-7 text-amber-800">
                      هذا المبلغ ناتج عن تعديل الطلب بعد إنشائه. دفع هذا المبلغ
                      يخص نفس الطلب ولا ينشئ طلبًا جديدًا.
                    </p>
                  </div>
                ) : hasRefund ? (
                  <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5">
                    <p className="text-sm font-black text-emerald-700">
                      يوجد مبلغ مستحق إرجاعه
                    </p>

                    <p
                      dir="ltr"
                      className="mt-2 text-4xl font-black tracking-tight text-zinc-950"
                    >
                      {money(paymentState.refundable, paymentState.currency)}
                    </p>

                    <p className="mt-3 text-sm leading-7 text-emerald-800">
                      لا يوجد مبلغ مطلوب دفعه من العميل. يوجد فرق لصالح العميل
                      تتم تسويته من لوحة المتجر.
                    </p>
                  </div>
                ) : isSettled ? (
                  <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5">
                    <p className="text-lg font-black text-emerald-700">
                      تمت تسوية الطلب ماليًا
                    </p>

                    <p className="mt-2 text-sm leading-7 text-emerald-800">
                      لا يوجد مبلغ متبقي على هذا الطلب حاليًا.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-[28px] border border-zinc-200 bg-zinc-50 p-5">
                    <p className="text-lg font-black text-zinc-700">
                      لا توجد عملية دفع مطلوبة
                    </p>
                  </div>
                )}
              </div>
            </section>

            {hasAmountDue ? (
              <section className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-lg font-black text-zinc-950">
                    اختر طريقة الدفع
                  </h2>
                  <p className="mt-1 text-sm leading-7 text-zinc-500">
                    استخدم إحدى الطرق التالية لتسوية المبلغ المتبقي على نفس
                    الطلب.
                  </p>
                </div>

                <div className="space-y-4">
                  {providers.length > 0 ? (
                    <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-base font-black text-zinc-950">
                            الدفع الإلكتروني
                          </h3>

                          <p className="mt-1 text-sm leading-7 text-zinc-500">
                            مزودات الدفع المفعلة في المتجر:
                          </p>
                        </div>

                        <StatusPill tone="neutral">قيد الربط للرابط</StatusPill>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {providers.map((provider) => (
                          <span
                            key={s(provider.id) || s(provider.provider_code)}
                            className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-700"
                          >
                            {providerLabel(provider.provider_code)}
                          </span>
                        ))}
                      </div>

                      <button
                        type="button"
                        disabled
                        className="mt-5 flex h-12 w-full cursor-not-allowed items-center justify-center rounded-2xl bg-zinc-200 px-5 text-sm font-black text-zinc-500"
                      >
                        الدفع الإلكتروني يحتاج Route إنشاء جلسة دفع للمبلغ
                        المتبقي
                      </button>
                    </div>
                  ) : null}

                  {banks.length > 0 ? (
                    <div>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="text-base font-black text-zinc-950">
                          التحويل البنكي
                        </h3>

                        <StatusPill tone="warn">متاح الآن</StatusPill>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {banks.map((bank, index) => (
                          <BankAccountCard
                            key={s(bank.id) || `${s(bank.iban)}-${index}`}
                            bank={bank}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {!providers.length && !banks.length ? (
                    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5">
                      <h3 className="text-base font-black text-rose-700">
                        لا توجد طريقة دفع متاحة
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-rose-700">
                        لا توجد حسابات بنكية أو مزودات دفع مفعلة لهذا المتجر
                        حاليًا.
                      </p>
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-5">
            <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-zinc-950">ملخص الدفع</h2>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-bold text-zinc-500">رقم الطلب</span>
                  <span dir="ltr" className="font-black text-zinc-950">
                    #{orderNo}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="font-bold text-zinc-500">حالة الدفع</span>
                  <span className="font-black text-zinc-950">
                    {paymentStatusLabel(order.payment_status)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="font-bold text-zinc-500">طريقة الدفع</span>
                  <span className="font-black text-zinc-950">
                    {paymentMethodLabel(order.payment_method)}
                  </span>
                </div>

                <div className="my-2 border-t border-zinc-100" />

                <div className="flex items-center justify-between gap-4">
                  <span className="font-bold text-zinc-500">إجمالي الطلب</span>
                  <span dir="ltr" className="font-black text-zinc-950">
                    {money(paymentState.currentTotal, paymentState.currency)}
                  </span>
                </div>

                {paymentState.paidReference > 0 ? (
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-bold text-zinc-500">
                      المدفوع سابقًا
                    </span>
                    <span dir="ltr" className="font-black text-zinc-950">
                      {money(paymentState.paidReference, paymentState.currency)}
                    </span>
                  </div>
                ) : null}

                {paymentState.walletRefunded > 0 ? (
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-bold text-zinc-500">
                      إرجاع للمحفظة
                    </span>
                    <span dir="ltr" className="font-black text-zinc-950">
                      {money(paymentState.walletRefunded, paymentState.currency)}
                    </span>
                  </div>
                ) : null}

                {paymentState.walletUsed > 0 ? (
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-bold text-zinc-500">
                      خصم من المحفظة
                    </span>
                    <span dir="ltr" className="font-black text-zinc-950">
                      {money(paymentState.walletUsed, paymentState.currency)}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="mt-5 rounded-3xl bg-zinc-950 p-5 text-white">
                <p className="text-sm font-bold text-zinc-300">
                  المبلغ المطلوب
                </p>

                <p dir="ltr" className="mt-2 text-3xl font-black">
                  {money(paymentState.amountDue, paymentState.currency)}
                </p>
              </div>
            </section>

            <OrderItemsMini
              items={items}
              images={imagesByProduct}
              currency={paymentState.currency}
            />
          </aside>
        </div>
      </section>
    </main>
  );
}