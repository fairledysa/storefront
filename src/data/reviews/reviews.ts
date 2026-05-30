// FILE: apps/storefront/src/data/reviews/reviews.ts
import { controlDb } from "@/data/db/control-db.server";
import { getOrdersDb } from "@/data/db/orders-db.server";
import { getStoreDb } from "@/data/db/store-db.server";

export type ReviewTargetType = "product" | "store" | "category" | "page";
export type ReviewStatus = "pending" | "published" | "rejected" | "hidden";
export type ReviewType = "review" | "comment" | "question";

export type ReviewMediaRow = {
  id: string;
  review_id: string;
  store_id: string;
  media_type: "image" | "video";
  file_url: string;
  thumbnail_url: string | null;
  alt_text: string | null;
  sort_order: number;
  created_at: string;
};

export type ReviewReplyRow = {
  id: string;
  review_id: string;
  store_id: string;
  author_type: "admin" | "customer";
  admin_user_id: string | null;
  customer_id: string | null;
  body: string;
  status: "published" | "hidden";
  created_at: string;
  updated_at: string;
};

export type ReviewEntryRow = {
  id: string;
  store_id: string;
  target_type: ReviewTargetType;
  target_id: string;
  customer_id: string | null;
  order_id: string | null;
  order_item_id: string | null;
  review_type: ReviewType;
  rating: number | null;
  title: string | null;
  body: string | null;
  author_name: string | null;
  author_email: string | null;
  is_verified_purchase: boolean;
  is_guest: boolean;
  status: ReviewStatus;
  is_pinned: boolean;
  is_featured: boolean;
  helpful_count: number;
  reply_count: number;
  admin_score: number | null;
  sort_order: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  media?: ReviewMediaRow[];
  replies?: ReviewReplyRow[];
};

