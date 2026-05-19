// FILE: apps/storefront/src/app/(store)/api/reviews/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  createReview,
  listReviews,
  type ReviewTargetType,
  type ReviewType,
} from "@/data/reviews/reviews";
import { getStoreOptions } from "@/data/store/options";
import { supabaseAdmin } from "@/data/store/supabase.server";
import { verifySession } from "@/lib/auth/session";

type RatingPublishSettings = {
  publishTestimonials: boolean;
  publishRatings: boolean;
};

const DEFAULT_RATING_PUBLISH_SETTINGS: RatingPublishSettings = {
  publishTestimonials: true,
  publishRatings: true,
};

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

function s(v: unknown) {
  return String(v ?? "").trim();
}

function n(v: unknown, fallback = 0) {
  const x = Number(v ?? fallback);
  return Number.isFinite(x) ? x : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHost(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")
    .replace(/:\d+$/, "");
}

function safeObject(value: any): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;

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

function asBool(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "yes", "active", "on", "enabled"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "inactive", "off", "disabled"].includes(normalized)) {
      return false;
    }
  }

  if (value && typeof value === "object") {
    const obj = value as any;

    if ("enabled" in obj) return asBool(obj.enabled, fallback);
    if ("is_enabled" in obj) return asBool(obj.is_enabled, fallback);
    if ("checked" in obj) return asBool(obj.checked, fallback);
    if ("value" in obj) return asBool(obj.value, fallback);
  }

  return fallback;
}

function pickSettingValue(source: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      return source[key];
    }
  }

  return undefined;
}

function normalizeRatingPublishSettings(raw: any): RatingPublishSettings {
  const source = safeObject(raw);

  return {
    publishTestimonials: asBool(
      pickSettingValue(source, [
        "publishTestimonials",
        "publish_testimonials",
      ]),
      DEFAULT_RATING_PUBLISH_SETTINGS.publishTestimonials,
    ),

    publishRatings: asBool(
      pickSettingValue(source, ["publishRatings", "publish_ratings"]),
      DEFAULT_RATING_PUBLISH_SETTINGS.publishRatings,
    ),
  };
}

async function loadRatingPublishSettings(
  storeId: string,
): Promise<RatingPublishSettings> {
  const sb = supabaseAdmin();

  const { data, error } = await sb
    .from("store_settings")
    .select("slug,value,created_at,updated_at")
    .eq("store_id", storeId)
    .in("slug", ["rating_settings", "store.rating_settings", "rating.settings"])
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !Array.isArray(data) || !data[0]) {
    return { ...DEFAULT_RATING_PUBLISH_SETTINGS };
  }

  return normalizeRatingPublishSettings(data[0]?.value);
}

function resolveFinalStatus(args: {
  targetType: ReviewTargetType;
  reviewType: ReviewType;
  reviewOptions: any;
  ratingSettings: RatingPublishSettings;
}) {
  const { targetType, reviewType, reviewOptions, ratingSettings } = args;

  if (reviewType === "question" || reviewType === "comment") {
    return reviewOptions.autoPublishQuestions ? "published" : "pending";
  }

  if (reviewType === "review" && targetType === "store") {
    return ratingSettings.publishTestimonials ? "published" : "pending";
  }

  if (reviewType === "review" && targetType === "product") {
    return ratingSettings.publishRatings ? "published" : "pending";
  }

  return reviewOptions.autoPublish ? "published" : "pending";
}

