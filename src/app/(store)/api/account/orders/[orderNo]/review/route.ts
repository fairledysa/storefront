// FILE: apps/storefront/src/app/(store)/api/account/orders/[orderNo]/review/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { verifySession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/data/store/supabase.server";
import { createReview } from "@/data/reviews/reviews";

type RouteCtx = {
  params: Promise<{ orderNo: string }>;
};

type RatingSettings = {
  publishTestimonials: boolean;
  publishRatings: boolean;
  allowAttachImages: boolean;

  testimonialsEnabled: boolean;
  shippingEnabled: boolean;
  productsEnabled: boolean;

  allowUpdate: boolean;
  allowUpdatePeriod: number;

  allowContactSupport: boolean;
};

const DEFAULT_RATING_SETTINGS: RatingSettings = {
  publishTestimonials: true,
  publishRatings: true,
  allowAttachImages: false,

  testimonialsEnabled: true,
  shippingEnabled: true,
  productsEnabled: true,

  allowUpdate: false,
  allowUpdatePeriod: 1,

  allowContactSupport: false,
};

const MAX_REVIEW_IMAGES = 5;

function bad(error: string, status = 400, details?: any) {
  return NextResponse.json({ ok: false, error, details }, { status });
}

function s(v: unknown) {
  return String(v ?? "").trim();
}

function parseOrderNo(raw: string) {
  const cleaned = String(raw ?? "").replace(/[^\d]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function pickToken(jar: Awaited<ReturnType<typeof cookies>>) {
  return jar.get("elyaia_session")?.value || jar.get("session")?.value || "";
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

function asPositiveInt(value: unknown, fallback: number) {
  const n = Number(value);

  if (!Number.isFinite(n) || n <= 0) return fallback;

  return Math.floor(n);
}

function safeObject(value: any): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;

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
    publishTestimonials: asBool(
      value.publishTestimonials ?? value.publish_testimonials,
      DEFAULT_RATING_SETTINGS.publishTestimonials,
    ),

    publishRatings: asBool(
      value.publishRatings ?? value.publish_ratings,
      DEFAULT_RATING_SETTINGS.publishRatings,
    ),

    allowAttachImages: asBool(
      value.allowAttachImages ?? value.allow_attach_images,
      DEFAULT_RATING_SETTINGS.allowAttachImages,
    ),

    testimonialsEnabled: asBool(
      value.testimonialsEnabled ?? value.testimonials_enabled,
      DEFAULT_RATING_SETTINGS.testimonialsEnabled,
    ),

    shippingEnabled: asBool(
      value.shippingEnabled ?? value.shipping_enabled,
      DEFAULT_RATING_SETTINGS.shippingEnabled,
    ),

    productsEnabled: asBool(
      value.productsEnabled ?? value.products_enabled,
      DEFAULT_RATING_SETTINGS.productsEnabled,
    ),

    allowUpdate: asBool(
      value.allowUpdate ??
        value.allow_update ??
        value.allowEditDeleteReviews ??
        value.allow_edit_delete_reviews,
      DEFAULT_RATING_SETTINGS.allowUpdate,
    ),

    allowUpdatePeriod: asPositiveInt(
      value.allowUpdatePeriod ??
        value.allow_update_period ??
        value.reviewEditDeleteDays ??
        value.review_edit_delete_days,
      DEFAULT_RATING_SETTINGS.allowUpdatePeriod,
    ),

    allowContactSupport: asBool(
      value.allowContactSupport ?? value.allow_contact_support,
      DEFAULT_RATING_SETTINGS.allowContactSupport,
    ),
  };
}

function isReviewableOrderStatus(order: any) {
  const status = String(order?.base_status_key || order?.status || "")
    .trim()
    .toLowerCase();

  return status === "shipped" || status === "completed";
}

async function resolveCustomerId(sb: any, token: string) {
  const session = await Promise.resolve(verifySession(token) as any);

  if (session?.customer_id) return String(session.customer_id);

  const authUserId = session?.auth_user_id || session?.user_id || null;
  if (!authUserId) return null;

  const r = await sb
    .from("customers")
    .select("id")
    .eq("auth_user_id", String(authUserId))
    .maybeSingle();

  return r.data?.id ? String(r.data.id) : null;
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

async function findOrder(args: {
  sb: any;
  storeId: string;
  customerId: string;
  orderNo: number;
}) {
  const { data, error } = await args.sb
    .from("orders")
    .select("id,status,base_status_key")
    .eq("store_id", args.storeId)
    .eq("customer_id", args.customerId)
    .or(`public_no.eq.${args.orderNo},order_number.eq.${args.orderNo}`)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "ORDER_LOOKUP_FAILED");
  }

  return data ?? null;
}

