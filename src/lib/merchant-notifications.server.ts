// FILE: apps/storefront/src/lib/merchant-notifications.server.ts

import "server-only";

import { after } from "next/server";

import { controlDb } from "@/data/db/control-db.server";
import { getStoreDb } from "@/data/db/store-db.server";

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
  sound?: "default" | "cash_register_kaching.wav";
  priority?: "default" | "normal" | "high";
  channelId?: string;
  badge?: number;
  data?: Record<string, any>;
};

type NotificationDefinition = {
  permission: string;
  defaultAppEnabled: boolean;
  defaultEmailEnabled: boolean;
};

type Recipient = {
  id: string;
  email: string;
  appEnabled: boolean;
  emailEnabled: boolean;
};

type StoreEmailBrand = {
  name: string;
  logoUrl: string | null;
};

type EmailDetail = {
  label: string;
  value: string;
  note?: string | null;
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

// Keep this manifest aligned with apps/merchant/src/lib/staff/permissions.ts.
// The storefront must apply the same permission and preference rules before
// creating internal recipients or sending a mobile/email delivery.
const NOTIFICATION_DEFINITIONS: Record<NotificationType, NotificationDefinition> = {
  order_new: {
    permission: "orders.notifications.new",
    defaultAppEnabled: true,
    defaultEmailEnabled: false,
  },
  bank_transfer_proof_new: {
    permission: "orders.bank_transfer.review",
    defaultAppEnabled: true,
    defaultEmailEnabled: true,
  },
  question_new: {
    permission: "feedback.list",
    defaultAppEnabled: true,
    defaultEmailEnabled: true,
  },
  review_new: {
    permission: "feedback.list",
    defaultAppEnabled: true,
    defaultEmailEnabled: true,
  },
  comment_new: {
    permission: "feedback.list",
    defaultAppEnabled: true,
    defaultEmailEnabled: true,
  },
  stock_low: {
    permission: "products.stock.manage",
    defaultAppEnabled: true,
    defaultEmailEnabled: true,
  },
  stock_out: {
    permission: "products.stock.manage",
    defaultAppEnabled: true,
    defaultEmailEnabled: true,
  },
  customer_registered: {
    permission: "customers.list",
    defaultAppEnabled: true,
    defaultEmailEnabled: false,
  },
  cart_item_added: {
    permission: "marketing.abandoned_carts.view",
    defaultAppEnabled: false,
    defaultEmailEnabled: false,
  },
  cart_abandoned: {
    permission: "marketing.abandoned_carts.view",
    defaultAppEnabled: false,
    defaultEmailEnabled: false,
  },
  invoice_issued: {
    permission: "settings.invoices.view",
    defaultAppEnabled: false,
    defaultEmailEnabled: true,
  },
  system: {
    permission: "dashboard.alerts.view",
    defaultAppEnabled: true,
    defaultEmailEnabled: true,
  },
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
  if (type === "order_new") return "merchant-orders-payment";
  if (type === "question_new") return "merchant-questions";

  return "merchant-general";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[char] || char);
}

function safeHttpUrl(value: unknown) {
  const url = s(value);
  return /^https?:\/\//i.test(url) ? url : null;
}

