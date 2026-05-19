// FILE: apps/storefront/src/app/(store)/api/account/orders/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { supabaseAdmin } from "@/data/store/supabase.server";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { verifySession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type RatingSettings = {
  testimonialsEnabled: boolean;
  shippingEnabled: boolean;
  productsEnabled: boolean;
};

const DEFAULT_RATING_SETTINGS: RatingSettings = {
  testimonialsEnabled: true,
  shippingEnabled: true,
  productsEnabled: true,
};

function pickSessionToken(jar: Awaited<ReturnType<typeof cookies>>) {
  return (
    jar.get("elyaia_session")?.value ||
    jar.get("elyaiaSession")?.value ||
    jar.get("session")?.value ||
    ""
  );
}

function getSb() {
  return typeof (supabaseAdmin as any) === "function"
    ? (supabaseAdmin as any)()
    : (supabaseAdmin as any);
}

async function resolveCustomerId(sb: any, token: string) {
  let session: any = null;

  try {
    session = await Promise.resolve(verifySession(token) as any);
  } catch {
    session = null;
  }

  if (session?.customer_id) return String(session.customer_id);

  const authUserId = session?.auth_user_id || session?.user_id || null;
  if (!authUserId) return null;

  const res = await sb
    .from("customers")
    .select("id")
    .eq("auth_user_id", String(authUserId))
    .maybeSingle();

  if (res.error) throw new Error(res.error.message);

  return res.data?.id ? String(res.data.id) : null;
}

function uniq(arr: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      arr
        .map((x) => String(x ?? "").trim())
        .filter(Boolean),
    ),
  );
}

function asBool(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;

  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  if (typeof value === "string") {
    const v = value.trim().toLowerCase();

    if (["true", "1", "yes", "on", "enabled", "active"].includes(v)) {
      return true;
    }

    if (["false", "0", "no", "off", "disabled", "inactive"].includes(v)) {
      return false;
    }
  }

  return fallback;
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

function normalizeRatingSettings(raw: any): RatingSettings {
  const value = safeObject(raw);

  return {
    testimonialsEnabled: asBool(
      value.testimonialsEnabled ??
        value.testimonials_enabled ??
        value.requestStoreReview ??
        value.request_store_review ??
        value.storeReviewEnabled ??
        value.store_review_enabled,
      DEFAULT_RATING_SETTINGS.testimonialsEnabled,
    ),

    shippingEnabled: asBool(
      value.shippingEnabled ??
        value.shipping_enabled ??
        value.requestShippingReview ??
        value.request_shipping_review ??
        value.shippingReviewEnabled ??
        value.shipping_review_enabled,
      DEFAULT_RATING_SETTINGS.shippingEnabled,
    ),

    productsEnabled: asBool(
      value.productsEnabled ??
        value.products_enabled ??
        value.requestProductReviews ??
        value.request_product_reviews ??
        value.productReviewsEnabled ??
        value.product_reviews_enabled,
      DEFAULT_RATING_SETTINGS.productsEnabled,
    ),
  };
}

async function loadRatingSettings(sb: any, storeId: string) {
  const { data, error } = await sb
    .from("store_settings")
    .select("value,updated_at,created_at")
    .eq("store_id", storeId)
    .in("slug", ["rating_settings", "store.rating_settings", "rating.settings"])
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return DEFAULT_RATING_SETTINGS;
  }

  return normalizeRatingSettings(data?.value);
}

function orderStatusFallbackLabel(status: unknown, baseStatusKey?: unknown) {
  const key = String(baseStatusKey || status || "").trim().toLowerCase();

  const map: Record<string, string> = {
    draft: "مسودة",
    pending: "قيد المعالجة",
    processing: "قيد التنفيذ",
    paid: "مدفوع",
    shipped: "تم الشحن",
    completed: "مكتمل",
    cancelled: "ملغي",
    refunded: "مسترجع",
    failed: "فشل",
  };

  return map[key] || String(status || "-");
}

function paymentStatusLabel(status: unknown) {
  const key = String(status || "").trim().toLowerCase();

  const map: Record<string, string> = {
    unpaid: "غير مدفوع",
    paid: "مدفوع",
    failed: "فشل",
    refunded: "مسترجع",
  };

  return map[key] || String(status || "-");
}

function isProcessingOrder(order: any) {
  const s = String(order?.base_status_key || order?.status || "")
    .trim()
    .toLowerCase();

  return !["completed", "cancelled", "refunded", "failed"].includes(s);
}

function isCompletedOrder(order: any) {
  const s = String(order?.base_status_key || order?.status || "")
    .trim()
    .toLowerCase();

  return s === "completed";
}