async function loadOrderReviews(args: {
  sb: any;
  storeId: string;
  customerId: string;
  orderId: string;
}) {
  const { data, error } = await args.sb
    .from("review_entries")
    .select(
      [
        "id",
        "store_id",
        "target_type",
        "target_id",
        "customer_id",
        "order_id",
        "order_item_id",
        "review_type",
        "rating",
        "body",
        "status",
        "published_at",
        "created_at",
        "updated_at",
      ].join(","),
    )
    .eq("store_id", args.storeId)
    .eq("customer_id", args.customerId)
    .eq("order_id", args.orderId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message || "ORDER_REVIEW_LOOKUP_FAILED");
  }

  return Array.isArray(data) ? data : [];
}

async function loadReviewMedia(args: {
  sb: any;
  storeId: string;
  reviewIds: string[];
}) {
  if (!args.reviewIds.length) return new Map<string, any[]>();

  const { data, error } = await args.sb
    .from("review_media")
    .select("id,review_id,file_url,thumbnail_url,alt_text,media_type,sort_order")
    .eq("store_id", args.storeId)
    .in("review_id", args.reviewIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message || "REVIEW_MEDIA_LOOKUP_FAILED");
  }

  const map = new Map<string, any[]>();

  for (const row of data || []) {
    const reviewId = row?.review_id ? String(row.review_id) : "";
    if (!reviewId) continue;

    const arr = map.get(reviewId) || [];
    arr.push(row);
    map.set(reviewId, arr);
  }

  return map;
}

function normalizeUniqueProductItems(rows: any[]) {
  const map = new Map<
    string,
    {
      order_item_id: string;
      product_id: string;
      name: string;
    }
  >();

  for (const row of rows || []) {
    const productId = s(row?.product_id);
    const orderItemId = s(row?.id);
    const name = s(row?.name) || "منتج";

    if (!productId || !orderItemId) continue;
    if (map.has(productId)) continue;

    map.set(productId, {
      order_item_id: orderItemId,
      product_id: productId,
      name,
    });
  }

  return Array.from(map.values());
}

function normalizeReviewMedia(raw: any, enabled: boolean) {
  if (!enabled) return [];
  if (!Array.isArray(raw)) return [];

  return raw
    .slice(0, MAX_REVIEW_IMAGES)
    .map((item: any, index: number) => ({
      file_url: s(item?.file_url || item?.fileUrl || item?.url),
      thumbnail_url: s(item?.thumbnail_url || item?.thumbnailUrl) || null,
      alt_text: s(item?.alt_text || item?.altText) || null,
      media_type:
        item?.media_type === "video"
          ? ("video" as const)
          : ("image" as const),
      sort_order: Number.isFinite(Number(item?.sort_order))
        ? Number(item.sort_order)
        : index,
    }))
    .filter((item) => item.file_url);
}

function splitReviews(rows: any[]) {
  const storeReview =
    rows.find(
      (row) =>
        String(row?.target_type) === "store" &&
        String(row?.review_type) === "review",
    ) || null;

  const shippingReview =
    rows.find((row) => {
      const targetType = String(row?.target_type);
      const reviewType = String(row?.review_type);
      const body = s(row?.body);

      return (
        targetType === "store" &&
        reviewType === "comment" &&
        body.startsWith("تقييم الشحن:")
      );
    }) || null;

  const supportContactReview =
    rows.find((row) => {
      const targetType = String(row?.target_type);
      const reviewType = String(row?.review_type);
      const body = s(row?.body);

      return (
        targetType === "store" &&
        reviewType === "comment" &&
        body.startsWith("طلب تواصل من خدمة العملاء")
      );
    }) || null;

  const productReviewByProductId = new Map<string, any>();

  for (const row of rows) {
    if (
      String(row?.target_type) !== "product" ||
      String(row?.review_type) !== "review"
    ) {
      continue;
    }

    const productId = s(row?.target_id);
    if (!productId || productReviewByProductId.has(productId)) continue;

    productReviewByProductId.set(productId, row);
  }

  return {
    storeReview,
    shippingReview,
    supportContactReview,
    productReviewByProductId,
  };
}

