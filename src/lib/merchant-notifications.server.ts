// FILE: apps/storefront/src/lib/merchant-notifications.server.ts

import "server-only";

import { controlDb } from "@/data/db/control-db.server";

type NotificationType =
  | "cart_item_added"
  | "cart_abandoned"
  | "order_new"
  | "question_new"
  | "review_new"
  | "comment_new"
  | "invoice_issued"
  | "bank_transfer_proof_new"
  | "stock_low"
  | "stock_out"
  | "customer_registered"
  | "system";

type EntityType = "order" | "review" | "product" | "customer" | "system";

type CreateNotificationInput = {
  storeId: string;
  type: NotificationType;
  entityType: EntityType;
  entityId?: string | null;
  title: string;
  body?: string;
  actionPath?: string | null;
  priority?: "low" | "normal" | "high" | "urgent";
  dedupeKey?: string | null;
  payload?: Record<string, unknown>;
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

function n(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function shortId(id: string) {
  const value = s(id);
  return value.length > 8 ? value.slice(0, 8) : value;
}

/**
 * مصدر الإشعارات واحد لكل التطبيقات:
 * - قاعدة البيانات تحدد الموظفين المستحقين حسب الدور/الصلاحية.
 * - trigger الـoutbox ينشئ إرسال Push/Email وفق تفضيلات كل موظف.
 * - storefront لا يرسل البريد أو الـPush مباشرة ولا يبطئ checkout.
 */
export async function createMerchantNotification(
  input: CreateNotificationInput,
) {
  const storeId = s(input.storeId);
  const title = s(input.title);
  const entityId = s(input.entityId);

  if (!storeId) throw new Error("STORE_ID_REQUIRED");
  if (!title) throw new Error("NOTIFICATION_TITLE_REQUIRED");

  const result = await (controlDb() as any).rpc(
    "elyaia_dispatch_merchant_notification",
    {
      p_store_id: storeId,
      p_type: input.type,
      p_source: "storefront",
      p_entity_type: input.entityType,
      p_entity_id: entityId || null,
      p_title: title,
      p_body: s(input.body),
      p_action_path: s(input.actionPath) || null,
      p_priority: input.priority || "normal",
      p_payload: input.payload || {},
      p_dedupe_key: s(input.dedupeKey) || null,
    },
  );

  if (result.error) {
    throw new Error(result.error.message || "MERCHANT_NOTIFICATION_DISPATCH_FAILED");
  }

  return {
    ok: true,
    id: s(result.data),
  };
}

export async function notifyMerchantNewOrder(input: {
  storeId: string;
  order: {
    id: string;
    order_number?: string | number | null;
    invoice_no?: string | number | null;
    total_amount?: string | number | null;
    currency?: string | null;
    payment_method?: string | null;
  };
  customer?: {
    full_name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
}) {
  const orderId = s(input.order?.id);

  if (!s(input.storeId) || !orderId) return null;

  const orderNo =
    s(input.order?.order_number) ||
    s(input.order?.invoice_no) ||
    shortId(orderId);

  const customerName = s(input.customer?.full_name) || "عميل";
  const totalAmount = n(input.order?.total_amount);
  const currency = s(input.order?.currency) || "SAR";

  return createMerchantNotification({
    storeId: input.storeId,
    type: "order_new",
    entityType: "order",
    entityId: orderId,
    title: `طلب جديد #${orderNo}`,
    body: `وصل طلب جديد من ${customerName} بقيمة ${totalAmount.toFixed(2)} ${currency}.`,
    actionPath: `/orders/${orderId}`,
    priority: "high",
    dedupeKey: `order_new:${orderId}`,
    payload: {
      orderId,
      orderNumber: orderNo,
      invoiceNo: input.order?.invoice_no ?? null,
      totalAmount: input.order?.total_amount ?? null,
      currency: input.order?.currency ?? null,
      paymentMethod: input.order?.payment_method ?? null,
      customerName,
      customerPhone: input.customer?.phone ?? null,
      customerEmail: input.customer?.email ?? null,
    },
  });
}

export async function notifyMerchantBankTransferProof(input: {
  storeId: string;
  order: {
    id: string;
    order_number?: string | number | null;
    invoice_no?: string | number | null;
    total_amount?: string | number | null;
    currency?: string | null;
  };
  proof: {
    bank_account_id?: string | null;
    sender_account_name?: string | null;
    receipt_url?: string | null;
    receipt_filename?: string | null;
  };
}) {
  const orderId = s(input.order?.id);

  if (!s(input.storeId) || !orderId) return null;

  const orderNo =
    s(input.order?.order_number) ||
    s(input.order?.invoice_no) ||
    shortId(orderId);

  const totalAmount = n(input.order?.total_amount);
  const currency = s(input.order?.currency) || "SAR";
  const senderName = s(input.proof?.sender_account_name) || "غير محدد";

  return createMerchantNotification({
    storeId: input.storeId,
    type: "bank_transfer_proof_new",
    entityType: "order",
    entityId: orderId,
    title: `إثبات تحويل بنكي لطلب #${orderNo}`,
    body: `تم رفع إيصال تحويل من ${senderName} لطلب بقيمة ${totalAmount.toFixed(2)} ${currency}.`,
    actionPath: `/orders/${orderId}`,
    priority: "high",
    dedupeKey: `bank_transfer_proof_new:${orderId}`,
    payload: {
      orderId,
      orderNumber: orderNo,
      invoiceNo: input.order?.invoice_no ?? null,
      totalAmount: input.order?.total_amount ?? null,
      currency: input.order?.currency ?? null,
      bankAccountId: input.proof?.bank_account_id ?? null,
      senderAccountName: input.proof?.sender_account_name ?? null,
      receiptUrl: input.proof?.receipt_url ?? null,
      receiptFilename: input.proof?.receipt_filename ?? null,
    },
  });
}

export async function notifyMerchantNewQuestion(input: {
  storeId: string;
  question: {
    id: string;
    target_type?: string | null;
    target_id?: string | null;
    title?: string | null;
    body?: string | null;
    author_name?: string | null;
    author_email?: string | null;
    status?: string | null;
  };
}) {
  const questionId = s(input.question?.id);

  if (!s(input.storeId) || !questionId) return null;

  const authorName = s(input.question?.author_name) || "عميل";
  const questionText =
    s(input.question?.title) || s(input.question?.body) || "سؤال جديد";

  return createMerchantNotification({
    storeId: input.storeId,
    type: "question_new",
    entityType: "review",
    entityId: questionId,
    title: "سؤال جديد من عميل",
    body: `${authorName}: ${questionText}`,
    actionPath: "/feedback",
    priority: "normal",
    dedupeKey: `question_new:${questionId}`,
    payload: {
      questionId,
      targetType: input.question?.target_type ?? null,
      targetId: input.question?.target_id ?? null,
      authorName,
      authorEmail: input.question?.author_email ?? null,
      status: input.question?.status ?? null,
    },
  });
}

/**
 * لا ننشئ إشعارًا عند كل إضافة للسلة:
 * هذا حدث عالي التكرار ولا يصح أن يزعج التاجر أو يرفع عداد الجرس.
 * السلة المتروكة لها job مستقل لاحقًا عند تحقق شروطها الفعلية.
 */
export async function notifyMerchantCartItemAdded(_input?: unknown) {
  void _input;
  return { ok: true, skipped: true };
}