function isReviewableOrder(order: any) {
  const s = String(order?.base_status_key || order?.status || "")
    .trim()
    .toLowerCase();

  return s === "shipped" || s === "completed";
}

function hasAnyReviewRequestForOrder(args: {
  ratingSettings: RatingSettings;
  orderItemsCount: number;
}) {
  const { ratingSettings, orderItemsCount } = args;

  return Boolean(
    ratingSettings.testimonialsEnabled ||
      ratingSettings.shippingEnabled ||
      (ratingSettings.productsEnabled && orderItemsCount > 0),
  );
}

export async function GET() {
  try {
    const ctx = await resolveStoreContext();
    const storeId = ctx?.store?.id;

    if (!storeId) {
      return NextResponse.json(
        { ok: false, error: "STORE_NOT_FOUND" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    const jar = await cookies();
    const token = pickSessionToken(jar);

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHENTICATED" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    const sb = getSb();
    const customerId = await resolveCustomerId(sb, token);

    if (!customerId) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHENTICATED" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    const [customerR, ordersR, ratingSettings] = await Promise.all([
      sb
        .from("customers")
        .select("id,full_name,email,created_at")
        .eq("id", customerId)
        .maybeSingle(),

      sb
        .from("orders")
        .select(
          [
            "id",
            "public_no",
            "order_number",
            "status",
            "base_status_key",
            "store_status_id",
            "payment_status",
            "payment_method",
            "total_amount",
            "currency",
            "created_at",
          ].join(","),
          { count: "exact" },
        )
        .eq("store_id", storeId)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(50),

      loadRatingSettings(sb, String(storeId)),
    ]);

    if (ordersR.error) {
      return NextResponse.json(
        {
          ok: false,
          error: "ORDERS_LOOKUP_FAILED",
          detail: ordersR.error.message,
        },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }

    const ordersRaw = Array.isArray(ordersR.data) ? ordersR.data : [];
    const orderIds = ordersRaw.map((o: any) => String(o.id)).filter(Boolean);

    const storeStatusIds = uniq(
      ordersRaw.map((o: any) =>
        o.store_status_id ? String(o.store_status_id) : "",
      ),
    );

    const baseStatusKeys = uniq(
      ordersRaw.map((o: any) =>
        o.base_status_key ? String(o.base_status_key) : String(o.status || ""),
      ),
    );

    const [itemsR, storeStatusesR, baseStatusesR, reviewsR] = await Promise.all([
      orderIds.length
        ? sb
            .from("order_items")
            .select(
              [
                "id",
                "order_id",
                "product_id",
                "name",
                "qty",
                "unit_price",
                "total_price",
                "created_at",
              ].join(","),
            )
            .eq("store_id", storeId)
            .in("order_id", orderIds)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [], error: null }),

      storeStatusIds.length
        ? sb
            .from("store_order_statuses")
            .select("id,name,color,icon,base_status_key")
            .eq("store_id", storeId)
            .in("id", storeStatusIds)
        : Promise.resolve({ data: [], error: null }),

      baseStatusKeys.length
        ? sb
            .from("order_status_bases")
            .select("key,name_ar,color,icon")
            .in("key", baseStatusKeys)
        : Promise.resolve({ data: [], error: null }),

      orderIds.length
        ? sb
            .from("review_entries")
            .select("id,order_id,status,published_at,created_at")
            .eq("store_id", storeId)
            .eq("customer_id", customerId)
            .in("order_id", orderIds)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (itemsR.error) {
      return NextResponse.json(
        {
          ok: false,
          error: "ORDER_ITEMS_LOOKUP_FAILED",
          detail: itemsR.error.message,
        },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (reviewsR.error) {
      return NextResponse.json(
        {
          ok: false,
          error: "ORDER_REVIEWS_LOOKUP_FAILED",
          detail: reviewsR.error.message,
        },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }

    const reviewByOrder = new Map<string, any>();

    if (Array.isArray(reviewsR.data)) {
      for (const review of reviewsR.data) {
        const orderId = review?.order_id ? String(review.order_id) : "";
        if (!orderId || reviewByOrder.has(orderId)) continue;
        reviewByOrder.set(orderId, review);
      }
    }

    const itemsRaw = Array.isArray(itemsR.data) ? itemsR.data : [];
    const productIds = uniq(
      itemsRaw.map((it: any) => (it.product_id ? String(it.product_id) : "")),
    );

    const mediaR = productIds.length
      ? await sb
          .from("product_media")
          .select(
            "product_id,original_url,thumbnail_url,alt,is_default,sort_order",
          )
          .eq("store_id", storeId)
          .eq("media_kind", "image")
          .in("product_id", productIds)
          .order("is_default", { ascending: false })
          .order("sort_order", { ascending: true })
      : { data: [], error: null };

    const mediaRows = Array.isArray(mediaR.data) ? mediaR.data : [];

    const mediaByProduct = new Map<string, any>();
    for (const media of mediaRows) {
      const productId = media?.product_id ? String(media.product_id) : "";
      if (productId && !mediaByProduct.has(productId)) {
        mediaByProduct.set(productId, media);
      }
    }

    const itemsByOrder = new Map<string, any[]>();
    for (const item of itemsRaw) {
      const orderId = item?.order_id ? String(item.order_id) : "";
      if (!orderId) continue;

      const arr = itemsByOrder.get(orderId) || [];
      arr.push(item);
      itemsByOrder.set(orderId, arr);
    }

    const storeStatusMap = new Map<string, any>();
    if (!storeStatusesR.error && Array.isArray(storeStatusesR.data)) {
      for (const row of storeStatusesR.data) {
        if (row?.id) storeStatusMap.set(String(row.id), row);
      }
    }

    const baseStatusMap = new Map<string, any>();
    if (!baseStatusesR.error && Array.isArray(baseStatusesR.data)) {
      for (const row of baseStatusesR.data) {
        if (row?.key) baseStatusMap.set(String(row.key), row);
      }
    }

    const orders = ordersRaw.map((order: any) => {
      const orderId = String(order.id);
      const orderItems = itemsByOrder.get(orderId) || [];

      const storeStatus = order.store_status_id
        ? storeStatusMap.get(String(order.store_status_id))
        : null;

      const baseKey = String(order.base_status_key || order.status || "");
      const baseStatus = baseKey ? baseStatusMap.get(baseKey) : null;

      const existingReview = reviewByOrder.get(orderId) || null;
      const hasReview = Boolean(existingReview?.id);

      const reviewRequestsEnabled = hasAnyReviewRequestForOrder({
        ratingSettings,
        orderItemsCount: orderItems.length,
      });

      const itemsPreview = orderItems.slice(0, 3).map((item: any) => {
        const productId = item?.product_id ? String(item.product_id) : "";
        const media = productId ? mediaByProduct.get(productId) : null;

        return {
          id: String(item.id),
          product_id: productId || null,
          name: String(item.name || "منتج"),
          qty: Number(item.qty ?? 1),
          image_url: media?.thumbnail_url || media?.original_url || null,
          image_alt: media?.alt || item.name || null,
        };
      });

      return {
        id: orderId,
        public_no: Number(order.public_no ?? 0),
        order_number: Number(order.order_number ?? 0),
        status: String(order.status ?? ""),
        base_status_key: order.base_status_key
          ? String(order.base_status_key)
          : null,
        store_status_id: order.store_status_id
          ? String(order.store_status_id)
          : null,
        status_display: {
          label:
            storeStatus?.name ||
            baseStatus?.name_ar ||
            orderStatusFallbackLabel(order.status, order.base_status_key),
          color: storeStatus?.color || baseStatus?.color || null,
          icon: storeStatus?.icon || baseStatus?.icon || null,
        },
        payment_status: String(order.payment_status ?? ""),
        payment_status_display: {
          label: paymentStatusLabel(order.payment_status),
        },
        payment_method: order.payment_method
          ? String(order.payment_method)
          : null,
        total_amount: Number(order.total_amount ?? 0),
        currency: String(order.currency ?? "SAR"),
        created_at: String(order.created_at ?? ""),
        items_count: orderItems.length,
        items_qty: orderItems.reduce(
          (sum: number, item: any) => sum + Number(item?.qty ?? 0),
          0,
        ),
        items_preview: itemsPreview,
        remaining_items_count: Math.max(
          orderItems.length - itemsPreview.length,
          0,
        ),

        has_review: hasReview,
        review_id: existingReview?.id ? String(existingReview.id) : null,
        review_status: existingReview?.status
          ? String(existingReview.status)
          : null,
        review_published_at: existingReview?.published_at ?? null,
        review_created_at: existingReview?.created_at ?? null,
        can_review: Boolean(
          reviewRequestsEnabled && !hasReview && isReviewableOrder(order),
        ),
      };
    });

    const stats = {
      total: Number(ordersR.count ?? orders.length),
      processing: ordersRaw.filter(isProcessingOrder).length,
      completed: ordersRaw.filter(isCompletedOrder).length,
    };

    return NextResponse.json(
      {
        ok: true,
        customer: customerR?.data
          ? {
              id: String(customerR.data.id),
              full_name: customerR.data.full_name ?? null,
              email: customerR.data.email ?? null,
              created_at: customerR.data.created_at ?? null,
            }
          : null,
        stats,
        orders,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "UNHANDLED", detail: e?.message ?? String(e) },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}