function getEditWindow(rows: any[], days: number) {
  const times = rows
    .map((row) => new Date(row?.created_at || "").getTime())
    .filter((time) => Number.isFinite(time) && time > 0);

  if (!times.length) {
    return {
      canEdit: false,
      editUntil: null as string | null,
    };
  }

  const safeDays = Math.max(1, Math.floor(Number(days || 1)));
  const editWindowMs = safeDays * 24 * 60 * 60 * 1000;

  const firstCreatedAt = Math.min(...times);
  const editUntilTime = firstCreatedAt + editWindowMs;

  return {
    canEdit: Date.now() <= editUntilTime,
    editUntil: new Date(editUntilTime).toISOString(),
  };
}

function parseShippingRating(body: unknown) {
  const text = s(body);
  const match = text.match(/تقييم الشحن:\s*([1-5])\s*\/\s*5/);
  return match?.[1] ? Number(match[1]) : 0;
}

function parseShippingComment(body: unknown) {
  const text = s(body);
  if (!text) return "";

  return text.replace(/^تقييم الشحن:\s*[1-5]\s*\/\s*5\s*/m, "").trim();
}

function buildSupportContactBody(message: string) {
  const cleanMessage = s(message);

  return cleanMessage
    ? `طلب تواصل من خدمة العملاء\n${cleanMessage}`
    : "طلب تواصل من خدمة العملاء";
}

function parseSupportContactMessage(body: unknown) {
  return s(body).replace(/^طلب تواصل من خدمة العملاء\s*/m, "").trim();
}

async function deleteReviewEntry(args: {
  sb: any;
  storeId: string;
  reviewId: string;
}) {
  const mediaDeleteR = await args.sb
    .from("review_media")
    .delete()
    .eq("store_id", args.storeId)
    .eq("review_id", args.reviewId);

  if (mediaDeleteR.error) {
    throw new Error(mediaDeleteR.error.message || "FAILED_TO_DELETE_REVIEW_MEDIA");
  }

  const reviewDeleteR = await args.sb
    .from("review_entries")
    .delete()
    .eq("store_id", args.storeId)
    .eq("id", args.reviewId);

  if (reviewDeleteR.error) {
    throw new Error(reviewDeleteR.error.message || "FAILED_TO_DELETE_REVIEW");
  }
}

async function replaceReviewMedia(args: {
  sb: any;
  reviewId: string;
  storeId: string;
  media: Array<{
    file_url: string;
    thumbnail_url: string | null;
    alt_text: string | null;
    media_type: "image" | "video";
    sort_order: number;
  }>;
}) {
  const deleteR = await args.sb
    .from("review_media")
    .delete()
    .eq("review_id", args.reviewId)
    .eq("store_id", args.storeId);

  if (deleteR.error) {
    throw new Error(deleteR.error.message || "FAILED_TO_DELETE_REVIEW_MEDIA");
  }

  const cleanMedia = args.media
    .slice(0, MAX_REVIEW_IMAGES)
    .map((item, index) => ({
      review_id: args.reviewId,
      store_id: args.storeId,
      media_type: item.media_type === "video" ? "video" : "image",
      file_url: s(item.file_url),
      thumbnail_url: s(item.thumbnail_url) || null,
      alt_text: s(item.alt_text) || null,
      sort_order: Number.isFinite(Number(item.sort_order))
        ? Number(item.sort_order)
        : index,
    }))
    .filter((item) => item.file_url);

  if (!cleanMedia.length) return;

  const insertR = await args.sb.from("review_media").insert(cleanMedia);

  if (insertR.error) {
    throw new Error(insertR.error.message || "FAILED_TO_INSERT_REVIEW_MEDIA");
  }
}

