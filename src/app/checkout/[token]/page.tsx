// FILE: apps/storefront/src/app/checkout/[token]/page.tsx

import { createHash, randomUUID } from "crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
} from "lucide-react";

import CheckoutHeader from "../_components/CheckoutHeader";
import CheckoutUiLock from "../_components/CheckoutUiLock";
import CheckoutTokenSummary from "../_components/CheckoutTokenSummary";
import PaymentMethodsPanel, {
  type PaymentOption,
} from "../_components/PaymentMethodsPanel";

import { getOrdersDb } from "@/data/db/orders-db.server";
import { getStoreDb } from "@/data/db/store-db.server";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

type PageProps = {
  params?: Promise<{ token?: string }> | { token?: string };
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
  image_url?: string | null;
  is_default?: boolean | null;
  is_primary?: boolean | null;
  sort_order?: number | string | null;
  media_kind?: string | null;
};

type ProductImageRow = {
  id?: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  card_image_url?: string | null;
  metadata?: any;
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

type OrderPublicTokenRow = {
  id?: string | null;
  store_id?: string | null;
  public_token?: string | null;
  public_no?: string | number | null;
  order_number?: string | number | null;
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

function readSearchParam(searchParams: SP, key: string) {
  const value = searchParams[key];

  if (Array.isArray(value)) return s(value[0]);
  return s(value);
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

  if (sessionAmount > 0) return sessionAmount;

  return calculatedAmount;
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

  return (
    s(row?.thumbnail_url) ||
    s(row?.original_url) ||
    s(row?.image_url) ||
    s(row?.url) ||
    ""
  );
}

function pickProductImageUrl(row: ProductImageRow | null | undefined) {
  const metadata = safeObject(row?.metadata);

  return (
    s(row?.thumbnail_url) ||
    s(row?.card_image_url) ||
    s(row?.image_url) ||
    s(metadata.thumbnail_url) ||
    s(metadata.thumbnailUrl) ||
    s(metadata.cardImageUrl) ||
    s(metadata.image_url) ||
    s(metadata.imageUrl) ||
    ""
  );
}

async function loadProductMediaRows(args: {
  storeDb: any;
  storeId: string;
  productIds: string[];
}) {
  const selects = [
    "product_id,thumbnail_url,original_url,is_default,sort_order",
    "product_id,original_url,is_default,sort_order",
    "product_id,thumbnail_url,original_url,is_default,is_primary,sort_order",
    "product_id,thumbnail_url,original_url,url,is_default,is_primary,sort_order,media_kind",
    "product_id,url,is_primary,sort_order",
  ];

  for (const select of selects) {
    const mediaR = await args.storeDb
      .from("product_media")
      .select(select)
      .eq("store_id", args.storeId)
      .in("product_id", args.productIds);

    if (!mediaR.error && Array.isArray(mediaR.data)) {
      return mediaR.data as ProductMediaRow[];
    }
  }

  return [];
}

async function loadProductImageRows(args: {
  storeDb: any;
  storeId: string;
  productIds: string[];
}) {
  const selects = [
    "id,thumbnail_url,image_url,metadata",
    "id,image_url,metadata",
    "id,thumbnail_url,metadata",
    "id,card_image_url,thumbnail_url,image_url,metadata",
  ];

  for (const select of selects) {
    const productsR = await args.storeDb
      .from("products")
      .select(select)
      .eq("store_id", args.storeId)
      .in("id", args.productIds);

    if (!productsR.error && Array.isArray(productsR.data)) {
      return productsR.data as ProductImageRow[];
    }
  }

  return [];
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

  const mediaRows = await loadProductMediaRows({
    storeDb: args.storeDb,
    storeId: args.storeId,
    productIds,
  });

  if (mediaRows.length > 0) {
    const grouped = new Map<string, ProductMediaRow[]>();

    for (const row of mediaRows) {
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
  }

  const missingProductIds = productIds.filter((productId) => {
    return !imageMap.get(productId);
  });

  if (missingProductIds.length > 0) {
    const productRows = await loadProductImageRows({
      storeDb: args.storeDb,
      storeId: args.storeId,
      productIds: missingProductIds,
    });

    for (const row of productRows) {
      const productId = s(row.id);
      if (!productId || imageMap.has(productId)) continue;

      const image = pickProductImageUrl(row);
      if (image) imageMap.set(productId, image);
    }
  }

  return imageMap;
}

async function ensureOrderPublicToken(args: {
  ordersDb: any;
  storeId: string;
  orderId: string;
}) {
  const orderR = await args.ordersDb
    .from("orders")
    .select("id,store_id,public_token,public_no,order_number")
    .eq("store_id", args.storeId)
    .eq("id", args.orderId)
    .maybeSingle();

  if (orderR.error || !orderR.data?.id) {
    return "";
  }

  const currentToken = s(orderR.data.public_token);

  if (currentToken) return currentToken;

  const nextToken = randomUUID().replace(/-/g, "");

  const updateR = await args.ordersDb
    .from("orders")
    .update({
      public_token: nextToken,
      updated_at: new Date().toISOString(),
    })
    .eq("store_id", args.storeId)
    .eq("id", args.orderId)
    .select("id,public_token")
    .maybeSingle();

  if (updateR.error || !updateR.data?.public_token) {
    return "";
  }

  return s(updateR.data.public_token);
}

async function submitBankTransferPayment(formData: FormData) {
  "use server";

  const rawToken = s(formData.get("token"));
  const payerName = s(formData.get("payer_name"));
  const transferReference = s(formData.get("transfer_reference"));

  if (!rawToken || rawToken.length < 32) {
    redirect("/");
  }

  const ctx = await resolveStoreContext();

  if (!ctx.store?.id) {
    redirect("/");
  }

  const ordersDb: any = await getOrdersDb(ctx.store.id);
  const hash = tokenHash(rawToken);

  const sessionR = await ordersDb
    .from("order_payment_sessions")
    .select("id,store_id,order_id,status,metadata")
    .eq("store_id", ctx.store.id)
    .eq("token_hash", hash)
    .maybeSingle();

  if (sessionR.error || !sessionR.data?.id) {
    redirect(`/checkout/${encodeURIComponent(rawToken)}?error=not_found`);
  }

  const session = sessionR.data as PaymentSessionRow;
  const status = s(session.status).toLowerCase();

  if (status === "paid" || status === "expired" || status === "cancelled") {
    const fallbackPublicToken = await ensureOrderPublicToken({
      ordersDb,
      storeId: ctx.store.id,
      orderId: s(session.order_id),
    });

    if (fallbackPublicToken) {
      redirect(
        `/thankyou/${encodeURIComponent(
          fallbackPublicToken,
        )}?payment_submitted=1&payment_session=${encodeURIComponent(
          s(session.id),
        )}`,
      );
    }

    redirect(`/checkout/${encodeURIComponent(rawToken)}`);
  }

  const metadata = safeObject(session.metadata);
  const submissions = safeArray(metadata.payment_submissions);

  const submittedAt = new Date().toISOString();

  const nextSubmission = {
    type: "bank_transfer",
    submitted_at: submittedAt,
    payer_name: payerName,
    transfer_reference: transferReference,
  };

  await ordersDb
    .from("order_payment_sessions")
    .update({
      metadata: {
        ...metadata,
        customer_payment_status: "pending_merchant_review",
        bank_transfer: nextSubmission,
        payment_submissions: [...submissions, nextSubmission],
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.id)
    .eq("store_id", ctx.store.id);

  const orderPublicToken = await ensureOrderPublicToken({
    ordersDb,
    storeId: ctx.store.id,
    orderId: s(session.order_id),
  });

  if (orderPublicToken) {
    redirect(
      `/thankyou/${encodeURIComponent(
        orderPublicToken,
      )}?payment_submitted=1&payment_session=${encodeURIComponent(s(session.id))}`,
    );
  }

  redirect(`/checkout/${encodeURIComponent(rawToken)}?submitted=1`);
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
              <div className="co-alert co-alert--warning">
                <AlertTriangle size={17} />
                {message}
              </div>

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
      subtitle: "حوّل المبلغ إلى الحساب البنكي ثم أرسل طلب اعتماد الدفع",
      recommended: true,
      bank_details: {
        bank_name: bankName,
        account_holder: holder,
        iban,
        note: "بعد التحويل أرسل طلب اعتماد الدفع، وسيتم مراجعة العملية من المتجر.",
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
    });
  }

  return options;
}

function BankTransferConfirmForm({
  rawToken,
  selectedPaymentId,
  submitted,
}: {
  rawToken: string;
  selectedPaymentId: string;
  submitted: boolean;
}) {
  if (submitted) {
    return (
      <div className="co-alert co-alert--success">
        <CheckCircle2 size={17} />
        تم إرسال طلب اعتماد التحويل. سيقوم المتجر بمراجعته وتحديث حالة الطلب.
      </div>
    );
  }

  if (selectedPaymentId !== "bank_transfer") return null;

  return (
    <form action={submitBankTransferPayment}>
      <input type="hidden" name="token" value={rawToken} />

      <div className="co-drawer-section">
        <h3>معلومات بعد التحويل</h3>

        <div className="co-coupon-form">
          <input
            name="payer_name"
            placeholder="اسم صاحب الحساب الذي تم التحويل منه"
            autoComplete="name"
          />
        </div>

        <div className="co-coupon-form">
          <input
            name="transfer_reference"
            placeholder="رقم العملية أو مرجع التحويل - اختياري"
            dir="ltr"
          />
        </div>

        <div className="co-alert co-alert--warning">
          لا يتم اعتماد الطلب تلقائيًا بعد الإرسال. سيتم مراجعته من المتجر أولًا.
        </div>
      </div>

      <button type="submit" className="co-payment-final-btn">
        إرسال طلب اعتماد التحويل
      </button>
    </form>
  );
}

export default async function CheckoutSessionPage(props: PageProps) {
  const ctx = await resolveStoreContext();

  if (!ctx.store?.id) return notFound();

  const params = ((await props.params) ?? {}) as { token?: string };
  const searchParams = ((await props.searchParams) ?? {}) as SP;

  const rawToken = s(params.token);
  const submittedFromQuery = readSearchParam(searchParams, "submitted") === "1";

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
  const sessionMetadata = safeObject(session.metadata);
  const bankSubmission = safeObject(sessionMetadata.bank_transfer);

  const submitted =
    submittedFromQuery ||
    s(sessionMetadata.customer_payment_status) === "pending_merchant_review" ||
    Boolean(s(bankSubmission.submitted_at));

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

  const imageByProduct = Object.fromEntries(imageMap.entries());

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
            imageByProduct={imageByProduct}
            currency={currency}
            effectiveAmountDue={effectiveAmountDue}
            paymentState={{
              currentTotal: paymentState.currentTotal,
              paidReference: paymentState.paidReference,
              walletRefunded: paymentState.walletRefunded,
              walletUsed: paymentState.walletUsed,
            }}
          />

          <section className="co-checkout-area">
            <section className="co-flow" data-active-step="payment">
              <div className="co-checkout-card">
                <div className="co-empty-card__head">
                  <div className="co-eyebrow">إتمام الدفع</div>
                  <h1>{pageTitle}</h1>
                </div>

                <div className="co-empty-card__body">
                  {hasAmountDue ? (
                    <div className="co-alert co-alert--warning">
                      المبلغ المطلوب دفعه الآن:{" "}
                      <strong dir="ltr">
                        {money(effectiveAmountDue, currency)}
                      </strong>
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
                          <p>
                            رقم الطلب #{orderNo} —{" "}
                            {paymentStatusLabel(order.payment_status)} —{" "}
                            {paymentMethodLabel(order.payment_method)}
                          </p>
                        </div>

                        <span className="co-step-shell__chip">الحالية</span>
                      </div>

                      <PaymentMethodsPanel
                        options={paymentOptions}
                        selectedId={selectedPaymentId}
                        showSelectedNote
                        emptyTitle="لا توجد طرق دفع متاحة"
                        emptyText="تواصل مع المتجر لإكمال الدفع."
                      />

                      <BankTransferConfirmForm
                        rawToken={rawToken}
                        selectedPaymentId={selectedPaymentId}
                        submitted={submitted}
                      />
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