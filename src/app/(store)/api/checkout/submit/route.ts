// FILE: apps/storefront/src/app/(store)/api/checkout/submit/route.ts

import { NextResponse } from "next/server";
import { getOrdersDb } from "@/data/db/orders-db.server";
import {
  cartSessionCookie,
  getCartSessionId,
  getOrCreateOpenCart,
  getStoreIdOrThrow,
  buildLineKey,
} from "../../_cart/cart.server";
import {
  buildCartSummary,
  generateUniqueOrderPublicToken,
} from "../lib/summary";
import { copyCartOrderOptionsToOrder } from "../lib/order-options";
import { evaluateCodRestrictions } from "../lib/cod-restrictions";

export const dynamic = "force-dynamic";

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function round2(x: number) {
  return Math.round(x * 100) / 100;
}

function toStr(x: any) {
  return String(x ?? "").trim();
}

function uniqStr(arr: string[]) {
  return Array.from(new Set(arr.map(String).filter(Boolean)));
}

function shortId(id: string) {
  const s = String(id || "");
  return s.length > 8 ? s.slice(0, 8) : s;
}

function normalizeSelectedOptions(
  x: any,
): Array<{ name: string; value: string }> {
  if (!Array.isArray(x)) return [];

  const out: Array<{ name: string; value: string }> = [];

  for (const row of x) {
    const name = String(row?.name ?? "").trim();
    const value = String(row?.value ?? "").trim();
    if (name && value) out.push({ name, value });
  }

  return out;
}

function isUuid(x: string) {
  const s = String(x || "").trim();

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s,
  );
}

function isUniqueConstraintError(error: any) {
  const code = toStr(error?.code);
  const message = toStr(error?.message).toLowerCase();

  return (
    code === "23505" ||
    message.includes("duplicate key value violates unique constraint")
  );
}

function isDuplicateCartOrderError(error: any) {
  const code = toStr(error?.code);
  const text = [
    error?.message,
    error?.details,
    error?.hint,
    error?.constraint,
  ]
    .map((x) => toStr(x).toLowerCase())
    .join(" ");

  return (
    code === "23505" &&
    (text.includes("orders_unique_store_cart") ||
      text.includes("store_cart") ||
      text.includes("cart_id"))
  );
}

function stockFlag(value: any) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const v = value.trim().toLowerCase();

    if (["true", "1", "yes", "on", "active", "enabled"].includes(v)) {
      return true;
    }

    if (["false", "0", "no", "off", "inactive", "disabled"].includes(v)) {
      return false;
    }
  }

  return false;
}

function buildOrderPayload(order: any) {
  return {
    id: order.id,
    order_number: order.order_number,
    public_token: order.public_token,
    invoice_no: order.invoice_no,
    invoice_no_fmt: String(order.invoice_no ?? 0).padStart(7, "0"),
  };
}

function buildOrderSuccessResponse(args: {
  order: any;
  session_id: string;
  duplicate?: boolean;
}) {
  const res = NextResponse.json({
    ok: true,
    duplicate: Boolean(args.duplicate),
    order: buildOrderPayload(args.order),
  });

  res.cookies.set(cartSessionCookie(args.session_id));

  return res;
}

function buildOrderProcessingResponse(order: any) {
  return NextResponse.json(
    {
      ok: false,
      error: "ORDER_ALREADY_PROCESSING",
      message_ar:
        "طلبك قيد المعالجة الآن. انتظر لحظات ولا تضغط تأكيد الطلب مرة أخرى.",
      order: order ? buildOrderPayload(order) : null,
    },
    { status: 409 },
  );
}

function paymentValidationError(args: {
  error: string;
  message_ar: string;
  status?: number;
  extra?: Record<string, any>;
}) {
  return NextResponse.json(
    {
      ok: false,
      error: args.error,
      message_ar: args.message_ar,
      ...(args.extra ? { extra: args.extra } : {}),
    },
    { status: args.status ?? 400 },
  );
}

function normalizePaymentMethodId(value: any) {
  return toStr(value).toLowerCase();
}

function isProviderPaymentMethod(method: string) {
  return method.startsWith("provider:");
}

const BANK_TRANSFER_RECEIPT_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

function readProviderCode(method: string) {
  if (!isProviderPaymentMethod(method)) return "";
  return toStr(method.slice("provider:".length)).toLowerCase();
}

async function readExistingOrderForCart(args: {
  sb: any;
  store_id: string;
  cart_id: string;
}) {
  const { sb, store_id, cart_id } = args;

  const r = await sb
    .from("orders")
    .select(
      `
      id,
      order_number,
      public_token,
      invoice_no,
      stock_decremented_at,
      status,
      payment_status,
      created_at
    `,
    )
    .eq("store_id", store_id)
    .eq("cart_id", cart_id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (r.error) {
    throw new Error(r.error.message);
  }

  const rows = Array.isArray(r.data) ? r.data : [];
  if (!rows.length) return null;

  rows.sort((a: any, b: any) => {
    const aDone = a?.stock_decremented_at ? 1 : 0;
    const bDone = b?.stock_decremented_at ? 1 : 0;

    if (aDone !== bDone) return bDone - aDone;

    const at = new Date(a?.created_at ?? 0).getTime();
    const bt = new Date(b?.created_at ?? 0).getTime();

    return bt - at;
  });

  return rows[0] ?? null;
}

async function loadCartProductsSubtotal(args: {
  sb: any;
  storeId: string;
  cartId: string;
}) {
  const { data, error } = await args.sb
    .from("cart_items")
    .select("qty,unit_price")
    .eq("store_id", args.storeId)
    .eq("cart_id", args.cartId);

  if (error) throw new Error(error.message);

  let subtotal = 0;

  for (const item of data ?? []) {
    const qtyValue = Number(item?.qty ?? 1);
    const unitPriceValue = Number(item?.unit_price ?? 0);

    const qty = Math.max(
      1,
      Math.floor(Number.isFinite(qtyValue) ? qtyValue : 1),
    );

    const unitPrice = Math.max(
      0,
      Number.isFinite(unitPriceValue) ? unitPriceValue : 0,
    );

    subtotal += unitPrice * qty;
  }

  return round2(Math.max(0, subtotal));
}

function isDbEnabled(value: any) {
  if (value === true) return true;
  if (value === 1) return true;

  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return ["true", "1", "yes", "on", "active", "enabled"].includes(v);
  }

  return false;
}