export type ReviewListResult = {
  items: ReviewEntryRow[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type ReviewSummary = {
  averageRating: number;
  totalReviews: number;
  totalComments: number;
  totalWithMedia: number;
  recommendationPercentage: number;
  distribution: Array<{
    rating: number;
    count: number;
    percentage: number;
  }>;
  featuredPhotos: Array<{
    id: string;
    review_id: string;
    file_url: string;
    thumbnail_url: string | null;
    alt_text: string | null;
  }>;
};

export type ListReviewsInput = {
  storeId: string;
  targetType: ReviewTargetType;
  targetId: string;
  page?: number;
  pageSize?: number;
  sort?:
    | "featured"
    | "newest"
    | "oldest"
    | "highest_rating"
    | "lowest_rating"
    | "most_helpful";
  withMediaOnly?: boolean;
  verifiedOnly?: boolean;
  rating?: 1 | 2 | 3 | 4 | 5;
  reviewType?: ReviewType;
};

export type CreateReviewInput = {
  storeId: string;
  targetType: ReviewTargetType;
  targetId: string;
  customerId?: string | null;
  orderId?: string | null;
  orderItemId?: string | null;
  reviewType?: ReviewType;
  rating?: number | null;
  title?: string | null;
  body?: string | null;
  authorName?: string | null;
  authorEmail?: string | null;
  isGuest?: boolean;
  status?: ReviewStatus;
  media?: Array<{
    file_url: string;
    thumbnail_url?: string | null;
    alt_text?: string | null;
    media_type?: "image" | "video";
    sort_order?: number;
  }>;
};

function s(x: any) {
  return String(x ?? "").trim();
}

function clampPage(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

function clampPageSize(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return 10;
  return Math.min(50, Math.floor(n));
}

function toNullableText(v: unknown) {
  const x = s(v);
  return x || null;
}

function toNullableNumber(v: unknown) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeReviewMediaRow(row: any): ReviewMediaRow {
  return {
    id: String(row.id),
    review_id: String(row.review_id),
    store_id: String(row.store_id),
    media_type: row.media_type === "video" ? "video" : "image",
    file_url: String(row.file_url ?? ""),
    thumbnail_url: row.thumbnail_url ?? null,
    alt_text: row.alt_text ?? null,
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at ?? ""),
  };
}

function normalizeReviewReplyRow(row: any): ReviewReplyRow {
  return {
    id: String(row.id),
    review_id: String(row.review_id),
    store_id: String(row.store_id),
    author_type: row.author_type === "customer" ? "customer" : "admin",
    admin_user_id: row.admin_user_id ?? null,
    customer_id: row.customer_id ?? null,
    body: String(row.body ?? ""),
    status: row.status === "hidden" ? "hidden" : "published",
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

function resolveAuthorName(row: any) {
  const customerFullName = s(row?.customers?.full_name);
  const storedAuthorName = s(row?.author_name);
  const isGuest = !!row?.is_guest;

  if (customerFullName) return customerFullName;
  if (storedAuthorName) return storedAuthorName;
  return isGuest ? "زائر" : "عميل";
}

function resolveAuthorEmail(row: any) {
  const customerEmail = s(row?.customers?.email);
  const storedAuthorEmail = s(row?.author_email);
  return customerEmail || storedAuthorEmail || null;
}

function normalizeReviewEntryRow(row: any): ReviewEntryRow {
  return {
    id: String(row.id),
    store_id: String(row.store_id),
    target_type: row.target_type as ReviewTargetType,
    target_id: String(row.target_id),
    customer_id: row.customer_id ?? null,
    order_id: row.order_id ?? null,
    order_item_id: row.order_item_id ?? null,
    review_type: row.review_type as ReviewType,
    rating: toNullableNumber(row.rating),
    title: row.title ?? null,
    body: row.body ?? null,
    author_name: resolveAuthorName(row),
    author_email: resolveAuthorEmail(row),
    is_verified_purchase: !!row.is_verified_purchase,
    is_guest: !!row.is_guest,
    status: row.status as ReviewStatus,
    is_pinned: !!row.is_pinned,
    is_featured: !!row.is_featured,
    helpful_count: Number(row.helpful_count ?? 0),
    reply_count: Number(row.reply_count ?? 0),
    admin_score: toNullableNumber(row.admin_score),
    sort_order: Number(row.sort_order ?? 0),
    published_at: row.published_at ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    media: [],
    replies: [],
  };
}

async function resolveVerifiedPurchase(args: {
  ordersDb: any;
  storeId: string;
  targetType: ReviewTargetType;
  targetId: string;
  customerId?: string | null;
  orderId?: string | null;
  orderItemId?: string | null;
}) {
  const {
    ordersDb,
    storeId,
    targetType,
    targetId,
    customerId,
    orderId,
    orderItemId,
  } = args;

  if (!customerId) return false;
  if (targetType !== "product") return false;

  if (orderItemId) {
    const r = await ordersDb
      .from("order_items")
      .select("id, product_id, order_id")
      .eq("id", orderItemId)
      .eq("store_id", storeId)
      .eq("product_id", targetId)
      .maybeSingle();

    if (r.data?.id) {
      const o = await ordersDb
        .from("orders")
        .select("id, customer_id, store_id")
        .eq("id", r.data.order_id)
        .eq("store_id", storeId)
        .eq("customer_id", customerId)
        .maybeSingle();

      if (o.data?.id) return true;
    }
  }

  if (orderId) {
    const o = await ordersDb
      .from("orders")
      .select("id, customer_id, store_id")
      .eq("id", orderId)
      .eq("store_id", storeId)
      .eq("customer_id", customerId)
      .maybeSingle();

    if (o.data?.id) {
      const i = await ordersDb
        .from("order_items")
        .select("id")
        .eq("order_id", orderId)
        .eq("store_id", storeId)
        .eq("product_id", targetId)
        .limit(1)
        .maybeSingle();

      if (i.data?.id) return true;
    }
  }

  const ordersR = await ordersDb
    .from("orders")
    .select("id")
    .eq("store_id", storeId)
    .eq("customer_id", customerId);

  const orderIds = (ordersR.data || []).map((x: any) => x.id).filter(Boolean);
  if (!orderIds.length) return false;

  const itemR = await ordersDb
    .from("order_items")
    .select("id")
    .eq("store_id", storeId)
    .eq("product_id", targetId)
    .in("order_id", orderIds)
    .limit(1)
    .maybeSingle();

  return !!itemR.data?.id;
}

async function resolveStoreIdForReview(args: {
  reviewId: string;
  storeId?: string | null;
}) {
  const hintedStoreId = s(args.storeId);
  if (hintedStoreId) return hintedStoreId;

  const reviewId = s(args.reviewId);
  if (!reviewId) return null;

  const sb = (await controlDb()) as any;

  const result = await sb
    .from("review_entries")
    .select("store_id")
    .eq("id", reviewId)
    .limit(1)
    .maybeSingle();

  return result.data?.store_id ? String(result.data.store_id) : null;
}

export async function listReviews(
  input: ListReviewsInput,
): Promise<ReviewListResult> {
  const storeId = s(input.storeId);
  const sb = (await getStoreDb(storeId)) as any;

  const page = clampPage(input.page);
  const pageSize = clampPageSize(input.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = sb
    .from("review_entries")
    .select(
      `
        *,
        customers (
          id,
          full_name,
          email
        )
      `,
      { count: "exact" },
    )
    .eq("store_id", storeId)
    .eq("target_type", input.targetType)
    .eq("target_id", input.targetId)
    .eq("status", "published");

  if (input.reviewType) {
    query = query.eq("review_type", input.reviewType);
  }

  if (input.verifiedOnly) {
    query = query.eq("is_verified_purchase", true);
  }

  if (input.rating) {
    query = query.eq("rating", input.rating);
  }

  if (input.withMediaOnly) {
    const mediaR = await sb
      .from("review_media")
      .select("review_id")
      .eq("store_id", storeId);

    const reviewIds = Array.from(
      new Set((mediaR.data || []).map((x: any) => x.review_id).filter(Boolean)),
    );

    if (!reviewIds.length) {
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        hasMore: false,
      };
    }

    query = query.in("id", reviewIds);
  }

  switch (input.sort ?? "featured") {
    case "newest":
      query = query.order("published_at", { ascending: false });
      query = query.order("created_at", { ascending: false });
      break;

    case "oldest":
      query = query.order("published_at", { ascending: true });
      query = query.order("created_at", { ascending: true });
      break;

    case "highest_rating":
      query = query.order("rating", { ascending: false });
      query = query.order("published_at", { ascending: false });
      query = query.order("created_at", { ascending: false });
      break;

    case "lowest_rating":
      query = query.order("rating", { ascending: true });
      query = query.order("published_at", { ascending: false });
      query = query.order("created_at", { ascending: false });
      break;

    case "most_helpful":
      query = query.order("helpful_count", { ascending: false });
      query = query.order("published_at", { ascending: false });
      query = query.order("created_at", { ascending: false });
      break;

    case "featured":
    default:
      query = query.order("is_featured", { ascending: false });
      query = query.order("is_pinned", { ascending: false });
      query = query.order("is_verified_purchase", { ascending: false });
      query = query.order("helpful_count", { ascending: false });
      query = query.order("sort_order", { ascending: true });
      query = query.order("published_at", { ascending: false });
      query = query.order("created_at", { ascending: false });
      break;
  }

  const r = await query.range(from, to);
  const rows = (r.data || []) as any[];
  const total = Number(r.count ?? 0);

  const reviewIds = rows.map((x) => x.id).filter(Boolean);

  const mediaByReview = new Map<string, ReviewMediaRow[]>();
  const repliesByReview = new Map<string, ReviewReplyRow[]>();

  if (reviewIds.length) {
    const [mediaR, repliesR] = await Promise.all([
      sb
        .from("review_media")
        .select("*")
        .in("review_id", reviewIds)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),

      sb
        .from("review_replies")
        .select("*")
        .in("review_id", reviewIds)
        .eq("status", "published")
        .order("created_at", { ascending: true }),
    ]);

    for (const row of mediaR.data || []) {
      const item = normalizeReviewMediaRow(row);
      const arr = mediaByReview.get(item.review_id) || [];
      arr.push(item);
      mediaByReview.set(item.review_id, arr);
    }

    for (const row of repliesR.data || []) {
      const item = normalizeReviewReplyRow(row);
      const arr = repliesByReview.get(item.review_id) || [];
      arr.push(item);
      repliesByReview.set(item.review_id, arr);
    }
  }

  const items = rows.map((row) => {
    const item = normalizeReviewEntryRow(row);
    item.media = mediaByReview.get(item.id) || [];
    item.replies = repliesByReview.get(item.id) || [];
    return item;
  });

  return {
    items,
    total,
    page,
    pageSize,
    hasMore: from + items.length < total,
  };
}

export async function getReviewSummary(args: {
  storeId: string;
  targetType: ReviewTargetType;
  targetId: string;
}): Promise<ReviewSummary> {
  const storeId = s(args.storeId);
  const sb = (await getStoreDb(storeId)) as any;

  const reviewsR = await sb
    .from("review_entries")
    .select("id, review_type, rating, is_verified_purchase")
    .eq("store_id", storeId)
    .eq("target_type", args.targetType)
    .eq("target_id", args.targetId)
    .eq("status", "published");

  const rows = (reviewsR.data || []) as any[];

  const reviewRows = rows.filter(
    (x) =>
      x.review_type === "review" &&
      Number.isFinite(Number(x.rating)) &&
      Number(x.rating) >= 1 &&
      Number(x.rating) <= 5,
  );

  const totalReviews = reviewRows.length;
  const totalComments = rows.filter((x) => x.review_type === "comment").length;

  const counters = new Map<number, number>([
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
    [5, 0],
  ]);

  let sum = 0;
  let recommended = 0;

  for (const row of reviewRows) {
    const rating = Number(row.rating);
    sum += rating;
    counters.set(rating, (counters.get(rating) ?? 0) + 1);
    if (rating >= 4) recommended += 1;
  }

  const averageRating =
    totalReviews > 0 ? Number((sum / totalReviews).toFixed(1)) : 0;

  const distribution = [5, 4, 3, 2, 1].map((rating) => {
    const count = counters.get(rating) ?? 0;
    return {
      rating,
      count,
      percentage: totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0,
    };
  });

  const reviewIds = rows.map((x) => x.id).filter(Boolean);

  let featuredPhotos: ReviewSummary["featuredPhotos"] = [];
  let totalWithMedia = 0;

  if (reviewIds.length) {
    const mediaR = await sb
      .from("review_media")
      .select("id, review_id, file_url, thumbnail_url, alt_text, created_at")
      .in("review_id", reviewIds)
      .order("created_at", { ascending: false });

    const mediaRows = (mediaR.data || []) as any[];

    const reviewIdsWithMedia = new Set(
      mediaRows.map((x) => x.review_id).filter(Boolean),
    );

    totalWithMedia = reviewIdsWithMedia.size;

    featuredPhotos = mediaRows.slice(0, 12).map((x) => ({
      id: String(x.id),
      review_id: String(x.review_id),
      file_url: String(x.file_url ?? ""),
      thumbnail_url: x.thumbnail_url ?? null,
      alt_text: x.alt_text ?? null,
    }));
  }

  return {
    averageRating,
    totalReviews,
    totalComments,
    totalWithMedia,
    recommendationPercentage:
      totalReviews > 0 ? Math.round((recommended / totalReviews) * 100) : 0,
    distribution,
    featuredPhotos,
  };
}

export async function createReview(input: CreateReviewInput) {
  const storeId = s(input.storeId);
  const storeDb = (await getStoreDb(storeId)) as any;
  const ordersDb = (await getOrdersDb(storeId)) as any;

  const reviewType: ReviewType = input.reviewType ?? "review";
  const status: ReviewStatus = input.status ?? "pending";

  const verifiedPurchase = await resolveVerifiedPurchase({
    ordersDb,
    storeId,
    targetType: input.targetType,
    targetId: input.targetId,
    customerId: input.customerId ?? null,
    orderId: input.orderId ?? null,
    orderItemId: input.orderItemId ?? null,
  });

  let finalAuthorName = toNullableText(input.authorName);
  let finalAuthorEmail = toNullableText(input.authorEmail);

  if (input.customerId) {
    const customerR = await storeDb
      .from("customers")
      .select("id, full_name, email")
      .eq("id", input.customerId)
      .maybeSingle();

    if (customerR.data) {
      if (!finalAuthorName) {
        finalAuthorName = toNullableText(customerR.data.full_name);
      }

      if (!finalAuthorEmail) {
        finalAuthorEmail = toNullableText(customerR.data.email);
      }
    }
  }

  const insertPayload = {
    store_id: storeId,
    target_type: input.targetType,
    target_id: input.targetId,
    customer_id: input.customerId ?? null,
    order_id: input.orderId ?? null,
    order_item_id: input.orderItemId ?? null,
    review_type: reviewType,
    rating: reviewType === "review" ? toNullableNumber(input.rating) : null,
    title: toNullableText(input.title),
    body: toNullableText(input.body),
    author_name: finalAuthorName,
    author_email: finalAuthorEmail,
    is_verified_purchase: verifiedPurchase,
    is_guest: !!input.isGuest,
    status,
    published_at: status === "published" ? new Date().toISOString() : null,
  };

  const r = await storeDb
    .from("review_entries")
    .insert(insertPayload)
    .select(
      `
        *,
        customers (
          id,
          full_name,
          email
        )
      `,
    )
    .maybeSingle();

  if (!r.data?.id) {
    throw new Error(r.error?.message || "FAILED_TO_CREATE_REVIEW");
  }

  const mediaRows = Array.isArray(input.media) ? input.media : [];
  const cleanMedia = mediaRows
    .map((m, idx) => ({
      review_id: r.data.id,
      store_id: storeId,
      media_type: m.media_type === "video" ? "video" : "image",
      file_url: s(m.file_url),
      thumbnail_url: toNullableText(m.thumbnail_url),
      alt_text: toNullableText(m.alt_text),
      sort_order: Number.isFinite(Number(m.sort_order))
        ? Number(m.sort_order)
        : idx,
    }))
    .filter((m) => !!m.file_url);

  if (cleanMedia.length) {
    const mediaInsert = await storeDb.from("review_media").insert(cleanMedia);

    if (mediaInsert.error) {
      throw new Error(
        mediaInsert.error.message || "FAILED_TO_CREATE_REVIEW_MEDIA",
      );
    }
  }

  return normalizeReviewEntryRow(r.data);
}

async function getPublishedReplyCount(sb: any, reviewId: string) {
  const r = await sb
    .from("review_replies")
    .select("*", { count: "exact", head: true })
    .eq("review_id", reviewId)
    .eq("status", "published");

  return Number(r.count ?? 0);
}

export async function createReviewReply(input: {
  reviewId: string;
  storeId: string;
  authorType: "admin" | "customer";
  adminUserId?: string | null;
  customerId?: string | null;
  body: string;
  status?: "published" | "hidden";
}) {
  const storeId = s(input.storeId);
  const sb = (await getStoreDb(storeId)) as any;

  const body = s(input.body);
  if (!body) throw new Error("REPLY_BODY_REQUIRED");

  const r = await sb
    .from("review_replies")
    .insert({
      review_id: input.reviewId,
      store_id: storeId,
      author_type: input.authorType,
      admin_user_id: input.adminUserId ?? null,
      customer_id: input.customerId ?? null,
      body,
      status: input.status ?? "published",
    })
    .select("*")
    .maybeSingle();

  if (!r.data?.id) {
    throw new Error(r.error?.message || "FAILED_TO_CREATE_REVIEW_REPLY");
  }

  const replyCount = await getPublishedReplyCount(sb, input.reviewId);

  await sb
    .from("review_entries")
    .update({
      reply_count: replyCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.reviewId)
    .eq("store_id", storeId);

  return normalizeReviewReplyRow(r.data);
}

export async function addHelpfulReaction(input: {
  reviewId: string;
  storeId?: string | null;
  customerId?: string | null;
  sessionId?: string | null;
}) {
  const reviewId = s(input.reviewId);
  if (!reviewId) throw new Error("REVIEW_ID_REQUIRED");

  const storeId = await resolveStoreIdForReview({
    reviewId,
    storeId: input.storeId,
  });

  if (!storeId) throw new Error("REVIEW_STORE_NOT_FOUND");

  const sb = (await getStoreDb(storeId)) as any;

  const customerId = input.customerId ?? null;
  const sessionId = toNullableText(input.sessionId);

  if (!customerId && !sessionId) {
    throw new Error("REACTION_IDENTITY_REQUIRED");
  }

  let existsQuery = sb
    .from("review_reactions")
    .select("id")
    .eq("review_id", reviewId)
    .eq("reaction_type", "helpful")
    .limit(1);

  if (customerId) {
    existsQuery = existsQuery.eq("customer_id", customerId);
  } else {
    existsQuery = existsQuery.eq("session_id", sessionId);
  }

  const existsR = await existsQuery.maybeSingle();

  if (existsR.data?.id) {
    const current = await sb
      .from("review_entries")
      .select("helpful_count")
      .eq("id", reviewId)
      .eq("store_id", storeId)
      .maybeSingle();

    return {
      helpful_count: Number(current.data?.helpful_count ?? 0),
      duplicated: true,
    };
  }

  const insertR = await sb.from("review_reactions").insert({
    review_id: reviewId,
    customer_id: customerId,
    session_id: customerId ? null : sessionId,
    reaction_type: "helpful",
  });

  if (insertR.error) {
    throw new Error(insertR.error.message || "FAILED_TO_ADD_REACTION");
  }

  const countR = await sb
    .from("review_reactions")
    .select("*", { count: "exact", head: true })
    .eq("review_id", reviewId)
    .eq("reaction_type", "helpful");

  const helpfulCount = Number(countR.count ?? 0);

  await sb
    .from("review_entries")
    .update({
      helpful_count: helpfulCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reviewId)
    .eq("store_id", storeId);

  return {
    helpful_count: helpfulCount,
    duplicated: false,
  };
}