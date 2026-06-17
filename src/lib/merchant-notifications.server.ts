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
  payload?: Record<string, any>;
  push?: boolean;
};

type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  sound?: "default";
  priority?: "default" | "normal" | "high";
  channelId?: string;
  badge?: number;
  data?: Record<string, any>;
};

const BADGE_NOTIFICATION_TYPES = [
  "order_new",
  "question_new",
  "bank_transfer_proof_new",
  "stock_low",
  "stock_out",
  "system",
];

const PUSH_NOTIFICATION_TYPES = ["order_new", "question_new"];

function s(value: unknown) {
  return String(value ?? "").trim();
}

function n(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown, currency?: string | null) {
  const amount = n(value);
  const code = s(currency) || "SAR";

  try {
    return new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${code}`;
  }
}

function shortId(id: string) {
  const value = s(id);
  return value.length > 8 ? value.slice(0, 8) : value;
}

function isExpoPushToken(value: string) {
  return (
    /^ExponentPushToken\[[^\]]+\]$/.test(value) ||
    /^ExpoPushToken\[[^\]]+\]$/.test(value)
  );
}

function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size));
  }

  return out;
}

function isActiveStoreUser(row: any) {
  const status = s(row?.status).toLowerCase();

  if (!status) return true;

  return ["active", "enabled", "owner"].includes(status);
}

function isBadgeNotificationType(value: unknown) {
  return BADGE_NOTIFICATION_TYPES.includes(String(value || ""));
}

function shouldSendPush(type: NotificationType, push?: boolean) {
  if (!push) return false;

  return PUSH_NOTIFICATION_TYPES.includes(type);
}

function pushChannelId(type: NotificationType) {
  if (type === "order_new") return "merchant-orders";
  if (type === "question_new") return "merchant-questions";

  return "merchant-general";
}

async function sendExpoPushMessages(messages: ExpoMessage[]) {
  const valid = messages.filter((message) => isExpoPushToken(message.to));

  if (!valid.length) {
    return {
      ok: true,
      sent: 0,
      invalid: messages.length,
    };
  }

  let sent = 0;

  for (const part of chunk(valid, 100)) {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(part),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        data?.errors?.[0]?.message ||
          data?.message ||
          `EXPO_PUSH_FAILED_${response.status}`,
      );
    }

    sent += Array.isArray(data?.data) ? data.data.length : part.length;
  }

  return {
    ok: true,
    sent,
    invalid: messages.length - valid.length,
  };
}

async function getStoreUserIds(storeId: string) {
  const db = controlDb() as any;

  const result = await db
    .from("store_users")
    .select("id,status")
    .eq("store_id", storeId);

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (Array.isArray(result.data) ? result.data : [])
    .filter(isActiveStoreUser)
    .map((row: any) => s(row?.id))
    .filter(Boolean);
}

async function createRecipients(args: {
  storeId: string;
  notificationId: string;
  storeUserIds: string[];
}) {
  if (!args.storeUserIds.length) return;

  const db = controlDb() as any;

  const rows = args.storeUserIds.map((storeUserId) => ({
    store_id: args.storeId,
    notification_id: args.notificationId,
    store_user_id: storeUserId,
  }));

  const result = await db
    .from("merchant_notification_recipients")
    .upsert(rows, {
      onConflict: "notification_id,store_user_id",
      ignoreDuplicates: true,
    });

  if (result.error) {
    throw new Error(result.error.message);
  }
}

async function countUnreadBadgeByStoreUsers(args: {
  storeId: string;
  storeUserIds: string[];
}) {
  const out = new Map<string, number>();

  if (!args.storeUserIds.length) return out;

  const db = controlDb() as any;

  const result = await db
    .from("merchant_notification_recipients")
    .select(
      `
      store_user_id,
      notification:merchant_notifications!inner (
        type
      )
    `,
    )
    .eq("store_id", args.storeId)
    .in("store_user_id", args.storeUserIds)
    .is("read_at", null)
    .is("archived_at", null)
    .in("notification.type", BADGE_NOTIFICATION_TYPES);

  if (result.error) {
    throw new Error(result.error.message);
  }

  for (const row of Array.isArray(result.data) ? result.data : []) {
    const storeUserId = s(row?.store_user_id);
    const notification = row?.notification || row?.merchant_notifications || {};

    if (!storeUserId || !isBadgeNotificationType(notification?.type)) continue;

    out.set(storeUserId, (out.get(storeUserId) || 0) + 1);
  }

  return out;
}

async function sendPushToStore(args: {
  storeId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, any>;
}) {
  const db = controlDb() as any;

  const tokensResult = await db
    .from("merchant_push_tokens")
    .select("expo_push_token,store_user_id")
    .eq("store_id", args.storeId)
    .eq("enabled", true);

  if (tokensResult.error) {
    throw new Error(tokensResult.error.message);
  }

   const tokenRows: Array<{ token: string; storeUserId: string }> = (
    Array.isArray(tokensResult.data) ? tokensResult.data : []
  )
    .map(
      (row: any): { token: string; storeUserId: string } => ({
        token: s(row?.expo_push_token),
        storeUserId: s(row?.store_user_id),
      }),
    )
    .filter((row: { token: string; storeUserId: string }) => {
      return Boolean(row.token && row.storeUserId);
    });

  const badgeCounts = await countUnreadBadgeByStoreUsers({
    storeId: args.storeId,
    storeUserIds: Array.from(new Set(tokenRows.map((row) => row.storeUserId))),
  });

  const channelId = pushChannelId(args.type);

  const messages: ExpoMessage[] = tokenRows.map((row) => ({
    to: row.token,
    title: args.title,
    body: args.body || args.title,
    sound: "default",
    priority: "high",
    channelId,
    badge: badgeCounts.get(row.storeUserId) || 0,
    data: {
      ...args.data,
      channelId,
      countsInBadge: isBadgeNotificationType(args.type),
    },
  }));

  return sendExpoPushMessages(messages);
}

export async function createMerchantNotification(
  input: CreateNotificationInput,
) {
  const db = controlDb() as any;

  const storeId = s(input.storeId);
  const title = s(input.title);
  const body = s(input.body);

  if (!storeId) throw new Error("STORE_ID_REQUIRED");
  if (!title) throw new Error("NOTIFICATION_TITLE_REQUIRED");

  if (input.dedupeKey) {
    const existing = await db
      .from("merchant_notifications")
      .select("id")
      .eq("store_id", storeId)
      .eq("dedupe_key", input.dedupeKey)
      .limit(1)
      .maybeSingle();

    if (existing.error) {
      throw new Error(existing.error.message);
    }

    if (existing.data?.id) {
      return {
        ok: true,
        id: String(existing.data.id),
        duplicated: true,
        push: null,
      };
    }
  }

  const insertResult = await db
    .from("merchant_notifications")
    .insert({
      store_id: storeId,
      type: input.type,
      source: "storefront",
      entity_type: input.entityType,
      entity_id: input.entityId || null,
      title,
      body,
      action_path: input.actionPath || null,
      priority: input.priority || "normal",
      dedupe_key: input.dedupeKey || null,
      payload: input.payload || {},
    })
    .select("id,created_at")
    .single();

  if (insertResult.error || !insertResult.data?.id) {
    throw new Error(
      insertResult.error?.message || "FAILED_TO_CREATE_NOTIFICATION",
    );
  }

  const notificationId = String(insertResult.data.id);
  const createdAt = String(insertResult.data.created_at || "");
  const storeUserIds = await getStoreUserIds(storeId);

  await createRecipients({
    storeId,
    notificationId,
    storeUserIds,
  });

  let push: unknown = null;

  if (shouldSendPush(input.type, input.push)) {
    try {
      push = await sendPushToStore({
        storeId,
        type: input.type,
        title,
        body,
        data: {
          notificationId,
          type: input.type,
          entityType: input.entityType,
          entityId: input.entityId || null,
          actionPath: input.actionPath || null,
          priority: input.priority || "normal",
          createdAt,
          payload: input.payload || {},
        },
      });
    } catch (error: any) {
      console.error("MERCHANT_PUSH_SEND_FAILED", error?.message || error);
    }
  }

  return {
    ok: true,
    id: notificationId,
    duplicated: false,
    push,
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

  if (!input.storeId || !orderId) return null;

  const orderNo =
    s(input.order?.order_number) ||
    s(input.order?.invoice_no) ||
    shortId(orderId);

  const customerName = s(input.customer?.full_name) || "عميل";
  const totalText = money(input.order?.total_amount, input.order?.currency);

  return createMerchantNotification({
    storeId: input.storeId,
    type: "order_new",
    entityType: "order",
    entityId: orderId,
    title: `طلب جديد #${orderNo}`,
    body: `${customerName} أرسل طلبًا جديدًا بقيمة ${totalText}.`,
    actionPath: `/(app)/orders/${orderId}`,
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
    push: true,
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

  if (!input.storeId || !questionId) return null;

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
    actionPath: "/(app)/feedback",
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
    push: true,
  });
}