function merchantActionUrl(actionPath: string | null | undefined) {
  const path = s(actionPath);
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  const origin = s(
    process.env.MERCHANT_APP_URL ||
      process.env.APP_PUBLIC_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL,
  );

  if (!origin) return null;

  return `${origin.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function firstHttpUrl(...values: unknown[]) {
  for (const value of values) {
    const url = safeHttpUrl(value);
    if (url) return url;
  }

  return null;
}

function logoUrlFromValue(value: unknown) {
  if (typeof value === "string") return safeHttpUrl(value);

  const data = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

  return firstHttpUrl(
    data.logo_url,
    data.logoUrl,
    data.logo,
    data.image_url,
    data.imageUrl,
  );
}

async function getStoreProfileLogo(storeId: string) {
  try {
    const db: any = await getStoreDb(storeId);
    const result = await db
      .from("store_settings")
      .select("slug,value,updated_at,created_at")
      .eq("store_id", storeId)
      .in("slug", ["profile", "store.profile"])
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (result.error || !Array.isArray(result.data)) return null;

    for (const row of result.data) {
      const logoUrl = logoUrlFromValue(row?.value);
      if (logoUrl) return logoUrl;
    }

    return null;
  } catch (error) {
    console.error("MERCHANT_EMAIL_PROFILE_LOGO_LOAD_FAILED", error);
    return null;
  }
}

async function getStoreEmailBrand(storeId: string): Promise<StoreEmailBrand> {
  const fallback: StoreEmailBrand = {
    name: "متجرك",
    logoUrl: null,
  };

  try {
    const [storeResult, profileLogo] = await Promise.all([
      (controlDb() as any)
        .from("stores")
        .select("name,logo_url,metadata")
        .eq("id", storeId)
        .limit(1)
        .maybeSingle(),
      getStoreProfileLogo(storeId),
    ]);

    if (storeResult.error || !storeResult.data) {
      return {
        ...fallback,
        logoUrl: profileLogo,
      };
    }

    return {
      name: s(storeResult.data?.name) || fallback.name,
      // The storefront uses profile.logo_url first; email must show the exact
      // same logo the merchant selected for the store, not a generated mark.
      logoUrl:
        profileLogo ||
        firstHttpUrl(
          storeResult.data?.logo_url,
          logoUrlFromValue(storeResult.data?.metadata),
        ),
    };
  } catch (error) {
    console.error("MERCHANT_EMAIL_BRAND_LOAD_FAILED", error);
    return fallback;
  }
}

function emailIntro(type: NotificationType) {
  switch (type) {
    case "order_new":
      return "وردك طلب جديد ويحتاج إلى مراجعتك.";
    case "bank_transfer_proof_new":
      return "رفع العميل إيصال تحويل جديد بانتظار المراجعة.";
    case "question_new":
      return "وردك سؤال جديد من أحد عملاء متجرك.";
    case "review_new":
      return "وردك تقييم جديد من أحد عملاء متجرك.";
    case "comment_new":
      return "وردك تعليق جديد يحتاج إلى مراجعتك.";
    case "stock_low":
      return "وصل مخزون أحد منتجات متجرك إلى الحد المنخفض.";
    case "stock_out":
      return "نفد مخزون أحد منتجات متجرك.";
    case "customer_registered":
      return "سجّل عميل جديد في متجرك.";
    default:
      return "لديك إشعار جديد يحتاج إلى انتباهك.";
  }
}

function emailDetail(type: NotificationType, payload: Record<string, any> | undefined): EmailDetail {
  const data = payload || {};

  if (type === "order_new") {
    const orderNumber = s(data.orderNumber || data.invoiceNo || data.orderId);
    const total = s(data.totalAmount);
    const currency = s(data.currency) || "SAR";

    return {
      label: "رقم الطلب",
      value: orderNumber ? `#${orderNumber}` : "طلب جديد",
      note: total ? `إجمالي الطلب: ${total} ${currency}` : null,
    };
  }

  if (type === "question_new") {
    return {
      label: "المرسل",
      value: s(data.authorName || data.authorEmail) || "عميل",
      note: s(data.targetType) === "product" ? "سؤال على أحد منتجات متجرك" : null,
    };
  }

  if (type === "bank_transfer_proof_new") {
    return {
      label: "الحالة",
      value: "إيصال تحويل جديد",
      note: "يرجى مراجعة التحويل من لوحة التحكم.",
    };
  }

  return {
    label: "نوع الإشعار",
    value: "إشعار جديد",
    note: null,
  };
}

function notificationMessage(args: {
  type: NotificationType;
  body: string;
  payload?: Record<string, any>;
}) {
  if (args.type === "question_new") {
    return s(args.payload?.questionText || args.payload?.questionBody || args.body) || "ورد سؤال جديد يحتاج إلى ردك.";
  }

  return s(args.body) || emailIntro(args.type);
}