async function validateCodPayment(args: {
  sb: any;
  store_id: string;
  cart: any;
}) {
  const { sb, store_id, cart } = args;

  const cartId = toStr(cart?.id);
  const shippingId = toStr(cart?.shipping_id);
  const customerId = toStr(cart?.user_id) || null;

  if (!shippingId) {
    return {
      ok: false as const,
      error: "PAYMENT_COD_NEEDS_SHIPPING",
      message_ar: "اختر شركة الشحن قبل الدفع عند الاستلام.",
      status: 400,
    };
  }

  if (!isUuid(shippingId)) {
    return {
      ok: false as const,
      error: "PAYMENT_INVALID_SHIPPING",
      message_ar: "طريقة الشحن غير صحيحة. اختر شركة الشحن مرة أخرى.",
      status: 400,
    };
  }

  const rateR = await sb
    .from("store_shipping_rates")
    .select(
      `
      id,
      store_id,
      store_shipping_carrier_id,
      cod_enabled,
      cod_fee_customer,
      currency,
      enabled,
      status
    `,
    )
    .eq("store_id", store_id)
    .eq("id", shippingId)
    .limit(1)
    .maybeSingle();

  if (rateR.error) {
    return {
      ok: false as const,
      error: "PAYMENT_SHIPPING_RATE_FAILED",
      message_ar: "تعذر التحقق من طريقة الشحن.",
      status: 500,
      debug: rateR.error.message,
    };
  }

  const rate = rateR.data;

  if (!rate?.id) {
    return {
      ok: false as const,
      error: "PAYMENT_SHIPPING_RATE_NOT_FOUND",
      message_ar: "طريقة الشحن غير متاحة. اختر شركة الشحن مرة أخرى.",
      status: 400,
    };
  }

  if (rate.enabled === false || toStr(rate.status || "active") !== "active") {
    return {
      ok: false as const,
      error: "PAYMENT_SHIPPING_RATE_DISABLED",
      message_ar: "طريقة الشحن الحالية غير مفعلة.",
      status: 400,
    };
  }

  if (!rate.cod_enabled) {
    return {
      ok: false as const,
      error: "PAYMENT_COD_DISABLED_FOR_RATE",
      message_ar: "الدفع عند الاستلام غير مفعل لطريقة الشحن الحالية.",
      status: 400,
    };
  }

  const carrierR = await sb
    .from("store_shipping_carriers")
    .select("id,type,enabled,is_enabled,status")
    .eq("store_id", store_id)
    .eq("id", String(rate.store_shipping_carrier_id))
    .limit(1)
    .maybeSingle();

  if (carrierR.error) {
    return {
      ok: false as const,
      error: "PAYMENT_SHIPPING_CARRIER_FAILED",
      message_ar: "تعذر التحقق من شركة الشحن.",
      status: 500,
      debug: carrierR.error.message,
    };
  }

  const carrier = carrierR.data;

  if (!carrier?.id) {
    return {
      ok: false as const,
      error: "PAYMENT_SHIPPING_CARRIER_NOT_FOUND",
      message_ar: "شركة الشحن غير متاحة. اختر شركة الشحن مرة أخرى.",
      status: 400,
    };
  }

  const carrierEnabled =
    isDbEnabled(carrier.enabled) || isDbEnabled(carrier.is_enabled);

  if (!carrierEnabled || toStr(carrier.status) !== "active") {
    return {
      ok: false as const,
      error: "PAYMENT_SHIPPING_CARRIER_DISABLED",
      message_ar: "شركة الشحن الحالية غير مفعلة.",
      status: 400,
    };
  }

  if (toStr(carrier.type) === "pickup") {
    return {
      ok: false as const,
      error: "PAYMENT_COD_NOT_AVAILABLE_FOR_PICKUP",
      message_ar: "الدفع عند الاستلام غير متاح مع الاستلام من الفرع.",
      status: 400,
    };
  }

  const cartSubtotal = await loadCartProductsSubtotal({
    sb,
    storeId: store_id,
    cartId,
  });

  const codRestrictions = await evaluateCodRestrictions({
    sb,
    storeId: store_id,
    cartId,
    cartSubtotal,
    customerId,
    toCartCurrency: (amount) => round2(n(amount)),
  });

  if (!codRestrictions.allowed) {
    return {
      ok: false as const,
      error: codRestrictions.reason || "PAYMENT_COD_RESTRICTED",
      message_ar: "الدفع عند الاستلام غير متاح لهذا الطلب.",
      status: 400,
      extra: {
        reason: codRestrictions.reason || null,
      },
    };
  }

  return {
    ok: true as const,
  };
}