export async function notifyMerchantCartItemAdded(input: {
  storeId: string;
  cart: {
    id: string;
    user_id?: string | null;
  };
  product: {
    id: string;
    name?: string | null;
    image_url?: string | null;
  };
  actor: {
    type: "customer" | "visitor";
    name?: string | null;
  };
  qtyAdded: number;
  qtyInCart: number;
}) {
  const storeId = s(input.storeId);
  const cartId = s(input.cart?.id);
  const productId = s(input.product?.id);

  if (!storeId || !cartId || !productId) return null;

  const actorName =
    s(input.actor?.name) ||
    (input.actor?.type === "customer" ? "عميل" : "زائر");

  const productName = s(input.product?.name) || "منتج";
  const qtyAdded = Math.max(1, Math.floor(n(input.qtyAdded)));

  const title =
    input.actor?.type === "customer"
      ? `${actorName} أضاف منتجًا للسلة`
      : "زائر أضاف منتجًا للسلة";

  const body =
    qtyAdded > 1 ? `${productName} بكمية ${qtyAdded}.` : productName;

  return createMerchantNotification({
    storeId,
    type: "cart_item_added",
    entityType: "product",
    entityId: productId,
    title,
    body,
    actionPath: "/(app)/marketing/abandoned-carts",
    priority: "low",
    payload: {
      cartId,
      productId,
      productName,
      productImageUrl: input.product?.image_url ?? null,
      actorType: input.actor?.type,
      actorName,
      qtyAdded,
      qtyInCart: input.qtyInCart,
    },
    push: false,
  });
}