async function resolveStoreId(req: NextRequest) {
  const sb = supabaseAdmin();

  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    process.env.NEXT_PUBLIC_DEV_HOST ||
    "";

  const normalizedHost = normalizeHost(host);
  if (!normalizedHost) return null;

  const candidates = Array.from(
    new Set(
      [
        normalizedHost,
        normalizedHost.replace(/^www\./, ""),
        `www.${normalizedHost.replace(/^www\./, "")}`,
      ].filter(Boolean),
    ),
  );

  const domainR = await sb
    .from("store_domains")
    .select("store_id, domain, verified_at, is_primary")
    .in("domain", candidates)
    .order("is_primary", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (domainR.data?.store_id) {
    return String(domainR.data.store_id);
  }

  const slugGuess = normalizedHost.split(".")[0];
  if (!slugGuess) return null;

  const storeR = await sb
    .from("stores")
    .select("id, slug")
    .eq("slug", slugGuess)
    .limit(1)
    .maybeSingle();

  return storeR.data?.id ? String(storeR.data.id) : null;
}

function customerNameFromReview(row: any) {
  const customer = Array.isArray(row?.customers)
    ? row.customers[0]
    : row?.customers;

  return (
    s(row?.author_name) ||
    s(customer?.full_name) ||
    s(row?.author_email) ||
    "عميل"
  );
}

function normalizeReviewRow(row: any) {
  const customer = Array.isArray(row?.customers)
    ? row.customers[0]
    : row?.customers;

  const authorName = customerNameFromReview(row);
  const publishedAt = row?.published_at ?? row?.created_at ?? null;

  return {
    id: String(row?.id ?? ""),

    store_id: row?.store_id ? String(row.store_id) : null,
    storeId: row?.store_id ? String(row.store_id) : null,

    target_type: String(row?.target_type ?? ""),
    targetType: String(row?.target_type ?? ""),

    target_id: row?.target_id ? String(row.target_id) : null,
    targetId: row?.target_id ? String(row.target_id) : null,

    customer_id: row?.customer_id ? String(row.customer_id) : null,
    customerId: row?.customer_id ? String(row.customer_id) : null,

    order_id: row?.order_id ? String(row.order_id) : null,
    orderId: row?.order_id ? String(row.order_id) : null,

    order_item_id: row?.order_item_id ? String(row.order_item_id) : null,
    orderItemId: row?.order_item_id ? String(row.order_item_id) : null,

    review_type: String(row?.review_type ?? "review"),
    reviewType: String(row?.review_type ?? "review"),

    rating: Number(row?.rating ?? 0),
    title: s(row?.title),
    body: s(row?.body),

    text: s(row?.body || row?.title),
    name: authorName,
    author_name: authorName,
    authorName,
    customer_name: authorName,
    customerName: authorName,

    author_email: s(row?.author_email),
    authorEmail: s(row?.author_email),

    role: row?.is_verified_purchase ? "عميل موثّق" : "",
    avatar: "",
    image: "",

    is_verified_purchase: Boolean(row?.is_verified_purchase),
    isVerifiedPurchase: Boolean(row?.is_verified_purchase),

    is_guest: Boolean(row?.is_guest),
    isGuest: Boolean(row?.is_guest),

    status: String(row?.status ?? "published"),

    is_pinned: Boolean(row?.is_pinned),
    isPinned: Boolean(row?.is_pinned),

    is_featured: Boolean(row?.is_featured),
    isFeatured: Boolean(row?.is_featured),

    helpful_count: Number(row?.helpful_count ?? 0),
    helpfulCount: Number(row?.helpful_count ?? 0),

    reply_count: Number(row?.reply_count ?? 0),
    replyCount: Number(row?.reply_count ?? 0),

    admin_score:
      row?.admin_score === null || row?.admin_score === undefined
        ? null
        : Number(row.admin_score),
    adminScore:
      row?.admin_score === null || row?.admin_score === undefined
        ? null
        : Number(row.admin_score),

    sort_order: Number(row?.sort_order ?? 0),
    sortOrder: Number(row?.sort_order ?? 0),

    published_at: publishedAt,
    publishedAt,

    created_at: row?.created_at ?? null,
    createdAt: row?.created_at ?? null,

    updated_at: row?.updated_at ?? null,
    updatedAt: row?.updated_at ?? null,

    customer: customer
      ? {
          id: customer?.id ? String(customer.id) : null,
          full_name: s(customer?.full_name),
          email: s(customer?.email),
          phone_e164: s(customer?.phone_e164),
        }
      : null,
  };
}

async function listStoreReviewsFromDb(args: {
  storeId: string;
  targetId?: string;
  reviewType?: ReviewType;
  rating?: 1 | 2 | 3 | 4 | 5;
  sort: string;
  verifiedOnly: boolean;
  limit: number;
  offset: number;
}) {
  const sb = supabaseAdmin();

  let query: any = sb
    .from("review_entries")
    .select(
      `
      id,
      store_id,
      target_type,
      target_id,
      customer_id,
      order_id,
      order_item_id,
      review_type,
      rating,
      title,
      body,
      author_name,
      author_email,
      is_verified_purchase,
      is_guest,
      status,
      is_pinned,
      is_featured,
      helpful_count,
      reply_count,
      admin_score,
      sort_order,
      published_at,
      created_at,
      updated_at,
      customers (
        id,
        full_name,
        email,
        phone_e164
      )
    `,
      { count: "exact" },
    )
    .eq("store_id", args.storeId)
    .eq("target_type", "store")
    .eq("status", "published")
    .not("rating", "is", null);

  if (args.targetId) {
    query = query.eq("target_id", args.targetId);
  }

  if (args.reviewType) {
    query = query.eq("review_type", args.reviewType);
  } else {
    query = query.eq("review_type", "review");
  }

  if (args.rating) {
    query = query.eq("rating", args.rating);
  }

  if (args.verifiedOnly) {
    query = query.eq("is_verified_purchase", true);
  }

  if (args.sort === "newest") {
    query = query
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
  } else if (args.sort === "oldest") {
    query = query
      .order("published_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
  } else if (args.sort === "highest_rating") {
    query = query
      .order("rating", { ascending: false })
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
  } else if (args.sort === "lowest_rating") {
    query = query
      .order("rating", { ascending: true })
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
  } else if (args.sort === "most_helpful") {
    query = query
      .order("helpful_count", { ascending: false })
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
  } else {
    query = query
      .order("is_pinned", { ascending: false })
      .order("is_featured", { ascending: false })
      .order("admin_score", { ascending: false, nullsFirst: false })
      .order("sort_order", { ascending: true })
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
  }

  const from = args.offset;
  const to = args.offset + args.limit - 1;

  const { data, error, count } = await query.range(from, to);

  if (error) {
    throw new Error(error.message || "FAILED_TO_FETCH_STORE_REVIEWS");
  }

  const items = Array.isArray(data) ? data.map(normalizeReviewRow) : [];
  const total = Number(count ?? 0);

  return {
    items,
    rows: items,
    total,
    count: total,
    limit: args.limit,
    offset: args.offset,
    page: Math.floor(args.offset / args.limit) + 1,
    page_size: args.limit,
    hasMore: args.offset + items.length < total,
    nextOffset:
      args.offset + items.length < total ? args.offset + items.length : null,
  };
}

async function getCustomerById(customerId: string) {
  const sb = supabaseAdmin();

  const { data: customer } = await sb
    .from("customers")
    .select("id, full_name")
    .eq("id", customerId)
    .maybeSingle();

  return {
    customerId: customer?.id ? String(customer.id) : null,
    customerName: s(customer?.full_name) || null,
  };
}

async function resolveCustomerFromRequest(req: NextRequest) {
  const sb = supabaseAdmin();

  const appSessionToken = req.cookies.get("elyaia_session")?.value || "";

  if (appSessionToken) {
    let payload: { customer_id: string; exp: number } | null = null;

    try {
      payload = verifySession(appSessionToken);
    } catch {
      payload = null;
    }

    if (payload?.customer_id) {
      const customer = await getCustomerById(payload.customer_id);

      if (customer.customerId) {
        return customer;
      }
    }
  }

  let authUserId: string | null = null;

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (token) {
    const {
      data: { user },
      error,
    } = await sb.auth.getUser(token);

    if (!error && user?.id) {
      authUserId = String(user.id);
    }
  }

  if (!authUserId) {
    const cookieStore = req.cookies.getAll();
    const accessTokenCookie =
      cookieStore.find((c) => c.name.endsWith("-access-token"))?.value || "";

    if (accessTokenCookie) {
      const {
        data: { user },
        error,
      } = await sb.auth.getUser(accessTokenCookie);

      if (!error && user?.id) {
        authUserId = String(user.id);
      }
    }
  }

  if (!authUserId) {
    return {
      customerId: null,
      customerName: null,
    };
  }

  const { data: customer } = await sb
    .from("customers")
    .select("id, full_name")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  return {
    customerId: customer?.id ? String(customer.id) : null,
    customerName: s(customer?.full_name) || null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const storeId = await resolveStoreId(req);
    if (!storeId) return bad("STORE_NOT_FOUND", 404);

    const { searchParams } = new URL(req.url);

    const targetType = s(searchParams.get("target_type")) as ReviewTargetType;
    const targetId = s(searchParams.get("target_id"));

    const page = Math.max(1, n(searchParams.get("page"), 1));
    const pageSize = clamp(n(searchParams.get("page_size"), 10), 1, 100);

    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    const limit =
      limitParam === null || limitParam === ""
        ? pageSize
        : clamp(n(limitParam, pageSize), 1, 100);

    const offset =
      offsetParam === null || offsetParam === ""
        ? (page - 1) * pageSize
        : Math.max(0, n(offsetParam, 0));

    const sort = s(searchParams.get("sort")) || "featured";
    const verifiedOnly = s(searchParams.get("verified_only")) === "1";
    const withMediaOnly = s(searchParams.get("with_media_only")) === "1";
    const ratingRaw = searchParams.get("rating");
    const reviewTypeRaw = s(searchParams.get("review_type")) as ReviewType;

    if (!["product", "store", "category", "page"].includes(targetType)) {
      return bad("INVALID_TARGET_TYPE");
    }

    const ratingValue =
      ratingRaw == null || ratingRaw === ""
        ? undefined
        : (Number(ratingRaw) as 1 | 2 | 3 | 4 | 5);

    const reviewType: ReviewType | undefined = [
      "review",
      "comment",
      "question",
    ].includes(reviewTypeRaw)
      ? reviewTypeRaw
      : undefined;

    if (targetType === "store") {
      const data = await listStoreReviewsFromDb({
        storeId,
        targetId,
        reviewType,
        rating: ratingValue,
        sort,
        verifiedOnly,
        limit,
        offset,
      });

      return NextResponse.json({
        ok: true,
        ...data,
      });
    }

    if (!targetId) {
      return bad("TARGET_ID_REQUIRED");
    }

    const data = await listReviews({
      storeId,
      targetType,
      targetId,
      page,
      pageSize,
      sort: sort as
        | "featured"
        | "newest"
        | "oldest"
        | "highest_rating"
        | "lowest_rating"
        | "most_helpful",
      verifiedOnly,
      withMediaOnly,
      rating: ratingValue,
      reviewType,
    });

    return NextResponse.json({
      ok: true,
      ...data,
    });
  } catch (error: any) {
    return bad(error?.message || "FAILED_TO_FETCH_REVIEWS", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const storeId = await resolveStoreId(req);
    if (!storeId) return bad("STORE_NOT_FOUND", 404);

    const [storeOptions, ratingSettings] = await Promise.all([
      getStoreOptions(storeId),
      loadRatingPublishSettings(storeId),
    ]);

    const reviewOptions = storeOptions.reviews;

    if (!reviewOptions.enabled) {
      return bad("REVIEWS_DISABLED", 403);
    }

    const body = await req.json();

    const targetType = s(body?.target_type) as ReviewTargetType;
    const targetId = s(body?.target_id);
    const reviewType = (s(body?.review_type) || "review") as ReviewType;
    const title = s(body?.title) || null;
    const text = s(body?.body) || null;
    const inputAuthorName = s(body?.author_name) || null;
    const authorEmail = s(body?.author_email) || null;
    const ratingValue =
      body?.rating == null || body?.rating === ""
        ? null
        : Number(body.rating);
    const media = Array.isArray(body?.media) ? body.media : [];

    if (!["product", "store", "category", "page"].includes(targetType)) {
      return bad("INVALID_TARGET_TYPE");
    }

    if (!targetId) {
      return bad("TARGET_ID_REQUIRED");
    }

    if (!["review", "comment", "question"].includes(reviewType)) {
      return bad("INVALID_REVIEW_TYPE");
    }

    const { customerId, customerName } = await resolveCustomerFromRequest(req);
    const isGuest = !customerId;

    if (reviewType === "review") {
      if (ratingValue === null || ratingValue < 1 || ratingValue > 5) {
        return bad("INVALID_RATING");
      }

      if (targetType === "product" && !reviewOptions.productReviewsEnabled) {
        return bad("PRODUCT_REVIEWS_DISABLED", 403);
      }

      if (targetType === "store" && !reviewOptions.storeReviewsEnabled) {
        return bad("STORE_REVIEWS_DISABLED", 403);
      }

      if (targetType === "category" && !reviewOptions.categoryCommentsEnabled) {
        return bad("CATEGORY_REVIEWS_DISABLED", 403);
      }

      if (targetType === "page" && !reviewOptions.pageCommentsEnabled) {
        return bad("PAGE_REVIEWS_DISABLED", 403);
      }

      if (isGuest && !reviewOptions.allowGuestReviews) {
        return bad("LOGIN_REQUIRED", 401);
      }
    }

    if (reviewType === "question" || reviewType === "comment") {
      if (targetType === "product" && !reviewOptions.productQuestionsEnabled) {
        return bad("PRODUCT_QUESTIONS_DISABLED", 403);
      }

      if (targetType === "page" && !reviewOptions.pageQuestionsEnabled) {
        return bad("PAGE_QUESTIONS_DISABLED", 403);
      }

      if (targetType === "store" && !reviewOptions.storeReviewsEnabled) {
        return bad("STORE_COMMENTS_DISABLED", 403);
      }

      if (targetType === "category" && !reviewOptions.categoryCommentsEnabled) {
        return bad("CATEGORY_COMMENTS_DISABLED", 403);
      }

      if (isGuest && !reviewOptions.allowGuestQuestions) {
        return bad("LOGIN_REQUIRED", 401);
      }
    }

    const minLen = Number(reviewOptions.minimumCommentLength ?? 3);
    const configuredMaxLen = Number(reviewOptions.maximumCommentLength ?? 1200);
    const maxLen = Math.min(configuredMaxLen, 120);
    const textLength = text?.length ?? 0;

    if (text && textLength < minLen) {
      return bad("COMMENT_TOO_SHORT");
    }

    if (text && textLength > maxLen) {
      return bad("COMMENT_TOO_LONG");
    }

    const finalMedia =
      reviewType === "review" && reviewOptions.allowReviewImages
        ? media.slice(0, Number(reviewOptions.maxReviewImages ?? 5))
        : [];

    const finalStatus = resolveFinalStatus({
      targetType,
      reviewType,
      reviewOptions,
      ratingSettings,
    });

    const finalAuthorName = customerId
      ? customerName || inputAuthorName || "عميل"
      : inputAuthorName || "زائر";

    const created = await createReview({
      storeId,
      targetType,
      targetId,
      customerId,
      orderId: s(body?.order_id) || null,
      orderItemId: s(body?.order_item_id) || null,
      reviewType,
      rating: reviewType === "review" ? ratingValue : null,
      title,
      body: text,
      authorName: finalAuthorName,
      authorEmail,
      isGuest,
      status: finalStatus,
      media: finalMedia,
    });

    if (
      reviewType === "review" &&
      targetType === "product" &&
      reviewOptions.requireVerifiedPurchaseForProductReview &&
      !created.is_verified_purchase
    ) {
      return bad("VERIFIED_PURCHASE_REQUIRED", 403);
    }

    return NextResponse.json({
      ok: true,
      item: created,
      moderation: finalStatus,
      max_length: maxLen,
    });
  } catch (error: any) {
    return bad(error?.message || "FAILED_TO_CREATE_REVIEW", 500);
  }
}