async function updateReviewEntry(args: {
  sb: any;
  reviewId: string;
  rating?: number | null;
  body?: string | null;
  status?: "pending" | "published" | "rejected" | "hidden";
}) {
  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (args.rating !== undefined) payload.rating = args.rating;
  if (args.body !== undefined) payload.body = args.body;

  if (args.status) {
    payload.status = args.status;
    payload.published_at =
      args.status === "published" ? new Date().toISOString() : null;
  }

  const r = await args.sb
    .from("review_entries")
    .update(payload)
    .eq("id", args.reviewId)
    .select("id")
    .maybeSingle();

  if (r.error || !r.data?.id) {
    throw new Error(r.error?.message || "FAILED_TO_UPDATE_REVIEW");
  }
}

/* =========================================
   GET → bootstrap/view existing review
========================================= */
export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const p = await ctx.params;
    const orderNo = parseOrderNo(p?.orderNo);
    if (!orderNo) return bad("INVALID_ORDER_NO");

    const storeCtx = await resolveStoreContext();
    const storeId = storeCtx?.store?.id;
    if (!storeId) return bad("STORE_NOT_FOUND", 404);

    const jar = await cookies();
    const token = pickToken(jar);
    if (!token) return bad("UNAUTHENTICATED", 401);

    const sb = supabaseAdmin();
    const customerId = await resolveCustomerId(sb, token);
    if (!customerId) return bad("UNAUTHENTICATED", 401);

    const order = await findOrder({
      sb,
      storeId,
      customerId,
      orderNo,
    });

    if (!order?.id) return bad("ORDER_NOT_FOUND", 404);

    if (!isReviewableOrderStatus(order)) {
      return bad("ORDER_NOT_REVIEWABLE", 403, {
        status: order.status ?? null,
        base_status_key: order.base_status_key ?? null,
      });
    }

    const [itemsR, ratingSettings, reviews] = await Promise.all([
      sb
        .from("order_items")
        .select("id,product_id,name")
        .eq("store_id", storeId)
        .eq("order_id", order.id),

      loadRatingSettings(sb, storeId),

      loadOrderReviews({
        sb,
        storeId,
        customerId,
        orderId: String(order.id),
      }),
    ]);

    if (itemsR.error) {
      return bad("ORDER_ITEMS_LOOKUP_FAILED", 500, itemsR.error.message);
    }

    const items = normalizeUniqueProductItems(itemsR.data || []);
    const alreadyReviewed = reviews.length > 0;

    const {
      storeReview,
      shippingReview,
      supportContactReview,
      productReviewByProductId,
    } = splitReviews(reviews);

    const reviewIds = reviews.map((row: any) => s(row?.id)).filter(Boolean);

    const mediaByReview = await loadReviewMedia({
      sb,
      storeId,
      reviewIds,
    });

    const editWindow = getEditWindow(
      reviews,
      ratingSettings.allowUpdatePeriod,
    );

    const canManageExistingReview = Boolean(
      ratingSettings.allowUpdate && editWindow.canEdit,
    );

    const reviewRequests = alreadyReviewed
      ? {
          store: Boolean(storeReview) || ratingSettings.testimonialsEnabled,
          products:
            productReviewByProductId.size > 0 ||
            (ratingSettings.productsEnabled && items.length > 0),
          shipping: Boolean(shippingReview) || ratingSettings.shippingEnabled,
        }
      : {
          store: ratingSettings.testimonialsEnabled,
          products: ratingSettings.productsEnabled && items.length > 0,
          shipping: ratingSettings.shippingEnabled,
        };

    if (
      !alreadyReviewed &&
      !reviewRequests.store &&
      !reviewRequests.products &&
      !reviewRequests.shipping
    ) {
      return bad("REVIEW_REQUESTS_DISABLED", 403);
    }

    const itemsWithReviews = reviewRequests.products
      ? items.map((item) => {
          const review = productReviewByProductId.get(item.product_id) || null;
          const reviewId = review?.id ? String(review.id) : "";

          return {
            ...item,
            review_id: reviewId || null,
            rating: Number(review?.rating ?? 0),
            comment: review?.body ?? "",
            status: review?.status ?? null,
            media: reviewId ? mediaByReview.get(reviewId) || [] : [],
          };
        })
      : [];

    return NextResponse.json({
      ok: true,
      order_id: order.id,
      status: order.status,
      base_status_key: order.base_status_key ?? null,

      already_reviewed: alreadyReviewed,
      edit_delete_enabled: ratingSettings.allowUpdate,
      can_edit: alreadyReviewed ? canManageExistingReview : true,
      can_delete: alreadyReviewed ? canManageExistingReview : false,
      edit_until: editWindow.editUntil,
      edit_period_days: ratingSettings.allowUpdatePeriod,

      allow_contact_support: ratingSettings.allowContactSupport,
      contact_support_requested: Boolean(supportContactReview?.id),
      support_message: supportContactReview
        ? parseSupportContactMessage(supportContactReview.body)
        : "",

      review_requests: reviewRequests,

      allow_attach_images:
        Boolean(ratingSettings.allowAttachImages) &&
        Boolean(reviewRequests.products),
      max_review_images: MAX_REVIEW_IMAGES,

      store_review: storeReview
        ? {
            id: String(storeReview.id),
            rating: Number(storeReview.rating ?? 0),
            body: storeReview.body ?? "",
            status: storeReview.status ?? null,
            created_at: storeReview.created_at ?? null,
            updated_at: storeReview.updated_at ?? null,
          }
        : null,

      shipping_review: shippingReview
        ? {
            id: String(shippingReview.id),
            rating: parseShippingRating(shippingReview.body),
            comment: parseShippingComment(shippingReview.body),
            body: shippingReview.body ?? "",
            status: shippingReview.status ?? null,
            created_at: shippingReview.created_at ?? null,
            updated_at: shippingReview.updated_at ?? null,
          }
        : null,

      items: itemsWithReviews,
    });
  } catch (e: any) {
    return bad("BOOTSTRAP_FAILED", 500, e?.message);
  }
}

