import "server-only";

import { getStoreDb } from "@/data/db/store-db.server";
import type { ProductRow } from "@/data/catalog/products";
import type { StoreOptions } from "@/lib/store-options";

type ProductSocialStats = { rating: number | null; reviewCount: number; soldQty: number };

type ProductSocialPolicy = {
  showRatingsOnApp: boolean;
  showPurchaseCount: boolean;
  purchaseSelectedCategoriesOnly: boolean;
  purchaseCategoryIds: string[];
};

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function bool(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on", "active"].includes(normalized)) return true;
    if (["false", "0", "no", "off", "inactive"].includes(normalized)) return false;
  }
  return fallback;
}

export async function loadProductSocialPolicy(
  storeId: string,
  storeOptions: StoreOptions,
): Promise<ProductSocialPolicy> {
  const db = await getStoreDb(storeId);
  const setting = await db
    .from("store_settings")
    .select("value")
    .eq("store_id", storeId)
    .eq("slug", "rating_settings")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const source = object(setting.data?.value);
  const ratingEnabled = bool(source.ratingEnabled ?? source.rating_enabled, true);
  const publishRatings = bool(source.publishRatings ?? source.publish_ratings, true);
  const displayOnApp = bool(
    source.displayProductReviewsOnApp ?? source.display_product_reviews_on_app,
    false,
  );

  return {
    showRatingsOnApp:
      storeOptions.reviews.enabled &&
      storeOptions.reviews.productReviewsEnabled &&
      ratingEnabled &&
      publishRatings &&
      displayOnApp,
    showPurchaseCount: storeOptions.productPurchaseCount.enabled,
    purchaseSelectedCategoriesOnly:
      storeOptions.productPurchaseCount.selectedCategoriesOnly,
    purchaseCategoryIds: storeOptions.productPurchaseCount.categoryIds,
  };
}

export async function loadProductSocialStats(
  storeId: string,
  products: ProductRow[],
): Promise<Map<string, ProductSocialStats>> {
  const ids = products.map((product) => String(product.id)).filter(Boolean);
  const result = new Map<string, ProductSocialStats>();

  for (const product of products) {
    result.set(String(product.id), {
      rating: null,
      reviewCount: 0,
      soldQty: Math.max(0, Number(product.sold_qty ?? 0) || 0),
    });
  }

  if (!ids.length) return result;

  const db = await getStoreDb(storeId);
  const reviews = await db
    .from("review_entries")
    .select("target_id,rating")
    .eq("store_id", storeId)
    .eq("target_type", "product")
    .eq("review_type", "review")
    .eq("status", "published")
    .in("target_id", ids);

  if (reviews.error) {
    console.error("[mobile/product-social] reviews load failed", reviews.error);
    return result;
  }

  const aggregates = new Map<string, { sum: number; count: number }>();
  for (const row of reviews.data ?? []) {
    const id = String((row as any).target_id ?? "");
    const rating = Number((row as any).rating);
    if (!id || !Number.isFinite(rating) || rating < 1 || rating > 5) continue;
    const current = aggregates.get(id) ?? { sum: 0, count: 0 };
    current.sum += rating;
    current.count += 1;
    aggregates.set(id, current);
  }

  for (const [id, aggregate] of aggregates) {
    const current = result.get(id) ?? { rating: null, reviewCount: 0, soldQty: 0 };
    result.set(id, {
      ...current,
      rating: aggregate.count ? Number((aggregate.sum / aggregate.count).toFixed(2)) : null,
      reviewCount: aggregate.count,
    });
  }

  return result;
}

export type MobileFiveStarReview = {
  id: string;
  body: string;
  authorName: string;
  publishedAt: string | null;
  isVerifiedPurchase: boolean;
};

export async function loadLatestFiveStarProductReviews(
  storeId: string,
  productId: string,
  limit = 4,
): Promise<MobileFiveStarReview[]> {
  const db = await getStoreDb(storeId);
  const response = await db
    .from("review_entries")
    .select("id,body,title,author_name,published_at,created_at,is_verified_purchase")
    .eq("store_id", storeId)
    .eq("target_type", "product")
    .eq("target_id", productId)
    .eq("review_type", "review")
    .eq("status", "published")
    .eq("rating", 5)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(4, limit)));

  if (response.error) {
    console.error("[mobile/product-social] five-star reviews load failed", response.error);
    return [];
  }

  return (response.data ?? [])
    .map((row: any) => ({
      id: String(row.id ?? ""),
      body: String(row.body ?? row.title ?? "").trim(),
      authorName: String(row.author_name ?? "عميل").trim() || "عميل",
      publishedAt: row.published_at ? String(row.published_at) : row.created_at ? String(row.created_at) : null,
      isVerifiedPurchase: row.is_verified_purchase === true,
    }))
    .filter((review) => review.id && review.body);
}

export function canShowPurchaseCount(
  policy: ProductSocialPolicy,
  product: ProductRow,
) {
  if (!policy.showPurchaseCount) return false;
  if (!policy.purchaseSelectedCategoriesOnly) return true;
  const categoryIds = product.seo?.categories?.map((category) => String(category.id)) ?? [];
  return categoryIds.some((id) => policy.purchaseCategoryIds.includes(id));
}