async function validateBankTransferPayment(args: {
  sb: any;
  store_id: string;
}) {
  const r = await args.sb
    .from("store_bank_accounts")
    .select("id,status")
    .eq("store_id", args.store_id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (r.error) {
    return {
      ok: false as const,
      error: "PAYMENT_BANK_CHECK_FAILED",
      message_ar: "تعذر التحقق من التحويل البنكي.",
      status: 500,
      debug: r.error.message,
    };
  }

  if (!r.data?.id) {
    return {
      ok: false as const,
      error: "PAYMENT_BANK_NOT_AVAILABLE",
      message_ar: "التحويل البنكي غير متاح حاليًا.",
      status: 400,
    };
  }

  return {
    ok: true as const,
  };
}

async function validateBankTransferProof(args: {
  sb: any;
  store_id: string;
  value: any;
}) {
  const proof = args.value && typeof args.value === "object" ? args.value : {};

  const bankAccountId = toStr(proof.bankAccountId);
  const senderAccountName = toStr(proof.senderAccountName);
  const receiptUrl = toStr(proof.receiptUrl);
  const receiptFilename = toStr(proof.receiptFilename);
  const receiptMimeType = toStr(proof.receiptMimeType).toLowerCase();
  const receiptSizeBytes = Math.max(0, Math.floor(n(proof.receiptSizeBytes)));

  if (!bankAccountId || !isUuid(bankAccountId)) {
    return {
      ok: false as const,
      error: "BANK_TRANSFER_ACCOUNT_REQUIRED",
      message_ar: "اختر حساب التحويل البنكي قبل تأكيد الطلب.",
      status: 400,
    };
  }

  if (!senderAccountName) {
    return {
      ok: false as const,
      error: "BANK_TRANSFER_SENDER_REQUIRED",
      message_ar: "أدخل اسم صاحب الحساب الذي تم التحويل منه.",
      status: 400,
    };
  }

  if (!receiptUrl) {
    return {
      ok: false as const,
      error: "BANK_TRANSFER_RECEIPT_REQUIRED",
      message_ar: "ارفع صورة إيصال التحويل قبل تأكيد الطلب.",
      status: 400,
    };
  }

  if (!BANK_TRANSFER_RECEIPT_MIMES.has(receiptMimeType)) {
    return {
      ok: false as const,
      error: "BANK_TRANSFER_RECEIPT_INVALID_TYPE",
      message_ar: "صيغة إيصال التحويل غير مدعومة. الصيغ المسموحة: JPG أو PNG أو WEBP.",
      status: 400,
    };
  }

  if (receiptSizeBytes <= 0 || receiptSizeBytes > 10 * 1024 * 1024) {
    return {
      ok: false as const,
      error: "BANK_TRANSFER_RECEIPT_INVALID_SIZE",
      message_ar: "حجم إيصال التحويل غير صحيح أو يتجاوز الحد المسموح.",
      status: 400,
    };
  }

  const bankR = await args.sb
    .from("store_bank_accounts")
    .select("id,status")
    .eq("store_id", args.store_id)
    .eq("id", bankAccountId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (bankR.error) {
    return {
      ok: false as const,
      error: "BANK_TRANSFER_ACCOUNT_CHECK_FAILED",
      message_ar: "تعذر التحقق من حساب التحويل البنكي.",
      status: 500,
      debug: bankR.error.message,
    };
  }

  if (!bankR.data?.id) {
    return {
      ok: false as const,
      error: "BANK_TRANSFER_ACCOUNT_NOT_AVAILABLE",
      message_ar: "حساب التحويل البنكي المختار غير متاح.",
      status: 400,
    };
  }

  return {
    ok: true as const,
    proof: {
      bank_account_id: bankAccountId,
      sender_account_name: senderAccountName,
      receipt_url: receiptUrl,
      receipt_filename: receiptFilename || "receipt",
      receipt_mime_type: receiptMimeType,
      receipt_size_bytes: receiptSizeBytes,
    },
  };
}

async function validateProviderPayment(args: {
  sb: any;
  store_id: string;
  method: string;
}) {
  const providerCode = readProviderCode(args.method);

  if (!providerCode) {
    return {
      ok: false as const,
      error: "PAYMENT_PROVIDER_INVALID",
      message_ar: "طريقة الدفع الإلكتروني غير صحيحة.",
      status: 400,
    };
  }

  const r = await args.sb
    .from("store_payment_methods")
    .select("id,provider_code,enabled,status")
    .eq("store_id", args.store_id)
    .ilike("provider_code", providerCode)
    .limit(1)
    .maybeSingle();

  if (r.error) {
    return {
      ok: false as const,
      error: "PAYMENT_PROVIDER_CHECK_FAILED",
      message_ar: "تعذر التحقق من طريقة الدفع الإلكتروني.",
      status: 500,
      debug: r.error.message,
    };
  }

  const row = r.data;

  if (!row?.id || !row.enabled || toStr(row.status) !== "active") {
    return {
      ok: false as const,
      error: "PAYMENT_PROVIDER_NOT_AVAILABLE",
      message_ar: "طريقة الدفع الإلكتروني غير متاحة حاليًا.",
      status: 400,
    };
  }

  return {
    ok: true as const,
  };
}

async function validateSelectedPaymentMethod(args: {
  sb: any;
  store_id: string;
  cart: any;
  body_payment_method: string;
}) {
  const cartPaymentMethod = normalizePaymentMethodId(args.cart?.payment_method);
  const bodyPaymentMethod = normalizePaymentMethodId(args.body_payment_method);

  if (!cartPaymentMethod) {
    return {
      ok: false as const,
      error: "PAYMENT_METHOD_REQUIRED",
      message_ar: "اختر طريقة الدفع قبل إتمام الطلب.",
      status: 400,
    };
  }

  if (bodyPaymentMethod && bodyPaymentMethod !== cartPaymentMethod) {
    return {
      ok: false as const,
      error: "PAYMENT_METHOD_MISMATCH",
      message_ar:
        "طريقة الدفع المرسلة لا تطابق طريقة الدفع المعتمدة في الطلب. حدّث الصفحة وحاول مرة أخرى.",
      status: 400,
    };
  }

  if (cartPaymentMethod === "cod") {
    return await validateCodPayment({
      sb: args.sb,
      store_id: args.store_id,
      cart: args.cart,
    });
  }

  if (cartPaymentMethod === "bank_transfer") {
    return await validateBankTransferPayment({
      sb: args.sb,
      store_id: args.store_id,
    });
  }

  if (isProviderPaymentMethod(cartPaymentMethod)) {
    return await validateProviderPayment({
      sb: args.sb,
      store_id: args.store_id,
      method: cartPaymentMethod,
    });
  }

  return {
    ok: false as const,
    error: "PAYMENT_METHOD_NOT_ALLOWED",
    message_ar: "طريقة الدفع غير متاحة أو غير صحيحة.",
    status: 400,
  };
}

async function getInvoiceNoCandidate(
  sb: any,
  args: { store_id: string; attempt: number },
) {
  const { store_id, attempt } = args;

  if (attempt === 0) {
    const invR = await sb.rpc("next_invoice_no", { p_store_id: store_id });

    if (invR.error) {
      throw new Error(invR.error.message);
    }

    const invoice_no = Math.floor(n(invR.data));

    if (invoice_no > 0) {
      return invoice_no;
    }
  }

  const maxR = await sb
    .from("orders")
    .select("invoice_no")
    .eq("store_id", store_id)
    .order("invoice_no", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (maxR.error) {
    throw new Error(maxR.error.message);
  }

  const maxNo = Math.floor(n(maxR.data?.invoice_no));
  return Math.max(1, maxNo + 1);
}

async function insertOrderWithRetry(args: {
  sb: any;
  store_id: string;
  cart: any;
  summary: any;
  shipping_snapshot: any;
  shipping_address_final: any;
}): Promise<{ order: any; existing: boolean }> {
  const {
    sb,
    store_id,
    cart,
    summary,
    shipping_snapshot,
    shipping_address_final,
  } = args;

  let lastError: any = null;

  for (let attempt = 0; attempt < 12; attempt++) {
    const public_token = await generateUniqueOrderPublicToken({
      store_id,
      len: 6,
      tries: 30,
    });

    const invoice_no = await getInvoiceNoCandidate(sb, {
      store_id,
      attempt,
    });

    const orderIns = await sb
      .from("orders")
      .insert({
        store_id,
        cart_id: cart.id,
        customer_id: cart.user_id ? String(cart.user_id) : null,

        public_token,
        invoice_no,

        status: "pending",
        base_status_key: "pending_review",
        status_updated_at: new Date().toISOString(),

        currency: summary.currency,
        subtotal: summary.subtotal,
        discount_amount: summary.discount,
        shipping_amount: summary.shipping,
        tax_amount: summary.tax,
        total_amount: summary.total,

        payment_status: "unpaid",
        payment_method: cart.payment_method ?? null,

        address_id: cart.address_id ?? null,
        shipping_id: cart.shipping_id ?? null,
        shipping_carrier_id: shipping_snapshot?.carrier_id ?? null,

        shipping_address: shipping_address_final,
        shipping_snapshot,
      })
      .select("id,order_number,public_token,invoice_no,stock_decremented_at")
      .single();

    if (!orderIns.error && orderIns.data?.id) {
      return { order: orderIns.data, existing: false };
    }

    lastError = orderIns.error;

    if (isDuplicateCartOrderError(orderIns.error)) {
      const existingOrder = await readExistingOrderForCart({
        sb,
        store_id,
        cart_id: String(cart.id),
      });

      if (existingOrder?.id) {
        return { order: existingOrder, existing: true };
      }

      throw new Error("ORDER_ALREADY_PROCESSING");
    }

    if (isUniqueConstraintError(orderIns.error)) {
      continue;
    }

    throw new Error(orderIns.error?.message || "ORDER_INSERT_FAILED");
  }

  throw new Error(lastError?.message || "ORDER_INSERT_UNIQUE_RETRY_FAILED");
}

/* ------------------------- product visibility helpers ------------------------- */

function readMetaBool(meta: any, keys: string[]) {
  for (const key of keys) {
    const value = meta?.[key];

    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;

    if (typeof value === "string") {
      const v = value.trim().toLowerCase();
      if (v === "true" || v === "1") return true;
      if (v === "false" || v === "0") return false;
    }
  }

  return null;
}

function normalizeChannels(meta: any): string[] {
  const raw = Array.isArray(meta?.channels) ? meta.channels : null;
  if (!raw) return [];

  return raw
    .map((x: any) => String(x ?? "").trim().toLowerCase())
    .filter(Boolean);
}

function isProductVisibleInWeb(input: { status?: any; metadata?: any }) {
  const status = String(input.status ?? "").trim().toLowerCase();

  if (!status) return false;

  if (status === "hidden" || status === "draft" || status === "archived") {
    return false;
  }

  const hiddenMeta = readMetaBool(input.metadata, [
    "is_hidden",
    "hidden",
    "hide_product",
    "product_hidden",
  ]);

  if (hiddenMeta === true) return false;

  const channels = normalizeChannels(input.metadata);

  if (channels.length > 0 && !channels.includes("web")) {
    return false;
  }

  if (channels.length === 0) {
    return false;
  }

  return true;
}

async function cleanupHiddenProductsFromCart(args: {
  sb: any;
  store_id: string;
  cart_id: string;
}) {
  const { sb, store_id, cart_id } = args;

  const itemsR = await sb
    .from("cart_items")
    .select("id,product_id")
    .eq("cart_id", cart_id);

  if (itemsR.error) throw new Error(itemsR.error.message);

  const items = Array.isArray(itemsR.data) ? itemsR.data : [];
  if (!items.length) return;

  const productIds = Array.from(
    new Set(items.map((x: any) => String(x.product_id)).filter(Boolean)),
  );

  if (!productIds.length) return;

  const productsR = await sb
    .from("products")
    .select("id,status,metadata")
    .eq("store_id", store_id)
    .in("id", productIds);

  if (productsR.error) throw new Error(productsR.error.message);

  const visibleIds = new Set<string>();

  for (const row of Array.isArray(productsR.data) ? productsR.data : []) {
    if (
      isProductVisibleInWeb({
        status: row?.status,
        metadata: row?.metadata,
      })
    ) {
      visibleIds.add(String(row.id));
    }
  }

  const hiddenItemIds = items
    .filter((it: any) => !visibleIds.has(String(it.product_id)))
    .map((it: any) => String(it.id));

  if (!hiddenItemIds.length) return;

  const delR = await sb
    .from("cart_items")
    .delete()
    .eq("cart_id", cart_id)
    .in("id", hiddenItemIds);

  if (delR.error) throw new Error(delR.error.message);
}

/* ------------------------- stock error helpers ------------------------- */

type StockIssuePayload = {
  kind: "product" | "variant";
  product_id: string;
  variant_id: string | null;
  product_name: string;
  requested_qty: number;
  available_qty: number;
  action_url: string;
};

function parseOutOfStockDebug(debugMsg: string) {
  const s = String(debugMsg || "").trim();
  if (!s) return null;

  const m = s.match(
    /^OUT_OF_STOCK:(PRODUCT|VARIANT)\s+product=([^\s]+)(?:\s+variant=([^\s]+))?\s+qty=(\d+)/i,
  );

  if (!m) return null;

  return {
    kind: String(m[1]).toLowerCase() as "product" | "variant",
    product_id: String(m[2] || ""),
    variant_id: m[3] ? String(m[3]) : null,
    requested_qty: n(m[4]),
  };
}

async function buildStockIssuePayload(
  sb: any,
  debugMsg: string,
): Promise<StockIssuePayload | null> {
  const parsed = parseOutOfStockDebug(debugMsg);
  if (!parsed?.product_id) return null;

  const pR = await sb
    .from("products")
    .select("id,name")
    .eq("id", parsed.product_id)
    .limit(1)
    .maybeSingle();

  const product_name = toStr(pR.data?.name) || "هذا المنتج";

  if (parsed.kind === "variant" && parsed.variant_id) {
    const vR = await sb
      .from("product_variants")
      .select("id,stock_quantity,unlimited_quantity")
      .eq("id", parsed.variant_id)
      .limit(1)
      .maybeSingle();

    const available_qty = stockFlag(vR.data?.unlimited_quantity)
      ? 999999
      : Math.max(0, n(vR.data?.stock_quantity));

    return {
      kind: "variant",
      product_id: parsed.product_id,
      variant_id: parsed.variant_id,
      product_name,
      requested_qty: Math.max(1, parsed.requested_qty),
      available_qty,
      action_url: "/cart",
    };
  }

  const stockR = await sb
    .from("product_stock")
    .select("quantity,unlimited_quantity")
    .eq("product_id", parsed.product_id)
    .limit(1)
    .maybeSingle();

  const available_qty = stockFlag(stockR.data?.unlimited_quantity)
    ? 999999
    : Math.max(0, n(stockR.data?.quantity));

  return {
    kind: "product",
    product_id: parsed.product_id,
    variant_id: null,
    product_name,
    requested_qty: Math.max(1, parsed.requested_qty),
    available_qty,
    action_url: "/cart",
  };
}

function buildStockIssueMessageAr(issue: StockIssuePayload) {
  if (issue.available_qty <= 0) {
    return `المنتج "${issue.product_name}" نفدت كميته. حدّث حقيبة التسوق للمتابعة.`;
  }

  return `المنتج "${issue.product_name}" لم تعد كميته المتاحة كافية. المطلوب ${issue.requested_qty} والمتاح الآن ${issue.available_qty}. حدّث حقيبة التسوق للمتابعة.`;
}

/* ------------------------------- Metadata Utils ------------------------------ */

async function getProductMetaVariants(sb: any, product_id: string) {
  const pR = await sb
    .from("products")
    .select("id,metadata")
    .eq("id", product_id)
    .limit(1)
    .maybeSingle();

  if (pR.error) throw new Error(pR.error.message);

  const meta = pR.data?.metadata ?? null;
  const metaVariants = Array.isArray(meta?.variants) ? meta.variants : [];

  return metaVariants as any[];
}

/* ------------------------------- Variant Utils ------------------------------ */

async function resolveVariantIdFromOptions(
  sb: any,
  args: { product_id: string; selected_option_value_ids: string[] },
): Promise<string | null> {
  const selected = Array.isArray(args.selected_option_value_ids)
    ? args.selected_option_value_ids.map(String).filter(Boolean)
    : [];

  if (selected.length === 0) return null;

  if (selected.some((x) => !isUuid(x))) {
    return null;
  }

  const vR = await sb
    .from("product_variants")
    .select("id")
    .eq("product_id", args.product_id);

  if (vR.error) throw new Error(vR.error.message);

  const variants = Array.isArray(vR.data) ? vR.data : [];
  if (variants.length === 0) return null;

  const variantIds = variants.map((v: any) => String(v.id));

  const linksR = await sb
    .from("variant_option_values")
    .select("variant_id,option_value_id")
    .in("variant_id", variantIds);

  if (linksR.error) throw new Error(linksR.error.message);

  const links = Array.isArray(linksR.data) ? linksR.data : [];

  const map = new Map<string, Set<string>>();

  for (const row of links) {
    const vid = String(row.variant_id);
    const oid = String(row.option_value_id);

    if (!map.has(vid)) map.set(vid, new Set<string>());
    map.get(vid)!.add(oid);
  }

  const selectedSet = new Set(selected);

  for (const vid of variantIds) {
    const set = map.get(vid) ?? new Set<string>();
    if (set.size !== selectedSet.size) continue;

    let ok = true;

    for (const oid of selectedSet) {
      if (!set.has(String(oid))) {
        ok = false;
        break;
      }
    }

    if (ok) return String(vid);
  }

  return null;
}

async function resolveDefaultVariantId(sb: any, product_id: string) {
  const vR = await sb
    .from("product_variants")
    .select("id,is_default,created_at")
    .eq("product_id", product_id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (vR.error) throw new Error(vR.error.message);

  if (vR.data?.id) return String(vR.data.id);

  return null;
}

async function productHasVariants(sb: any, product_id: string) {
  const r = await sb
    .from("product_variants")
    .select("id", { count: "exact", head: true })
    .eq("product_id", product_id);

  if (r.error) throw new Error(r.error.message);

  if ((r.count ?? 0) > 0) return true;

  const metaVariants = await getProductMetaVariants(sb, product_id);
  return metaVariants.length > 0;
}

async function normalizeCartItemsVariants(sb: any, args: { cart_id: string }) {
  const itemsR = await sb
    .from("cart_items")
    .select("id,product_id,variant_id,qty,selected_option_value_ids,line_key")
    .eq("cart_id", args.cart_id);

  if (itemsR.error) throw new Error(itemsR.error.message);

  const items = Array.isArray(itemsR.data) ? itemsR.data : [];
  if (items.length === 0) return;

  for (const it of items) {
    const itemId = String(it.id);
    const product_id = String(it.product_id);
    const currentVariant = it.variant_id ? String(it.variant_id) : null;

    if (currentVariant) continue;

    const hasVariants = await productHasVariants(sb, product_id);
    if (!hasVariants) continue;

    const selected_option_value_ids = Array.isArray(
      it.selected_option_value_ids,
    )
      ? it.selected_option_value_ids.map(String).filter(Boolean)
      : [];

    let variant_id =
      selected_option_value_ids.length > 0
        ? await resolveVariantIdFromOptions(sb, {
            product_id,
            selected_option_value_ids,
          })
        : null;

    if (!variant_id) {
      variant_id = await resolveDefaultVariantId(sb, product_id);
    }

    if (!variant_id) {
      continue;
    }

    const new_line_key = buildLineKey({
      product_id,
      variant_id,
      selected_option_value_ids,
    });

    const otherR = await sb
      .from("cart_items")
      .select("id,qty")
      .eq("cart_id", args.cart_id)
      .eq("line_key", new_line_key)
      .limit(1)
      .maybeSingle();

    if (otherR.error) throw new Error(otherR.error.message);

    const otherId = otherR.data?.id ? String(otherR.data.id) : null;
    const otherQty = Math.max(0, Number(otherR.data?.qty ?? 0));
    const selfQty = Math.max(1, Number(it.qty ?? 1));

    if (otherId && otherId !== itemId) {
      const mergedQty = otherQty + selfQty;

      const upOther = await sb
        .from("cart_items")
        .update({ qty: mergedQty })
        .eq("id", otherId)
        .select("id")
        .single();

      if (upOther.error) throw new Error(upOther.error.message);

      const delOld = await sb.from("cart_items").delete().eq("id", itemId);
      if (delOld.error) throw new Error(delOld.error.message);

      continue;
    }

    const upSelf = await sb
      .from("cart_items")
      .update({
        variant_id,
        line_key: new_line_key,
      })
      .eq("id", itemId)
      .select("id")
      .single();

    if (upSelf.error) throw new Error(upSelf.error.message);
  }
}

/* ------------------------- address snapshot ------------------------- */

async function buildShippingAddressSnapshot(
  sb: any,
  args: { address_id: string },
) {
  const addrR = await sb
    .from("customer_addresses")
    .select(
      `
      id,
      label,
      recipient_name,
      phone_e164,
      address_line1,
      address_line2,
      postal_code,
      notes,
      country_id,
      city_id,
      district_id,
      ref_countries:country_id ( id, name_ar, iso2 ),
      ref_cities:city_id ( id, name_ar ),
      ref_districts:district_id ( id, name_ar )
    `,
    )
    .eq("id", args.address_id)
    .maybeSingle();

  if (addrR.error) throw new Error(addrR.error.message);

  const a = addrR.data;
  if (!a) return null;

  return {
    label: a.label ?? null,
    recipient_name: a.recipient_name ?? null,
    phone: a.phone_e164 ?? null,
    country: a.ref_countries?.name_ar ?? null,
    country_code: a.ref_countries?.iso2 ?? null,
    city: a.ref_cities?.name_ar ?? null,
    district: a.ref_districts?.name_ar ?? null,
    address_line1: a.address_line1 ?? null,
    address_line2: a.address_line2 ?? null,
    postal_code: a.postal_code ?? null,
    notes: a.notes ?? null,
  };
}

async function buildCustomerSnapshot(sb: any, args: { auth_user_id: string }) {
  const cR = await sb
    .from("customers")
    .select("full_name,email")
    .eq("auth_user_id", args.auth_user_id)
    .maybeSingle();

  if (cR.error) throw new Error(cR.error.message);

  const pR = await sb
    .from("user_identities")
    .select("phone_e164")
    .eq("user_id", args.auth_user_id)
    .maybeSingle();

  if (pR.error) throw new Error(pR.error.message);

  return {
    full_name: cR.data?.full_name ?? null,
    email: cR.data?.email ?? null,
    phone: pR.data?.phone_e164 ?? null,
  };
}

/* ------------------------- shipping snapshot ------------------------- */

async function buildShippingSnapshot(
  sb: any,
  args: { shipping_id: string | null | undefined; store_id: string },
) {
  const shippingId = String(args.shipping_id ?? "").trim();
  if (!shippingId) return null;

  if (!isUuid(shippingId)) {
    return {
      shipping_id: shippingId,
      rate_id: null,
      carrier_id: null,
      carrier_name: null,
      store_shipping_carrier_id: null,
      store_shipping_carrier_name: null,
      eta_text: null,
      pricing_type: null,
      merchant_cost: null,
      customer_price: null,
      cod_enabled: null,
      cod_fee_customer: null,
      cod_fee_include_tax: null,
      currency: null,
    };
  }

  const rateR = await sb
    .from("store_shipping_rates")
    .select(
      `
      id,
      store_id,
      store_shipping_carrier_id,
      pricing_type,
      merchant_cost,
      customer_price,
      eta_text,
      cod_enabled,
      cod_fee_customer,
      cod_fee_include_tax,
      currency
    `,
    )
    .eq("store_id", args.store_id)
    .eq("id", shippingId)
    .maybeSingle();

  if (rateR.error) throw new Error(rateR.error.message);

  const rate = rateR.data;

  if (!rate) {
    return {
      shipping_id: shippingId,
      rate_id: shippingId,
      carrier_id: null,
      carrier_name: null,
      store_shipping_carrier_id: null,
      store_shipping_carrier_name: null,
      eta_text: null,
      pricing_type: null,
      merchant_cost: null,
      customer_price: null,
      cod_enabled: null,
      cod_fee_customer: null,
      cod_fee_include_tax: null,
      currency: null,
    };
  }

  let storeCarrier: any = null;

  if (rate.store_shipping_carrier_id) {
    const scR = await sb
      .from("store_shipping_carriers")
      .select(
        `
        id,
        store_id,
        carrier_id,
        type,
        display_name,
        enabled,
        status
      `,
      )
      .eq("store_id", args.store_id)
      .eq("id", rate.store_shipping_carrier_id)
      .maybeSingle();

    if (scR.error) throw new Error(scR.error.message);
    storeCarrier = scR.data ?? null;
  }

  let platformCarrier: any = null;

  if (storeCarrier?.carrier_id) {
    const pcR = await sb
      .from("shipping_carriers")
      .select(
        `
        id,
        code,
        name,
        logo_url,
        provider_kind,
        status
      `,
      )
      .eq("id", storeCarrier.carrier_id)
      .maybeSingle();

    if (pcR.error) throw new Error(pcR.error.message);
    platformCarrier = pcR.data ?? null;
  }

  return {
    shipping_id: shippingId,
    rate_id: rate.id ?? null,
    eta_text: rate.eta_text ?? null,
    pricing_type: rate.pricing_type ?? null,
    merchant_cost: rate.merchant_cost ?? 0,
    customer_price: rate.customer_price ?? 0,
    cod_enabled: !!rate.cod_enabled,
    cod_fee_customer: rate.cod_fee_customer ?? 0,
    cod_fee_include_tax: !!rate.cod_fee_include_tax,
    currency: rate.currency ?? null,

    store_shipping_carrier_id: storeCarrier?.id ?? null,
    store_shipping_carrier_name: storeCarrier?.display_name ?? null,
    store_shipping_carrier_type: storeCarrier?.type ?? null,

    carrier_id: platformCarrier?.id ?? null,
    carrier_code: platformCarrier?.code ?? null,
    carrier_name: platformCarrier?.name ?? null,
    carrier_logo_url: platformCarrier?.logo_url ?? null,
    carrier_provider_kind: platformCarrier?.provider_kind ?? null,
  };
}

/* ------------------------- order options snapshot ------------------------- */

function readSnapshotObject(value: any): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  return {};
}

function readSnapshotArray(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function normalizeSummaryOrderOptionChoices(value: any) {
  return readSnapshotArray(value)
    .map((choice: any) => ({
      id: toStr(choice?.id),
      label: toStr(choice?.label),
      price_customer: round2(n(choice?.price_customer ?? choice?.priceCustomer)),
      priceCustomer: round2(n(choice?.price_customer ?? choice?.priceCustomer)),
    }))
    .filter((choice) => choice.label);
}

type SummaryOrderOptionSnapshotLine = {
  option_id: string;
  optionId: string;
  type: string;
  name: string;
  value: string | null;
  choice_ids: string[];
  choiceIds: string[];
  choices: any[];
  metadata: Record<string, any>;
  price_customer: number;
  priceCustomer: number;
  currency: string;
};

function normalizeSummaryOrderOptions(
  summary: any,
): SummaryOrderOptionSnapshotLine[] {
  const lines = Array.isArray(summary?.order_options)
    ? summary.order_options
    : Array.isArray(summary?.orderOptions)
      ? summary.orderOptions
      : [];

  return lines
    .map((row: any): SummaryOrderOptionSnapshotLine | null => {
      const optionId = toStr(row?.option_id ?? row?.optionId);
      const name = toStr(row?.name ?? row?.label ?? row?.option_name);

      if (!optionId || !name) return null;

      const price = round2(n(row?.price_customer ?? row?.priceCustomer));

      const choiceIds = Array.isArray(row?.choice_ids)
        ? row.choice_ids.map(String).filter(Boolean)
        : Array.isArray(row?.choiceIds)
          ? row.choiceIds.map(String).filter(Boolean)
          : [];

      const choices = Array.isArray(row?.choices)
        ? normalizeSummaryOrderOptionChoices(row.choices)
        : [];

      const metadata =
        row?.metadata &&
        typeof row.metadata === "object" &&
        !Array.isArray(row.metadata)
          ? row.metadata
          : {};

      return {
        option_id: optionId,
        optionId,
        type: toStr(row?.type ?? row?.option_type ?? row?.optionType),
        name,
        value: row?.value == null ? null : toStr(row.value),
        choice_ids: choiceIds,
        choiceIds,
        choices,
        metadata,
        price_customer: price,
        priceCustomer: price,
        currency: toStr(row?.currency ?? summary?.currency),
      };
    })
    .filter(
      (
        row: SummaryOrderOptionSnapshotLine | null,
      ): row is SummaryOrderOptionSnapshotLine => Boolean(row?.name),
    );
}

/* ------------------------- checkout financial snapshot ------------------------- */

function buildCheckoutFinancialSnapshot(summary: any) {
  const orderOptions: SummaryOrderOptionSnapshotLine[] =
    normalizeSummaryOrderOptions(summary);

  const orderOptionsFallbackFee = round2(
    orderOptions.reduce(
      (acc: number, row: SummaryOrderOptionSnapshotLine) =>
        acc + n(row.price_customer ?? row.priceCustomer),
      0,
    ),
  );

  const orderOptionsFee = round2(
    n(summary?.order_options_fee ?? summary?.orderOptionsFee) ||
      orderOptionsFallbackFee,
  );

  const orderOptionsBase = round2(
    n(summary?.order_options_base ?? summary?.orderOptionsBase) ||
      orderOptionsFee,
  );

  const orderOptionsTax = round2(
    n(summary?.order_options_tax ?? summary?.orderOptionsTax),
  );

  const orderOptionsTotal = round2(
    n(summary?.order_options_total ?? summary?.orderOptionsTotal) ||
      orderOptionsFee + orderOptionsTax,
  );

  const appliedOffers = Array.isArray(summary?.appliedSpecialOffers)
    ? summary.appliedSpecialOffers
    : Array.isArray(summary?.applied_special_offers)
      ? summary.applied_special_offers
      : [];

  const messages = Array.isArray(summary?.specialOfferMessages)
    ? summary.specialOfferMessages
    : Array.isArray(summary?.special_offer_messages)
      ? summary.special_offer_messages
      : [];

  const lineAdjustments = Array.isArray(summary?.lineAdjustments)
    ? summary.lineAdjustments
    : Array.isArray(summary?.specialOfferLineAdjustments)
      ? summary.specialOfferLineAdjustments
      : Array.isArray(summary?.special_offer_line_adjustments)
        ? summary.special_offer_line_adjustments
        : [];

  const specialOfferDiscount = round2(
    n(
      summary?.specialOfferDiscount ??
        summary?.specialOffersDiscount ??
        summary?.special_offer_discount ??
        summary?.special_offers_discount,
    ),
  );

  const specialOffersSnapshot = {
    appliedOffers,
    applied_offers: appliedOffers,
    lineAdjustments,
    line_adjustments: lineAdjustments,
    discount: specialOfferDiscount,
    messages,
  };

  return {
    currency: toStr(summary?.currency),
    currency_symbol: toStr(
      summary?.currency_symbol ?? summary?.currencySymbol ?? summary?.symbol,
    ),
    currency_decimals: Math.max(
      0,
      Math.floor(n(summary?.currency_decimals ?? summary?.decimal_digits ?? 2)),
    ),

    subtotal: round2(n(summary?.subtotal)),
    discount_amount: round2(n(summary?.discount)),

    product_tax: round2(n(summary?.product_tax ?? summary?.productTax)),

    shipping_amount: round2(n(summary?.shipping)),
    shipping_tax: round2(n(summary?.shipping_tax ?? summary?.shippingTax)),
    shipping_total: round2(n(summary?.shipping_total ?? summary?.shippingTotal)),

    payment_fee_amount: round2(n(summary?.payment_fee)),
    payment_fee_tax: round2(
      n(summary?.payment_fee_tax ?? summary?.paymentFeeTax),
    ),
    payment_fee_total: round2(
      n(summary?.payment_fee_total ?? summary?.paymentFeeTotal),
    ),

    order_options: orderOptions,
    orderOptions,

    order_options_fee: orderOptionsFee,
    orderOptionsFee: orderOptionsFee,

    order_options_base: orderOptionsBase,
    orderOptionsBase: orderOptionsBase,

    order_options_tax: orderOptionsTax,
    orderOptionsTax: orderOptionsTax,

    order_options_total: orderOptionsTotal,
    orderOptionsTotal: orderOptionsTotal,

    tax_amount: round2(n(summary?.tax)),
    total_amount: round2(n(summary?.total)),

    tax_enabled: Boolean(summary?.tax_enabled ?? summary?.taxEnabled),
    tax_label: toStr(summary?.tax_label ?? summary?.taxLabel) || "VAT",
    tax_rate: n(summary?.tax_rate ?? summary?.taxRate),

    prices_include_tax: Boolean(
      summary?.prices_include_tax ?? summary?.pricesIncludeTax,
    ),
    shipping_include_tax: Boolean(
      summary?.shipping_include_tax ?? summary?.shippingIncludeTax,
    ),
    payment_fee_include_tax: Boolean(
      summary?.payment_fee_include_tax ?? summary?.paymentFeeIncludeTax,
    ),

    payment_method: toStr(summary?.payment_method) || null,
    coupon: summary?.coupon ?? null,

    special_offers: specialOffersSnapshot,
    specialOffers: specialOffersSnapshot,
    special_offer_discount: specialOfferDiscount,
    specialOfferDiscount: specialOfferDiscount,
    special_offers_discount: specialOfferDiscount,
    specialOffersDiscount: specialOfferDiscount,
  };
}

function enrichShippingSnapshotWithSummary(args: {
  shipping_snapshot: any;
  summary: any;
}) {
  const base =
    args.shipping_snapshot &&
    typeof args.shipping_snapshot === "object" &&
    !Array.isArray(args.shipping_snapshot)
      ? args.shipping_snapshot
      : {};

  const checkout = buildCheckoutFinancialSnapshot(args.summary);

  return {
    ...base,

    checkout,

    shipping_amount: checkout.shipping_amount,
    shipping_tax: checkout.shipping_tax,
    shipping_total: checkout.shipping_total,
    shipping_include_tax: checkout.shipping_include_tax,

    payment_fee_amount: checkout.payment_fee_amount,
    payment_fee_tax: checkout.payment_fee_tax,
    payment_fee_total: checkout.payment_fee_total,
    payment_fee_include_tax: checkout.payment_fee_include_tax,

    order_options: checkout.order_options,
    orderOptions: checkout.orderOptions,

    order_options_fee: checkout.order_options_fee,
    orderOptionsFee: checkout.orderOptionsFee,

    order_options_base: checkout.order_options_base,
    orderOptionsBase: checkout.orderOptionsBase,

    order_options_tax: checkout.order_options_tax,
    orderOptionsTax: checkout.orderOptionsTax,

    order_options_total: checkout.order_options_total,
    orderOptionsTotal: checkout.orderOptionsTotal,

    product_tax: checkout.product_tax,
    tax_amount: checkout.tax_amount,
    tax_enabled: checkout.tax_enabled,
    tax_label: checkout.tax_label,
    tax_rate: checkout.tax_rate,
    prices_include_tax: checkout.prices_include_tax,

    subtotal: checkout.subtotal,
    discount_amount: checkout.discount_amount,
    total_amount: checkout.total_amount,

    special_offers: checkout.special_offers,
    specialOffers: checkout.specialOffers,
    special_offer_discount: checkout.special_offer_discount,
    specialOfferDiscount: checkout.specialOfferDiscount,
    special_offers_discount: checkout.special_offers_discount,
    specialOffersDiscount: checkout.specialOffersDiscount,
  };
}

/* ------------------------- SKU snapshot helpers ------------------------- */

async function loadVariantSkuMap(
  sb: any,
  variantIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const ids = uniqStr(variantIds).filter(isUuid);
  if (!ids.length) return map;

  const r = await sb.from("product_variants").select("id,sku").in("id", ids);

  if (r.error) throw new Error(r.error.message);

  const rows = Array.isArray(r.data) ? r.data : [];

  for (const row of rows) {
    const id = toStr(row?.id);
    const sku = toStr(row?.sku);

    if (id && sku) {
      map.set(id, sku);
    }
  }

  return map;
}

async function loadMetaVariantSkuMap(
  sb: any,
  productIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const ids = uniqStr(productIds).filter(Boolean);
  if (!ids.length) return map;

  const r = await sb.from("products").select("id,metadata").in("id", ids);

  if (r.error) throw new Error(r.error.message);

  const rows = Array.isArray(r.data) ? r.data : [];

  for (const row of rows) {
    const productId = toStr(row?.id);
    const variants = Array.isArray(row?.metadata?.variants)
      ? row.metadata.variants
      : [];

    for (const v of variants) {
      const variantId = toStr(v?.id);
      const sku = toStr(v?.sku) || toStr(v?.code) || toStr(v?.barcode) || "";

      if (productId && variantId && sku) {
        map.set(`${productId}::${variantId}`, sku);
      }
    }
  }

  return map;
}

async function loadProductMetaSkuMap(
  sb: any,
  productIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const ids = uniqStr(productIds).filter(Boolean);
  if (!ids.length) return map;

  const r = await sb.from("products").select("id,metadata").in("id", ids);

  if (r.error) throw new Error(r.error.message);

  const rows = Array.isArray(r.data) ? r.data : [];

  for (const row of rows) {
    const productId = toStr(row?.id);
    const sku =
      toStr(row?.metadata?.sku) ||
      toStr(row?.metadata?.code) ||
      toStr(row?.metadata?.barcode) ||
      "";

    if (productId && sku) {
      map.set(productId, sku);
    }
  }

  return map;
}

/* ------------------------- stock mode for order items ------------------------- */

type OrderItemStockMode = {
  originalVariantId: string | null;
  orderVariantId: string | null;
  stockMode: "variant" | "product";
};

async function loadProductStockMap(
  sb: any,
  productIds: string[],
): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  const ids = uniqStr(productIds);
  if (!ids.length) return map;

  const r = await sb
    .from("product_stock")
    .select("product_id,quantity,unlimited_quantity")
    .in("product_id", ids);

  if (r.error) throw new Error(r.error.message);

  for (const row of Array.isArray(r.data) ? r.data : []) {
    const productId = toStr(row?.product_id);
    if (productId) map.set(productId, row);
  }

  return map;
}

async function loadVariantStockMap(
  sb: any,
  variantIds: string[],
): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  const ids = uniqStr(variantIds).filter(isUuid);
  if (!ids.length) return map;

  const r = await sb
    .from("product_variants")
    .select("id,product_id,stock_quantity,unlimited_quantity")
    .in("id", ids);

  if (r.error) throw new Error(r.error.message);

  for (const row of Array.isArray(r.data) ? r.data : []) {
    const id = toStr(row?.id);
    if (id) map.set(id, row);
  }

  return map;
}

function productStockHasAvailable(row: any) {
  if (!row) return false;
  if (stockFlag(row?.unlimited_quantity)) return true;
  return n(row?.quantity) > 0;
}

function variantHasOwnAvailableStock(row: any) {
  if (!row) return false;
  if (stockFlag(row?.unlimited_quantity)) return true;
  return n(row?.stock_quantity) > 0;
}

async function buildOrderItemStockModeMap(
  sb: any,
  summaryItems: any[],
): Promise<Map<string, OrderItemStockMode>> {
  const items = Array.isArray(summaryItems) ? summaryItems : [];

  const productIds = items
    .map((it: any) => toStr(it?.product_id))
    .filter(Boolean);
  const variantIds = items
    .map((it: any) => toStr(it?.variant_id))
    .filter(Boolean);

  const [productStockMap, variantStockMap] = await Promise.all([
    loadProductStockMap(sb, productIds),
    loadVariantStockMap(sb, variantIds),
  ]);

  const map = new Map<string, OrderItemStockMode>();

  for (const item of items) {
    const itemId = toStr(item?.id);
    const productId = toStr(item?.product_id);
    const originalVariantId = toStr(item?.variant_id) || null;

    if (!itemId) continue;

    if (!originalVariantId) {
      map.set(itemId, {
        originalVariantId: null,
        orderVariantId: null,
        stockMode: "product",
      });
      continue;
    }

    if (!isUuid(originalVariantId)) {
      map.set(itemId, {
        originalVariantId,
        orderVariantId: null,
        stockMode: "product",
      });
      continue;
    }

    const variantStock = variantStockMap.get(originalVariantId);
    const productStock = productStockMap.get(productId);

    if (variantHasOwnAvailableStock(variantStock)) {
      map.set(itemId, {
        originalVariantId,
        orderVariantId: originalVariantId,
        stockMode: "variant",
      });
      continue;
    }

    if (productStockHasAvailable(productStock)) {
      map.set(itemId, {
        originalVariantId,
        orderVariantId: null,
        stockMode: "product",
      });
      continue;
    }

    map.set(itemId, {
      originalVariantId,
      orderVariantId: originalVariantId,
      stockMode: "variant",
    });
  }

  return map;
}

/* ---------------------------------- POST ---------------------------------- */

export async function POST(req: Request) {
  const store_id = await getStoreIdOrThrow();

  const sb: any = await Promise.resolve(getOrdersDb(store_id) as any);

  if (!sb || typeof sb.from !== "function") {
    return NextResponse.json(
      {
        ok: false,
        error: "ORDERS_DB_INVALID",
        message_ar: "اتصال قاعدة بيانات الطلبات غير صحيح.",
        debug: {
          typeof_getOrdersDb: typeof getOrdersDb,
          typeof_sb: typeof sb,
          typeof_sb_from: typeof sb?.from,
          keys: sb && typeof sb === "object" ? Object.keys(sb).slice(0, 20) : [],
        },
      },
      { status: 500 },
    );
  }

  const session_id = await getCartSessionId();
  const cart = await getOrCreateOpenCart({ store_id, session_id });

  const body = await req.json().catch(() => ({}));
  const bodyPaymentMethod = normalizePaymentMethodId(body?.payment_method);

  if (String(cart.status) !== "open") {
    return NextResponse.json(
      {
        ok: false,
        error: "CART_NOT_OPEN",
        message_ar: "السلة غير قابلة للدفع.",
      },
      { status: 400 },
    );
  }

  try {
    const existingOrder = await readExistingOrderForCart({
      sb,
      store_id,
      cart_id: String(cart.id),
    });

    if (existingOrder?.id) {
      if (existingOrder.stock_decremented_at) {
        return buildOrderSuccessResponse({
          order: existingOrder,
          session_id,
          duplicate: true,
        });
      }

      return buildOrderProcessingResponse(existingOrder);
    }
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "ORDER_DUPLICATE_CHECK_FAILED",
        message_ar: "تعذر التحقق من حالة الطلب. حاول مرة أخرى.",
        debug: toStr(e?.message),
      },
      { status: 500 },
    );
  }

  try {
    await normalizeCartItemsVariants(sb, { cart_id: cart.id });

    await cleanupHiddenProductsFromCart({
      sb,
      store_id,
      cart_id: String(cart.id),
    });
  } catch (e: any) {
    const msg = toStr(e?.message);

    if (msg === "CHECKOUT_VARIANT_REQUIRED") {
      return NextResponse.json(
        {
          ok: false,
          error: "VARIANT_REQUIRED",
          message_ar: "اختر خيارات المنتج قبل إتمام الطلب.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { ok: false, error: msg || "CART_NORMALIZE_FAILED" },
      { status: 500 },
    );
  }

  const summary = await buildCartSummary({ store_id, cart_id: cart.id });

  if (!summary.items.length) {
    return NextResponse.json(
      { ok: false, error: "CART_EMPTY", message_ar: "سلة المشتريات فارغة." },
      { status: 400 },
    );
  }

  try {
    const paymentCheck = await validateSelectedPaymentMethod({
      sb,
      store_id,
      cart,
      body_payment_method: bodyPaymentMethod,
    });

    if (!paymentCheck.ok) {
      const paymentExtra: Record<string, any> = {};

      if ("extra" in paymentCheck && paymentCheck.extra) {
        Object.assign(paymentExtra, paymentCheck.extra);
      }

      if ("debug" in paymentCheck && paymentCheck.debug) {
        paymentExtra.debug = paymentCheck.debug;
      }

      return paymentValidationError({
        error: paymentCheck.error,
        message_ar: paymentCheck.message_ar,
        status: paymentCheck.status,
        extra: Object.keys(paymentExtra).length > 0 ? paymentExtra : undefined,
      });
    }
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "PAYMENT_VALIDATION_FAILED",
        message_ar: "تعذر التحقق من طريقة الدفع. حاول مرة أخرى.",
        debug: toStr(e?.message),
      },
      { status: 500 },
    );
  }

  let bankTransferProof: any = null;

  if (normalizePaymentMethodId(cart?.payment_method) === "bank_transfer") {
    const proofCheck = await validateBankTransferProof({
      sb,
      store_id,
      value: body?.bankTransfer,
    });

    if (!proofCheck.ok) {
      return paymentValidationError({
        error: proofCheck.error,
        message_ar: proofCheck.message_ar,
        status: proofCheck.status,
        extra:
          "debug" in proofCheck && proofCheck.debug
            ? { debug: proofCheck.debug }
            : undefined,
      });
    }

    bankTransferProof = proofCheck.proof;
  }

  const ccR = await sb
    .from("cart_coupons")
    .select("coupon_id")
    .eq("store_id", store_id)
    .eq("cart_id", cart.id)
    .maybeSingle();

  if (ccR.error) {
    return NextResponse.json(
      { ok: false, error: ccR.error.message },
      { status: 500 },
    );
  }

  const coupon_id = ccR.data?.coupon_id ? String(ccR.data.coupon_id) : null;

  let shipping_address_snapshot: any = null;

  try {
    if (cart.address_id) {
      shipping_address_snapshot = await buildShippingAddressSnapshot(sb, {
        address_id: String(cart.address_id),
      });
    }
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "ADDRESS_SNAPSHOT_FAILED",
        debug: toStr(e?.message),
      },
      { status: 500 },
    );
  }

  let customer_snapshot: any = null;

  try {
    if (cart.user_id) {
      customer_snapshot = await buildCustomerSnapshot(sb, {
        auth_user_id: String(cart.user_id),
      });
    }
  } catch {
    customer_snapshot = null;
  }

  let shipping_snapshot: any = null;

  try {
    const rawShippingSnapshot = await buildShippingSnapshot(sb, {
      shipping_id: cart.shipping_id ?? null,
      store_id,
    });

    shipping_snapshot = enrichShippingSnapshotWithSummary({
      shipping_snapshot: rawShippingSnapshot,
      summary,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "SHIPPING_SNAPSHOT_FAILED",
        debug: toStr(e?.message),
      },
      { status: 500 },
    );
  }

  const shipping_address_final = shipping_address_snapshot
    ? {
        ...shipping_address_snapshot,
        customer: customer_snapshot,
      }
    : (body?.shipping_address ?? null);

  let order: any = null;

  try {
    const insertResult = await insertOrderWithRetry({
      sb,
      store_id,
      cart,
      summary,
      shipping_snapshot,
      shipping_address_final,
    });

    order = insertResult.order;

    if (insertResult.existing) {
      if (order?.stock_decremented_at) {
        return buildOrderSuccessResponse({
          order,
          session_id,
          duplicate: true,
        });
      }

      return buildOrderProcessingResponse(order);
    }
  } catch (e: any) {
    const msg = toStr(e?.message);

    if (msg === "ORDER_ALREADY_PROCESSING") {
      return buildOrderProcessingResponse(null);
    }

    return NextResponse.json(
      {
        ok: false,
        error: "ORDER_INSERT_FAILED",
        message_ar: "تعذر إنشاء الطلب. حاول مرة أخرى.",
        debug: msg,
      },
      { status: 500 },
    );
  }

  const ciR = await sb
    .from("cart_items")
    .select("line_key,selected_option_value_ids,selected_options")
    .eq("cart_id", cart.id)
    .eq("store_id", store_id);

  if (ciR.error) {
    await sb.from("orders").delete().eq("id", order.id).eq("store_id", store_id);

    return NextResponse.json(
      { ok: false, error: ciR.error.message },
      { status: 500 },
    );
  }

  const idsByLineKey = new Map<string, string[]>();
  const snapByLineKey = new Map<
    string,
    Array<{ name: string; value: string }>
  >();

  for (const row of Array.isArray(ciR.data) ? ciR.data : []) {
    const lk = String(row.line_key || "");
    if (!lk) continue;

    const ids = Array.isArray(row.selected_option_value_ids)
      ? row.selected_option_value_ids.map(String).filter(Boolean)
      : [];

    const snap = normalizeSelectedOptions(row.selected_options);

    idsByLineKey.set(lk, ids);
    snapByLineKey.set(lk, snap);
  }

  const summaryItems = Array.isArray(summary.items) ? summary.items : [];

  const variantSkuMap = await loadVariantSkuMap(
    sb,
    summaryItems.map((it: any) => toStr(it?.variant_id)).filter(Boolean),
  );

  const metaVariantSkuMap = await loadMetaVariantSkuMap(
    sb,
    summaryItems.map((it: any) => toStr(it?.product_id)).filter(Boolean),
  );

  const productMetaSkuMap = await loadProductMetaSkuMap(
    sb,
    summaryItems.map((it: any) => toStr(it?.product_id)).filter(Boolean),
  );

  const stockModeByItemId = await buildOrderItemStockModeMap(sb, summaryItems);

  function buildSnapshotFallback(ids: string[]) {
    const out: Array<{ name: string; value: string }> = [];

    for (const id of uniqStr(ids)) {
      out.push({ name: "خيار", value: `خيار: ${shortId(id)}` });
    }

    return out;
  }

  const oi = summaryItems.map((it: any) => {
    const lk = String(it.line_key || "");
    const selectedIds = idsByLineKey.get(lk) ?? [];
    const snap = snapByLineKey.get(lk) ?? [];

    const selected_options =
      snap.length > 0 ? snap : buildSnapshotFallback(selectedIds);

    const productId = toStr(it?.product_id) || null;
    const stockMode = stockModeByItemId.get(toStr(it?.id));

    const originalVariantId =
      stockMode?.originalVariantId ?? (toStr(it?.variant_id) || null);

    const orderVariantId =
      stockMode?.orderVariantId === undefined
        ? originalVariantId
        : stockMode.orderVariantId;

    const sku =
      (originalVariantId ? variantSkuMap.get(originalVariantId) ?? null : null) ||
      (productId && originalVariantId
        ? metaVariantSkuMap.get(`${productId}::${originalVariantId}`) ?? null
        : null) ||
      (productId ? productMetaSkuMap.get(productId) ?? null : null);

    return {
      order_id: order.id,
      store_id,
      product_id: it.product_id,
      variant_id: orderVariantId,
      name: it.title,
      sku,
      qty: it.qty,
      currency: summary.currency,
      unit_price: it.unit_price,
      total_price: n(it.unit_price) * n(it.qty),
      selected_option_value_ids: selectedIds,
      selected_options,
    };
  });

  const oiIns = await sb.from("order_items").insert(oi);

  if (oiIns.error) {
    await sb.from("orders").delete().eq("id", order.id).eq("store_id", store_id);

    return NextResponse.json(
      { ok: false, error: oiIns.error.message },
      { status: 500 },
    );
  }

  const copyOptions = await copyCartOrderOptionsToOrder({
    sb,
    storeId: store_id,
    cartId: String(cart.id),
    orderId: String(order.id),
    targetCurrency: String(summary.currency || "SAR"),
    summaryOrderOptions: Array.isArray(summary.order_options)
      ? summary.order_options
      : Array.isArray(summary.orderOptions)
        ? summary.orderOptions
        : [],
  });

  if (!copyOptions.ok) {
    await sb.from("order_items").delete().eq("order_id", order.id);
    await sb.from("orders").delete().eq("id", order.id).eq("store_id", store_id);

    return NextResponse.json(
      {
        ok: false,
        error: copyOptions.error || "ORDER_OPTIONS_COPY_FAILED",
        message_ar:
          copyOptions.message_ar || "تعذر حفظ تفاصيل خيارات الطلب.",
      },
      { status: 400 },
    );
  }

  if (bankTransferProof) {
    const proofIns = await sb.from("order_bank_transfer_proofs").insert({
      store_id,
      order_id: order.id,
      bank_account_id: bankTransferProof.bank_account_id,
      sender_account_name: bankTransferProof.sender_account_name,
      receipt_url: bankTransferProof.receipt_url,
      receipt_filename: bankTransferProof.receipt_filename,
      receipt_mime_type: bankTransferProof.receipt_mime_type,
      receipt_size_bytes: bankTransferProof.receipt_size_bytes,
      status: "pending_review",
    });

    if (proofIns.error) {
      await sb.from("order_option_answers").delete().eq("order_id", order.id);
      await sb.from("order_items").delete().eq("order_id", order.id);
      await sb
        .from("orders")
        .delete()
        .eq("id", order.id)
        .eq("store_id", store_id);

      return NextResponse.json(
        {
          ok: false,
          error: "BANK_TRANSFER_PROOF_INSERT_FAILED",
          message_ar: "تعذر حفظ إيصال التحويل البنكي. حاول مرة أخرى.",
          debug: proofIns.error.message,
        },
        { status: 500 },
      );
    }
  }

  const decR = await sb.rpc("checkout_decrement_stock", {
    p_order_id: order.id,
    p_store_id: store_id,
  });

  if (decR.error) {
    const debugMsg =
      (decR as any)?.error?.message ||
      (decR as any)?.error?.details ||
      (decR as any)?.error?.hint ||
      "RPC_FAILED";

    const stockIssue = await buildStockIssuePayload(sb, debugMsg);

    await sb.from("order_bank_transfer_proofs").delete().eq("order_id", order.id);
    await sb.from("order_option_answers").delete().eq("order_id", order.id);
    await sb.from("order_items").delete().eq("order_id", order.id);
    await sb.from("orders").delete().eq("id", order.id).eq("store_id", store_id);

    if (stockIssue) {
      return NextResponse.json(
        {
          ok: false,
          error: "CHECKOUT_OUT_OF_STOCK",
          message_ar: buildStockIssueMessageAr(stockIssue),
          stock_issue: stockIssue,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "CHECKOUT_DECREMENT_FAILED",
        message_ar: "فشل التحقق من المخزون عند إنهاء الطلب.",
        debug: debugMsg,
      },
      { status: 400 },
    );
  }

  if (coupon_id) {
    const red = await sb.from("coupon_redemptions").insert({
      store_id,
      coupon_id,
      order_id: order.id,
      customer_id: cart.user_id ? String(cart.user_id) : null,
    });

    void red;
  }

  const convertedAt = new Date().toISOString();

  const [clearCouponsR, clearItemsR, clearOrderOptionsR, closeCartR] =
    await Promise.all([
      sb
        .from("cart_coupons")
        .delete()
        .eq("store_id", store_id)
        .eq("cart_id", cart.id),

      sb
        .from("cart_items")
        .delete()
        .eq("store_id", store_id)
        .eq("cart_id", cart.id),

      sb
        .from("cart_order_option_answers")
        .delete()
        .eq("store_id", store_id)
        .eq("cart_id", cart.id),

      sb
        .from("carts")
        .update({
          status: "converted",
          item_count: 0,
          updated_at: convertedAt,
          last_activity_at: convertedAt,
        })
        .eq("id", cart.id)
        .eq("store_id", store_id),
    ]);

  const cleanupError =
    clearCouponsR.error ||
    clearItemsR.error ||
    clearOrderOptionsR.error ||
    closeCartR.error;

  if (cleanupError) {
    console.error("CHECKOUT_CART_CLEANUP_FAILED", cleanupError);
  }

  return buildOrderSuccessResponse({
    order,
    session_id,
  });
}
