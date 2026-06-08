// FILE: apps/storefront/src/app/checkout/[token]/page.tsx

import { createHash } from "crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, CreditCard, Package, ShieldCheck, ShoppingCart } from "lucide-react";

import CheckoutHeader from "../_components/CheckoutHeader";
import CheckoutUiLock from "../_components/CheckoutUiLock";
import PaymentMethodsPanel, {
  type PaymentOption,
} from "../_components/PaymentMethodsPanel";

import { getOrdersDb } from "@/data/db/orders-db.server";
import { getStoreDb } from "@/data/db/store-db.server";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageProps = {
  params?: Promise<{ token?: string }> | { token?: string };
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
};

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
  selected_option_value_ids?: any;
};

type ProductMediaRow = {
  product_id?: string | null;
  original_url?: string | null;
  thumbnail_url?: string | null;
  url?: string | null;
  is_default?: boolean | null;
  is_primary?: boolean | null;
  sort_order?: number | string | null;
  media_kind?: string | null;
};

type PaymentSessionRow = {
  id: string;
  store_id: string;
  order_id: string;
  purpose?: string | null;
  amount_due?: number | string | null;
  currency?: string | null;
  status?: string | null;
  expires_at?: string | null;
  paid_at?: string | null;
  metadata?: any;
  created_at?: string | null;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "إتمام الدفع",
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
    } catch {}
  }

  return {};
}