/* =========================================
   POST → submit or update reviews
========================================= */
export async function POST(req: Request, ctx: RouteCtx) {
  try {
    const p = await ctx.params;
    const orderNo = parseOrderNo(p?.orderNo);
    if (!orderNo) return bad("INVALID_ORDER_NO");

    const storeCtx = await resolveStoreContext();
    const storeId = storeCtx?.store?.id;
    if (!storeId) return bad("STORE_NOT_FOUND", 404);

    const jar = await cookies();
    const token = pickToken(jar);
    if (!token) return bad("UNAUTHENTICATED", 401);

    const sb = supabaseAdmin();
    const customerId = await resolveCustomerId(sb, token);
    if (!customerId) return bad("UNAUTHENTICATED", 401);

    const order = await findOrder({
      sb,
      storeId,
      customerId,
      orderNo,
    });

    if (!order?.id) return bad("ORDER_NOT_FOUND", 404);

    const orderId = String(order.id);

    if (!isReviewableOrderStatus(order)) {
      return bad("ORDER_NOT_REVIEWABLE", 403, {
        status: order.status ?? null,
        base_status_key: order.base_status_key ?? null,
      });
    }

    const [ratingSettings, existingReviews, itemsR] = await Promise.all([
      loadRatingSettings(sb, storeId),

      loadOrderReviews({
        sb,
        storeId,
        customerId,
        orderId,
      }),

      sb
        .from("order_items")
        .select("id,product_id,name")
        .eq("store_id", storeId)
        .eq("order_id", orderId),
    ]);

    if (itemsR.error) {
      return bad("ORDER_ITEMS_LOOKUP_FAILED", 500, itemsR.error.message);
    }

    const alreadyReviewed = existingReviews.length > 0;

    if (alreadyReviewed) {
      const editWindow = getEditWindow(
        existingReviews,
        ratingSettings.allowUpdatePeriod,
      );

      if (!ratingSettings.allowUpdate) {
        return bad("REVIEW_EDIT_DELETE_DISABLED", 403);
      }

      if (!editWindow.canEdit) {
        return bad("REVIEW_EDIT_WINDOW_EXPIRED", 403, {
          edit_until: editWindow.editUntil,
        });
      }
    }

    const items = normalizeUniqueProductItems(itemsR.data || []);
    const validProductIds = new Set(items.map((item) => item.product_id));
    const validOrderItemIds = new Set(items.map((item) => item.order_item_id));

    const body = await req.json();

    const storeRating = Number(body?.store_rating ?? 0);
    const storeComment = s(body?.store_comment);

    const productReviews = Array.isArray(body?.products) ? body.products : [];

    const shippingRating = Number(body?.shipping_rating ?? 0);
    const shippingComment = s(body?.shipping_comment);

    const contactSupport = asBool(body?.contact_support, false);
    const supportMessage = s(body?.support_message);

    const reviewRequests = {
      store: ratingSettings.testimonialsEnabled,
      products: ratingSettings.productsEnabled && items.length > 0,
      shipping: ratingSettings.shippingEnabled,
    };

    if (
      !alreadyReviewed &&
      !reviewRequests.store &&
      !reviewRequests.products &&
      !reviewRequests.shipping
    ) {
      return bad("REVIEW_REQUESTS_DISABLED", 403);
    }

    const storeReviewStatus = ratingSettings.publishTestimonials
      ? ("published" as const)
      : ("pending" as const);

    const productReviewStatus = ratingSettings.publishRatings
      ? ("published" as const)
      : ("pending" as const);

    const {
      storeReview,
      shippingReview,
      supportContactReview,
      productReviewByProductId,
    } = splitReviews(existingReviews);

    let createdAnyReview = false;

    if ((reviewRequests.store || storeReview) && storeRating >= 1) {
      if (storeReview?.id) {
        await updateReviewEntry({
          sb,
          reviewId: String(storeReview.id),
          rating: storeRating,
          body: storeComment || null,
          status: storeReviewStatus,
        });
      } else {
        await createReview({
          storeId,
          targetType: "store",
          targetId: storeId,
          customerId,
          orderId,
          reviewType: "review",
          rating: storeRating,
          body: storeComment || null,
          status: storeReviewStatus,
        });
      }

      createdAnyReview = true;
    }

    if (reviewRequests.products || productReviewByProductId.size > 0) {
      const seenProductIds = new Set<string>();

      for (const p of productReviews) {
        const rating = Number(p?.rating ?? 0);
        const productId = s(p?.product_id);
        const orderItemId = s(p?.order_item_id);

        if (!rating || rating < 1) continue;
        if (!productId || !orderItemId) continue;
        if (!validProductIds.has(productId)) continue;
        if (!validOrderItemIds.has(orderItemId)) continue;
        if (seenProductIds.has(productId)) continue;

        seenProductIds.add(productId);

        const media = normalizeReviewMedia(
          p?.media,
          ratingSettings.allowAttachImages,
        );

        const existingProductReview =
          productReviewByProductId.get(productId) || null;

        if (existingProductReview?.id) {
          const reviewId = String(existingProductReview.id);

          await updateReviewEntry({
            sb,
            reviewId,
            rating,
            body: s(p?.comment) || null,
            status: productReviewStatus,
          });

          if (ratingSettings.allowAttachImages) {
            await replaceReviewMedia({
              sb,
              reviewId,
              storeId,
              media,
            });
          }
        } else {
          await createReview({
            storeId,
            targetType: "product",
            targetId: productId,
            customerId,
            orderId,
            orderItemId,
            reviewType: "review",
            rating,
            body: s(p?.comment) || null,
            status: productReviewStatus,
            media,
          });
        }

        createdAnyReview = true;
      }
    }

    if ((reviewRequests.shipping || shippingReview) && shippingRating >= 1) {
      const shippingBody = shippingComment
        ? `تقييم الشحن: ${shippingRating}/5\n${shippingComment}`
        : `تقييم الشحن: ${shippingRating}/5`;

      if (shippingReview?.id) {
        await updateReviewEntry({
          sb,
          reviewId: String(shippingReview.id),
          body: shippingBody,
          status: "published",
        });
      } else {
        await createReview({
          storeId,
          targetType: "store",
          targetId: storeId,
          customerId,
          orderId,
          reviewType: "comment",
          body: shippingBody,
          status: "published",
        });
      }

      createdAnyReview = true;
    }

    if (ratingSettings.allowContactSupport) {
      if (contactSupport) {
        const supportBody = buildSupportContactBody(supportMessage);

        if (supportContactReview?.id) {
          await updateReviewEntry({
            sb,
            reviewId: String(supportContactReview.id),
            body: supportBody,
            status: "hidden",
          });
        } else {
          await createReview({
            storeId,
            targetType: "store",
            targetId: storeId,
            customerId,
            orderId,
            reviewType: "comment",
            body: supportBody,
            status: "hidden",
          });
        }

        createdAnyReview = true;
      } else if (alreadyReviewed && supportContactReview?.id) {
        await deleteReviewEntry({
          sb,
          storeId,
          reviewId: String(supportContactReview.id),
        });
      }
    }

    if (!createdAnyReview) {
      return bad("NO_REVIEW_SUBMITTED", 400);
    }

    return NextResponse.json({
      ok: true,
      message: alreadyReviewed ? "REVIEW_UPDATED" : "REVIEW_SUBMITTED",
      updated: alreadyReviewed,
      moderation: {
        store: storeReviewStatus,
        products: productReviewStatus,
      },
    });
  } catch (e: any) {
    return bad("SUBMIT_FAILED", 500, e?.message);
  }
}