async function sendMerchantNotificationEmail(args: {
  to: string;
  title: string;
  body: string;
  actionUrl?: string | null;
  brand: StoreEmailBrand;
  notificationType: NotificationType;
  payload?: Record<string, any>;
}) {
  const apiKey = s(process.env.RESEND_API_KEY);
  const from = s(process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM);
  const to = s(args.to).toLowerCase();

  if (!apiKey || !from || !to) {
    return { ok: false, skipped: true };
  }

  const action = safeHttpUrl(args.actionUrl);
  const detail = emailDetail(args.notificationType, args.payload);
  const brandName = escapeHtml(args.brand.name || "متجرك");
  const title = escapeHtml(args.title);
  const intro = escapeHtml(emailIntro(args.notificationType));
  const detailLabel = escapeHtml(detail.label);
  const detailValue = escapeHtml(detail.value);
  const detailNote = detail.note ? escapeHtml(detail.note) : "";
  const message = escapeHtml(
    notificationMessage({
      type: args.notificationType,
      body: args.body,
      payload: args.payload,
    }),
  );
  const currentYear = new Date().getFullYear();
  const logo = args.brand.logoUrl
    ? `<img src="${escapeHtml(args.brand.logoUrl)}" alt="${brandName}" width="168" style="display:block;max-width:168px;width:auto;max-height:64px;height:auto;border:0;outline:none;text-decoration:none;" />`
    : `<span style="display:inline-block;color:#0d3b45;font-size:21px;line-height:30px;font-weight:800;">${brandName}</span>`;

  const html = `<!doctype html>
<html dir="rtl" lang="ar">
  <head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body dir="rtl" style="margin:0;padding:0;background:#f3f6f7;color:#1f2933;font-family:Tahoma,Arial,'Segoe UI',sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;mso-hide:all;">${title}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:0;padding:0;background:#f3f6f7;">
      <tr>
        <td align="center" style="padding:32px 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border:1px solid #e1e9e9;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="height:7px;line-height:7px;font-size:0;background:#0d3b45;">&nbsp;</td>
            </tr>
            <tr>
              <td dir="rtl" style="padding:28px 34px 24px;text-align:right;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="right" valign="middle" style="text-align:right;">
                      <p style="margin:0 0 5px;color:#64748b;font-size:12px;line-height:18px;">تنبيه من متجرك</p>
                      <p style="margin:0;color:#0d3b45;font-size:18px;line-height:26px;font-weight:800;">${brandName}</p>
                    </td>
                    <td align="left" valign="middle" style="width:180px;text-align:left;">${logo}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 34px;"><div style="height:1px;line-height:1px;font-size:0;background:#e8eeee;">&nbsp;</div></td>
            </tr>
            <tr>
              <td dir="rtl" style="padding:34px 34px 12px;text-align:right;">
                <p style="margin:0 0 10px;color:#0d756c;font-size:13px;line-height:20px;font-weight:800;">يتطلب انتباهك</p>
                <h1 style="margin:0;color:#0d3b45;font-size:30px;line-height:42px;font-weight:800;letter-spacing:0;">${title}</h1>
                <p style="margin:10px 0 0;color:#64748b;font-size:16px;line-height:27px;">${intro}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 34px 0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4fbf9;border:1px solid #d7ece5;border-radius:14px;">
                  <tr>
                    <td dir="rtl" style="padding:18px 20px;text-align:right;">
                      <p style="margin:0 0 5px;color:#64748b;font-size:12px;line-height:18px;">${detailLabel}</p>
                      <p style="margin:0;color:#0d3b45;font-size:18px;line-height:26px;font-weight:800;">${detailValue}</p>
                      ${detailNote ? `<p style="margin:7px 0 0;color:#64748b;font-size:13px;line-height:21px;">${detailNote}</p>` : ""}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td dir="rtl" style="padding:20px 34px 0;text-align:right;">
                <p style="margin:0 0 7px;color:#0d3b45;font-size:13px;line-height:20px;font-weight:800;">تفاصيل الإشعار</p>
                <p style="margin:0;color:#475569;font-size:15px;line-height:27px;white-space:pre-line;">${message}</p>
              </td>
            </tr>
            ${action ? `<tr><td align="center" style="padding:30px 34px 34px;text-align:center;"><a href="${escapeHtml(action)}" target="_blank" style="display:inline-block;background:#0d3b45;border-radius:10px;padding:14px 30px;color:#ffffff;font-size:16px;line-height:20px;font-weight:800;text-decoration:none;">عرض التفاصيل في لوحة التحكم</a></td></tr>` : ""}
            <tr>
              <td dir="rtl" style="padding:22px 34px 24px;background:#fbfcfc;border-top:1px solid #e8eeee;text-align:center;">
                <p style="margin:0;color:#94a3b8;font-size:11px;line-height:20px;">تم إرسال هذا البريد لأن إشعاراتك البريدية مفعّلة في ${brandName}.</p>
                <p style="margin:4px 0 0;color:#94a3b8;font-size:11px;line-height:20px;">© ${currentYear} ${brandName}. جميع الحقوق محفوظة.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: args.title,
      html,
      text: [
        args.brand.name,
        args.title,
        emailIntro(args.notificationType),
        `${detail.label}: ${detail.value}`,
        detail.note || "",
        notificationMessage({
          type: args.notificationType,
          body: args.body,
          payload: args.payload,
        }),
        action ? `عرض التفاصيل: ${action}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    return {
      ok: false,
      skipped: false,
      error: s(payload?.message || payload?.name || `RESEND_HTTP_${response.status}`),
    };
  }

  return { ok: true, skipped: false };
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