function safeArray(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function firstValue(...values: any[]) {
  for (const value of values) {
    if (value !== null && value !== undefined && s(value) !== "") return value;
  }

  return null;
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
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

  if (!value) return "دفع إلكتروني";
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

function readAdminFinancial(order: any) {
  const snapshot = safeObject(order?.shipping_snapshot);

  return safeObject(
    snapshot.admin_financial ||
      snapshot.adminFinancial ||
      snapshot.order_edit_financial ||
      snapshot.orderEditFinancial,
  );
}

function calculatePaymentState(order: any) {
  const currency = s(order?.currency) || "SAR";
  const paymentStatus = s(order?.payment_status).toLowerCase();
  const currentTotal = round2(order?.total_amount);

  const financial = readAdminFinancial(order);
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

  const netPaid = Math.max(
    0,
    round2(paidReference - walletRefunded + walletUsed),
  );

  const dueForPaidOrder =
    paymentStatus === "paid" && hasFinancial && paidReference > 0
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

function orderDisplayNo(order: any) {
  return (
    s(order?.public_no) ||
    s(order?.order_number) ||
    s(order?.invoice_no) ||
    "طلب"
  );
}

function resolveEffectiveAmountDue(args: {
  sessionAmountDue: unknown;
  calculatedAmountDue: unknown;
}) {
  const sessionAmount = Math.max(0, round2(args.sessionAmountDue));
  const calculatedAmount = Math.max(0, round2(args.calculatedAmountDue));

  if (sessionAmount > 0 && calculatedAmount > 0) {
    return Math.min(sessionAmount, calculatedAmount);
  }

  return calculatedAmount;
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

function mediaScore(row: ProductMediaRow) {
  const primary = row.is_default || row.is_primary ? 0 : 1000;
  return primary + n(row.sort_order);
}

function pickMediaUrl(rows: ProductMediaRow[]) {
  const sorted = rows
    .filter((row) => {
      const kind = s(row.media_kind);
      if (!kind) return true;
      return kind === "image";
    })
    .slice()
    .sort((a, b) => mediaScore(a) - mediaScore(b));

  const row = sorted[0];

  return s(row?.thumbnail_url) || s(row?.original_url) || s(row?.url) || "";
}

async function loadImageMap(args: {
  storeDb: any;
  storeId: string;
  items: OrderItemRow[];
}) {
  const productIds = Array.from(
    new Set(args.items.map((item) => s(item.product_id)).filter(Boolean)),
  );

  const imageMap = new Map<string, string>();

  if (!productIds.length) return imageMap;

  const mediaR = await args.storeDb
    .from("product_media")
    .select(
      "product_id,original_url,thumbnail_url,url,is_default,is_primary,sort_order,media_kind",
    )
    .eq("store_id", args.storeId)
    .in("product_id", productIds);

  if (mediaR.error || !Array.isArray(mediaR.data)) return imageMap;

  const grouped = new Map<string, ProductMediaRow[]>();

  for (const row of mediaR.data as ProductMediaRow[]) {
    const productId = s(row.product_id);
    if (!productId) continue;

    const list = grouped.get(productId) ?? [];
    list.push(row);
    grouped.set(productId, list);
  }

  for (const [productId, rows] of grouped.entries()) {
    const image = pickMediaUrl(rows);
    if (image) imageMap.set(productId, image);
  }

  return imageMap;
}

function ErrorState({
  title,
  message,
  storeName,
  logoUrl,
}: {
  title: string;
  message: string;
  storeName: string;
  logoUrl?: string | null;
}) {
  return (
    <>
      <CheckoutHeader
        storeName={storeName}
        logoUrl={logoUrl}
        backHref="/"
        titleLabel="إتمام الدفع"
        breadcrumbBaseHref="/"
        breadcrumbBaseLabel="الرئيسية"
        breadcrumbCurrentLabel="دفع الطلب"
      />
      <CheckoutUiLock />

      <main className="co-page">
        <section className="co-container co-unavailable-wrap">
          <div className="co-empty-card">
            <div className="co-empty-card__head">
              <div className="co-eyebrow">إتمام الدفع</div>
              <h1>{title}</h1>
            </div>

            <div className="co-empty-card__body">
              <div className="co-alert co-alert--warning">{message}</div>

              <div className="co-actions-row">
                <Link href="/" className="co-btn co-btn--dark">
                  العودة للمتجر
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="co-footer">
        دفع آمن ومشفّر — راجع بياناتك قبل تأكيد الدفع.
      </footer>
    </>
  );
}

function CheckoutTokenSummary({
  orderNo,
  items,
  imageMap,
  currency,
  effectiveAmountDue,
  paymentState,
}: {
  orderNo: string;
  items: OrderItemRow[];
  imageMap: Map<string, string>;
  currency: string;
  effectiveAmountDue: number;
  paymentState: ReturnType<typeof calculatePaymentState>;
}) {
  const itemCount = getItemCount(items);
  const itemCountText = getItemCountText(itemCount);

  return (
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
                const image = imageMap.get(s(item.product_id)) || "";

                return (
                  <span key={s(item.id) || `${s(item.product_id)}-${index}`}>
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
          <details>
            <summary className="co-summary__details">تفاصيل الطلب</summary>

            <div className="co-drawer__body">
              <section className="co-drawer-section">
                <h3>المنتجات</h3>

                {items.length > 0 ? (
                  <div className="co-summary-items">
                    {items.map((item, index) => {
                      const qty = Math.max(1, Math.floor(n(item.qty) || 1));
                      const image = imageMap.get(s(item.product_id)) || "";

                      return (
                        <div
                          key={
                            s(item.id) ||
                            `${s(item.product_id)}-${s(item.sku)}-${index}`
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
                            <p>{selectedOptionsText(item.selected_options)}</p>
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
                    <strong dir="ltr">{money(effectiveAmountDue, currency)}</strong>
                  </div>
                </div>
              </section>
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}

function buildTokenPaymentOptions(args: {
  banks: BankAccount[];
  providers: ProviderMethod[];
}) {
  const options: PaymentOption[] = [];

  const primaryBank =
    args.banks.find((bank) => bank.is_primary) || args.banks[0] || null;

  if (primaryBank) {
    const bankName = s(primaryBank.bank_name) || "حساب بنكي";
    const holder = s(primaryBank.account_holder) || "اسم المستفيد غير محدد";
    const iban = s(primaryBank.iban) || "IBAN غير محدد";

    options.push({
      id: "bank_transfer",
      type: "bank_transfer",
      title: "تحويل بنكي",
      subtitle: "حوّل المبلغ إلى الحساب البنكي ثم أرسل الإيصال للمتجر",
      recommended: true,
      bank_details: {
        bank_name: bankName,
        account_holder: holder,
        iban,
        note: "بعد التحويل أرسل صورة الإيصال لخدمة العملاء مع رقم الطلب حتى يتم اعتماد الدفع.",
      },
    });
  }

  for (const provider of args.providers) {
    const code = s(provider.provider_code);
    if (!code) continue;

    options.push({
      id: `provider:${code}`,
      type: "provider",
      title: `الدفع الإلكتروني (${providerLabel(code)})`,
      subtitle: "سيتم ربط الدفع الإلكتروني بجلسة دفع الطلب في المرحلة التالية.",
      disabled: true,
      disabled_reason: "PAYMENT_PROVIDER_PENDING",
      disabled_message:
        "الدفع الإلكتروني لهذا النوع من روابط الدفع سيتم ربطه في المرحلة التالية.",
    });
  }

  return options;
}

export default async function CheckoutSessionPage(props: PageProps) {
  const ctx = await resolveStoreContext();

  if (!ctx.store?.id) return notFound();

  const params = ((await props.params) ?? {}) as { token?: string };
  const rawToken = s(params.token);

  const storeName = s(ctx.store.name) || "المتجر";
  const storeLogo = s(ctx.store.logo_url);

  if (!rawToken || rawToken.length < 32) {
    return (
      <ErrorState
        storeName={storeName}
        logoUrl={storeLogo}
        title="رابط الدفع غير صالح"
        message="الرابط ناقص أو لا يحتوي على رمز جلسة الدفع الصحيح."
      />
    );
  }

  const ordersDb: any = await getOrdersDb(ctx.store.id);
  const storeDb: any = await getStoreDb(ctx.store.id);
  const hash = tokenHash(rawToken);

  const sessionR = await ordersDb
    .from("order_payment_sessions")
    .select(
      [
        "id",
        "store_id",
        "order_id",
        "purpose",
        "amount_due",
        "currency",
        "status",
        "expires_at",
        "paid_at",
        "metadata",
        "created_at",
      ].join(","),
    )
    .eq("store_id", ctx.store.id)
    .eq("token_hash", hash)
    .maybeSingle();

  if (sessionR.error || !sessionR.data?.id) {
    return (
      <ErrorState
        storeName={storeName}
        logoUrl={storeLogo}
        title="رابط الدفع غير متوفر"
        message="لم نتمكن من العثور على جلسة الدفع أو أن الرابط غير صحيح."
      />
    );
  }

  const session = sessionR.data as PaymentSessionRow;
  const sessionStatus = s(session.status).toLowerCase();

  if (sessionStatus === "expired") {
    return (
      <ErrorState
        storeName={storeName}
        logoUrl={storeLogo}
        title="انتهت صلاحية رابط الدفع"
        message="رابط الدفع انتهت صلاحيته. تواصل مع المتجر للحصول على رابط جديد."
      />
    );
  }

  if (sessionStatus === "cancelled") {
    return (
      <ErrorState
        storeName={storeName}
        logoUrl={storeLogo}
        title="تم إلغاء رابط الدفع"
        message="هذا الرابط لم يعد صالحًا. تواصل مع المتجر للحصول على رابط جديد."
      />
    );
  }

  const orderR = await ordersDb
    .from("orders")
    .select(
      [
        "id",
        "store_id",
        "customer_id",
        "order_number",
        "public_no",
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
    .eq("id", session.order_id)
    .maybeSingle();

  if (orderR.error || !orderR.data?.id) {
    return (
      <ErrorState
        storeName={storeName}
        logoUrl={storeLogo}
        title="الطلب غير متوفر"
        message="جلسة الدفع موجودة لكن لم نتمكن من قراءة الطلب المرتبط بها."
      />
    );
  }

  const order = orderR.data;
  const paymentState = calculatePaymentState(order);
  const orderNo = orderDisplayNo(order);
  const currency = s(session.currency) || paymentState.currency || "SAR";

  const effectiveAmountDue =
    sessionStatus === "paid"
      ? 0
      : resolveEffectiveAmountDue({
          sessionAmountDue: session.amount_due,
          calculatedAmountDue: paymentState.amountDue,
        });

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

  const imageMap = await loadImageMap({
    storeDb,
    storeId: ctx.store.id,
    items,
  });

  const paymentOptions = buildTokenPaymentOptions({
    banks,
    providers,
  });

  const selectedPaymentId =
    paymentOptions.find((option) => !option.disabled)?.id || "";

  const hasAmountDue = effectiveAmountDue > 0 && sessionStatus !== "paid";
  const hasRefund = paymentState.kind === "refund_due";

  const pageTitle =
    sessionStatus === "paid" || (!hasAmountDue && !hasRefund)
      ? "تمت تسوية الطلب"
      : paymentState.kind === "difference_due"
        ? "دفع فرق الطلب"
        : paymentState.kind === "unpaid_order"
          ? "إكمال دفع الطلب"
          : "إتمام الدفع";

  return (
    <>
      <CheckoutHeader
        storeName={storeName}
        logoUrl={storeLogo}
        backHref="/"
        titleLabel="إتمام الدفع"
        breadcrumbBaseHref="/"
        breadcrumbBaseLabel="الرئيسية"
        breadcrumbCurrentLabel="دفع الطلب"
      />
      <CheckoutUiLock />

      <main className="co-page">
        <div className="co-container">
          <CheckoutTokenSummary
            orderNo={orderNo}
            items={items}
            imageMap={imageMap}
            currency={currency}
            effectiveAmountDue={effectiveAmountDue}
            paymentState={paymentState}
          />

          <section className="co-checkout-area">
            <section className="co-flow" data-active-step="payment">
              <div className="co-checkout-card">
                <div className="co-empty-card__head">
                  <div className="co-eyebrow">إتمام الدفع</div>
                  <h1>{pageTitle}</h1>
                </div>

                <div className="co-empty-card__body">
                  <div className="co-note">
                    هذا الرابط مخصص لدفع مبلغ مرتبط بطلب موجود، ولا ينشئ طلبًا
                    جديدًا.
                    <div className="co-note__list">
                      <div>• رقم الطلب: #{orderNo}</div>
                      <div>• حالة الدفع: {paymentStatusLabel(order.payment_status)}</div>
                      <div>• طريقة الطلب: {paymentMethodLabel(order.payment_method)}</div>
                    </div>
                  </div>

                  {hasAmountDue ? (
                    <div className="co-alert co-alert--warning">
                      المبلغ المطلوب دفعه الآن:{" "}
                      <strong dir="ltr">{money(effectiveAmountDue, currency)}</strong>
                    </div>
                  ) : hasRefund ? (
                    <div className="co-alert co-alert--warning">
                      لا يوجد مبلغ مطلوب دفعه من العميل. يوجد فرق لصالح العميل
                      تتم تسويته من لوحة المتجر.
                    </div>
                  ) : (
                    <div className="co-alert co-alert--success">
                      تمت تسوية هذا الطلب ماليًا ولا يوجد مبلغ متبقي حاليًا.
                    </div>
                  )}

                  {hasAmountDue ? (
                    <div className="co-step-shell is-active">
                      <div className="co-step-shell__head">
                        <span className="co-step-shell__icon">
                          <CreditCard size={18} />
                        </span>

                        <div className="co-step-shell__title">
                          <h3>الدفع</h3>
                          <p>اختر طريقة الدفع المناسبة</p>
                        </div>

                        <span className="co-step-shell__chip">الحالية</span>
                      </div>

                      <PaymentMethodsPanel
                        options={paymentOptions}
                        selectedId={selectedPaymentId}
                        disabled
                        showSelectedNote
                        emptyTitle="لا توجد طرق دفع متاحة"
                        emptyText="تواصل مع المتجر لإكمال الدفع."
                      />

                      <button
                        type="button"
                        className="co-payment-final-btn"
                        disabled
                      >
                        تأكيد الدفع الإلكتروني يتم ربطه في المرحلة التالية
                      </button>
                    </div>
                  ) : null}

                  {hasAmountDue ? (
                    <div className="co-secure-note">
                      <ShieldCheck size={15} />
                      دفع آمن ومشفّر
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          </section>
        </div>
      </main>

      <footer className="co-footer">
        دفع آمن ومشفّر — راجع بياناتك قبل تأكيد الدفع.
      </footer>
    </>
  );
}