/* =========================================
   DELETE → delete existing reviews
========================================= */
export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    const p = await ctx.params;
    const orderNo = parseOrderNo(p?.orderNo);
    if (!orderNo) return bad("INVALID_ORDER_NO");

    const storeCtx = await resolveStoreContext();
    const storeId = storeCtx?.store?.id;
    if (!storeId) return bad("STORE_NOT_FOUND", 404);

    const jar = await cookies();
    const token = pickToken(jar);
    if (!token) return bad("UNAUTHENTICATED", 401);

    const sb = supabaseAdmin();
    const customerId = await resolveCustomerId(sb, token);
    if (!customerId) return bad("UNAUTHENTICATED", 401);

    const order = await findOrder({
      sb,
      storeId,
      customerId,
      orderNo,
    });

    if (!order?.id) return bad("ORDER_NOT_FOUND", 404);

    const orderId = String(order.id);

    const [ratingSettings, existingReviews] = await Promise.all([
      loadRatingSettings(sb, storeId),

      loadOrderReviews({
        sb,
        storeId,
        customerId,
        orderId,
      }),
    ]);

    if (!existingReviews.length) {
      return bad("REVIEW_NOT_FOUND", 404);
    }

    if (!ratingSettings.allowUpdate) {
      return bad("REVIEW_EDIT_DELETE_DISABLED", 403);
    }

    const editWindow = getEditWindow(
      existingReviews,
      ratingSettings.allowUpdatePeriod,
    );

    if (!editWindow.canEdit) {
      return bad("REVIEW_EDIT_WINDOW_EXPIRED", 403, {
        edit_until: editWindow.editUntil,
      });
    }

    const reviewIds = existingReviews
      .map((row: any) => s(row?.id))
      .filter(Boolean);

    if (reviewIds.length) {
      const mediaDeleteR = await sb
        .from("review_media")
        .delete()
        .eq("store_id", storeId)
        .in("review_id", reviewIds);

      if (mediaDeleteR.error) {
        return bad("REVIEW_MEDIA_DELETE_FAILED", 500, mediaDeleteR.error.message);
      }
    }

    const reviewsDeleteR = await sb
      .from("review_entries")
      .delete()
      .eq("store_id", storeId)
      .eq("customer_id", customerId)
      .eq("order_id", orderId);

    if (reviewsDeleteR.error) {
      return bad("REVIEW_DELETE_FAILED", 500, reviewsDeleteR.error.message);
    }

    return NextResponse.json({
      ok: true,
      message: "REVIEW_DELETED",
    });
  } catch (e: any) {
    return bad("DELETE_FAILED", 500, e?.message);
  }
}