async function getEligibleRecipients(args: {
  storeId: string;
  type: NotificationType;
}): Promise<Recipient[]> {
  const db = controlDb() as any;
  const definition = NOTIFICATION_DEFINITIONS[args.type];

  const usersResult = await db
    .from("store_users")
    .select("id,email,role,status")
    .eq("store_id", args.storeId);

  if (usersResult.error) {
    throw new Error(usersResult.error.message);
  }

  const users = (Array.isArray(usersResult.data) ? usersResult.data : [])
    .filter(isActiveStoreUser)
    .map((row: any) => ({
      id: s(row?.id),
      email: s(row?.email).toLowerCase(),
      role: s(row?.role).toLowerCase(),
    }))
    .filter((row: { id: string }) => Boolean(row.id));

  if (!users.length) return [];

  const userIds = users.map((user: { id: string }) => user.id);
  const ownerIds = new Set(
    users
      .filter((user: { role: string }) => ["owner", "admin"].includes(user.role))
      .map((user: { id: string }) => user.id),
  );

  const rolesResult = await db
    .from("store_user_roles")
    .select("user_id,role_id,role:store_roles!inner(code,status)")
    .in("user_id", userIds);

  if (rolesResult.error) {
    throw new Error(rolesResult.error.message);
  }

  const roleIds = new Set<string>();
  const activeRolesByUser = new Map<string, string[]>();

  for (const row of Array.isArray(rolesResult.data) ? rolesResult.data : []) {
    const userId = s(row?.user_id);
    const roleId = s(row?.role_id);
    const role = row?.role || {};
    const status = s(role?.status || "active").toLowerCase();
    const code = s(role?.code).toLowerCase();

    if (!userId || !roleId || !["active", "enabled"].includes(status)) continue;

    roleIds.add(roleId);
    const current = activeRolesByUser.get(userId) || [];
    current.push(roleId);
    activeRolesByUser.set(userId, current);

    if (code === "owner") ownerIds.add(userId);
  }

  const permissionsByRole = new Map<string, Set<string>>();
  if (roleIds.size) {
    const permissionResult = await db
      .from("store_role_permissions")
      .select("role_id,permission:store_permissions!inner(key)")
      .in("role_id", Array.from(roleIds));

    if (permissionResult.error) {
      throw new Error(permissionResult.error.message);
    }

    for (const row of Array.isArray(permissionResult.data) ? permissionResult.data : []) {
      const roleId = s(row?.role_id);
      const permission = s(row?.permission?.key);
      if (!roleId || !permission) continue;

      const current = permissionsByRole.get(roleId) || new Set<string>();
      current.add(permission);
      permissionsByRole.set(roleId, current);
    }
  }

  const preferencesResult = await db
    .from("store_user_notification_preferences")
    .select("store_user_id,app_enabled,email_enabled")
    .eq("store_id", args.storeId)
    .eq("notification_type", args.type)
    .in("store_user_id", userIds);

  if (preferencesResult.error) {
    throw new Error(preferencesResult.error.message);
  }

  const preferenceByUser = new Map(
    (Array.isArray(preferencesResult.data) ? preferencesResult.data : []).map((row: any) => [
      s(row?.store_user_id),
      row,
    ]),
  );

  return users
    .filter((user: { id: string }) => {
      if (ownerIds.has(user.id)) return true;

      for (const roleId of activeRolesByUser.get(user.id) || []) {
        if (permissionsByRole.get(roleId)?.has(definition.permission)) return true;
      }

      return false;
    })
    .map((user: { id: string; email: string }) => {
      const preference: any = preferenceByUser.get(user.id);

      return {
        id: user.id,
        email: user.email,
        appEnabled: preference
          ? Boolean(preference.app_enabled)
          : definition.defaultAppEnabled,
        emailEnabled: preference
          ? Boolean(preference.email_enabled)
          : definition.defaultEmailEnabled,
      };
    });
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

async function skipStorefrontOutboxDeliveries(args: {
  notificationId: string;
  storeUserIds: string[];
}) {
  if (!args.storeUserIds.length) return;

  const result = await (controlDb() as any)
    .from("merchant_notification_deliveries")
    .update({
      status: "skipped",
      sent_at: new Date().toISOString(),
      locked_at: null,
      last_error: "DIRECT_STOREFRONT_DELIVERY",
      updated_at: new Date().toISOString(),
    })
    .eq("notification_id", args.notificationId)
    .in("store_user_id", args.storeUserIds)
    .in("channel", ["push", "email"])
    .in("status", ["pending", "retry"]);

  // The old outbox trigger is still retained for the merchant test button.
  // Storefront events are delivered directly below, so their jobs must not be
  // picked later by the worker and sent a second time.
  if (result.error) {
    console.error("MERCHANT_OUTBOX_SKIP_FAILED", result.error);
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
  storeUserIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, any>;
}) {
  if (!args.storeUserIds.length) {
    return { ok: true, sent: 0, invalid: 0 };
  }

  const db = controlDb() as any;

  const tokensResult = await db
    .from("merchant_push_tokens")
    .select("expo_push_token,store_user_id")
    .eq("store_id", args.storeId)
    .eq("enabled", true)
    .in("store_user_id", args.storeUserIds);

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
    sound: args.type === "order_new" ? "cash_register_kaching.wav" : "default",
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

function queueEmails(args: {
  storeId: string;
  recipients: Recipient[];
  type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, any>;
  actionPath?: string | null;
}) {
  const recipients = args.recipients.filter(
    (recipient) => recipient.emailEnabled && Boolean(recipient.email),
  );

  if (!recipients.length) return;

  const actionUrl = merchantActionUrl(args.actionPath);

  after(async () => {
    const brand = await getStoreEmailBrand(args.storeId);
    const results = await Promise.allSettled(
      recipients.map((recipient) =>
        sendMerchantNotificationEmail({
          to: recipient.email,
          title: args.title,
          body: args.body,
          actionUrl,
          brand,
          notificationType: args.type,
          payload: args.payload,
        }),
      ),
    );

    for (const result of results) {
      if (result.status === "rejected" || !result.value.ok) {
        console.error(
          "MERCHANT_NOTIFICATION_EMAIL_FAILED",
          result.status === "rejected"
            ? result.reason
            : ("error" in result.value ? result.value.error : "EMAIL_FAILED"),
        );
      }
    }
  });
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
  const recipients = await getEligibleRecipients({
    storeId,
    type: input.type,
  });

  const recipientIds = recipients.map((recipient) => recipient.id);

  await createRecipients({
    storeId,
    notificationId,
    storeUserIds: recipientIds,
  });

  await skipStorefrontOutboxDeliveries({
    notificationId,
    storeUserIds: recipientIds,
  });

  const data = {
    notificationId,
    type: input.type,
    entityType: input.entityType,
    entityId: input.entityId || null,
    actionPath: input.actionPath || null,
    priority: input.priority || "normal",
    createdAt,
    payload: input.payload || {},
  };

  let push: unknown = null;

  if (shouldSendPush(input.type, input.push)) {
    try {
      push = await sendPushToStore({
        storeId,
        storeUserIds: recipients
          .filter((recipient) => recipient.appEnabled)
          .map((recipient) => recipient.id),
        type: input.type,
        title,
        body,
        data,
      });
    } catch (error: any) {
      console.error("MERCHANT_PUSH_SEND_FAILED", error);
    }
  }

  // Email delivery uses the exact same eligible recipients and their own
  // email preference. It runs after the route response and never blocks
  // checkout, cart, or question submission.
  queueEmails({
    storeId,
    recipients,
    type: input.type,
    title,
    body,
    payload: input.payload,
    actionPath: input.actionPath,
  });

  return {
    ok: true,
    id: notificationId,
    duplicated: false,
    recipients: recipients.length,
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
  const totalAmount = n(input.order?.total_amount);
  const totalText = `${totalAmount.toFixed(2)} ${s(input.order?.currency) || "SAR"}`;

  return createMerchantNotification({
    storeId: input.storeId,
    type: "order_new",
    entityType: "order",
    entityId: orderId,
    title: `طلب جديد #${orderNo}`,
    body: `وصلك طلب جديد بقيمة ${totalText}`,
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
      questionText,
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
