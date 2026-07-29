import "server-only";
import { getProductById, getProductsByCategory } from "@/data/catalog/products";
import { getStoreDb } from "@/data/db/store-db.server";
import { getStoreOptions } from "@/data/store/options";
import { toProductDetailVM } from "@/data/viewmodels/product.vm";
import type { BootstrapRequest } from "../bootstrap/bootstrap.types";
import { getMobileCommerceContext } from "../commerce-context.server";
import { resolveActiveMobileStoreApp } from "../store-app.server";
import { buildMobileProductOptions } from "../product-options.server";
import { canShowPurchaseCount, loadLatestFiveStarProductReviews, loadProductSocialPolicy, loadProductSocialStats } from "../product-social.server";
import { buildMobileProductCard } from "../mobile-product-card.server";
import { loadMobileProductMarketingMap } from "../marketing/marketing.server";

const s = (value: unknown) => String(value ?? "").trim();
const n = (value: unknown, fallback = 0) => { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; };
const safeObject = (value: unknown): Record<string, any> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
const safeArray = (value: unknown): any[] => Array.isArray(value) ? value : [];
const maskName = (value: unknown) => { const name = s(value) || "عميل"; if (name.length <= 2) return `${name[0] ?? "ع"}***`; return `${name[0]}***${name[name.length - 1]}`; };

async function loadReviews(storeId: string, productId: string) {
  const db = (await getStoreDb(storeId)) as any;

  const reviewsResult = await db
    .from("review_entries")
    .select("id,rating,title,body,author_name,is_verified_purchase,helpful_count,published_at,created_at")
    .eq("store_id", storeId)
    .eq("target_type", "product")
    .eq("target_id", productId)
    .eq("review_type", "review")
    .eq("status", "published")
    .order("is_featured", { ascending: false })
    .order("is_pinned", { ascending: false })
    .order("helpful_count", { ascending: false })
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(60);

  if (reviewsResult.error) {
    console.error("[mobile/product] reviews load failed", reviewsResult.error);
    return [];
  }

  const rows = safeArray(reviewsResult.data);
  const reviewIds = rows.map((row) => s(row.id)).filter(Boolean);
  const mediaByReview = new Map<string, any[]>();

  if (reviewIds.length) {
    const mediaResult = await db
      .from("review_media")
      .select("id,review_id,media_type,file_url,thumbnail_url,sort_order")
      .eq("store_id", storeId)
      .in("review_id", reviewIds)
      .order("sort_order", { ascending: true });

    if (mediaResult.error) {
      console.error("[mobile/product] review media load failed", mediaResult.error);
    } else {
      for (const media of safeArray(mediaResult.data)) {
        const reviewId = s(media.review_id);
        if (!reviewId) continue;
        const current = mediaByReview.get(reviewId) ?? [];
        current.push(media);
        mediaByReview.set(reviewId, current);
      }
    }
  }

  return rows.map((row) => ({
    id: s(row.id),
    rating: Math.max(1, Math.min(5, n(row.rating, 5))),
    title: s(row.title) || null,
    body: s(row.body),
    author_name: maskName(row.author_name),
    is_verified_purchase: row.is_verified_purchase === true,
    helpful_count: Math.max(0, n(row.helpful_count)),
    published_at: row.published_at ?? row.created_at ?? null,
    option_text: "",
    fit: null,
    media: (mediaByReview.get(s(row.id)) ?? [])
      .sort((a, b) => n(a.sort_order) - n(b.sort_order))
      .map((media) => ({
        id: s(media.id),
        type: s(media.media_type) === "video" ? "video" : "image",
        url: s(media.file_url),
        thumbnail_url: s(media.thumbnail_url) || null,
      }))
      .filter((media) => media.url),
  }));
}

function detailsFromMetadata(row: any) {
  const metadata = safeObject(row.metadata);
  const seo = safeObject(row.seo);
  const source = { ...seo, ...metadata };
  const rawSpecs = safeArray(source.specifications || source.details || source.attributes || source.product_details);
  const specifications = rawSpecs.map((item) => ({
    label: s(item.label || item.name || item.key), value: s(item.value || item.text || item.content),
  })).filter((item) => item.label && item.value);
  const rawGuide = safeArray(source.size_guide || source.sizeGuide || source.measurements || source.size_chart);
  const size_guide = rawGuide.map((item) => safeObject(item)).filter((item) => Object.keys(item).length > 0);
  return {
    specifications,
    size_guide,
    shipping: safeObject(source.shipping_info || source.shipping),
    returns: safeObject(source.return_info || source.returns),
    payment: safeObject(source.payment_info || source.payment),
    policies: safeArray(source.policies),
  };
}

export async function getMobileProduct(input: BootstrapRequest, productId: string) {
  const app = await resolveActiveMobileStoreApp(input.publicAppId);
  const commerceContext = await getMobileCommerceContext(app, input);
  const row = await getProductById({ store_id: app.storeId, id: productId });
  if (!row) return null;
  const detailVm = toProductDetailVM({
    storeSlug: commerceContext.storeSlug,
    product: row,
    currencies: commerceContext.currencies,
    tax: commerceContext.tax,
  });
  const storeOptions = await getStoreOptions(app.storeId);
  const db = (await getStoreDb(app.storeId)) as any;
  const categoryResult = await db.from("product_categories").select("category_id,is_primary").eq("product_id", productId).order("is_primary", { ascending: false }).limit(1).maybeSingle();
  const categoryId = s(categoryResult.data?.category_id);
  const [policy, statsByProduct, productMarketing, reviews, recommendationsRows, readyVideosResult] = await Promise.all([
    loadProductSocialPolicy(app.storeId, storeOptions),
    loadProductSocialStats(app.storeId, [row]),
    loadMobileProductMarketingMap({ storeId: app.storeId, productIds: [String(row.id)] }),
    loadReviews(app.storeId, productId),
    categoryId ? getProductsByCategory({ store_id: app.storeId, category_id: categoryId, limit: 25, offset: 0, sort: "recommended" }) : Promise.resolve([]),
    db
      .from("product_media")
      .select("id,media_kind,original_url,thumbnail_url,video_url,upload_status,mux_playback_id,duration_seconds,aspect_ratio,width,height,sort_order")
      .eq("store_id", app.storeId)
      .eq("product_id", productId)
      .eq("media_kind", "video")
      .eq("upload_status", "ready")
      .order("sort_order", { ascending: true }),
  ]);
  const recommendationRows = safeArray(recommendationsRows).filter((item) => s(item.id) !== productId).slice(0, 24);
  const recommendationStats = await loadProductSocialStats(app.storeId, recommendationRows);
  const recommendationMarketing = await loadMobileProductMarketingMap({ storeId: app.storeId, productIds: recommendationRows.map((item) => s(item.id)) });
  const stats = statsByProduct.get(row.id) ?? { rating: null, reviewCount: 0, soldQty: 0 };
  const latestFiveStarReviews = policy.showRatingsOnApp ? await loadLatestFiveStarProductReviews(app.storeId, String(row.id), 4) : [];
  const readyVideos = safeArray(readyVideosResult.data)
    .map((m: any) => ({
      id: s(m.id),
      type: "video" as const,
      url: s(m.video_url || m.original_url),
      thumbnail_url: s(m.thumbnail_url) || null,
      upload_status: s(m.upload_status) || null,
      mux_playback_id: s(m.mux_playback_id) || null,
      duration_seconds: Number.isFinite(Number(m.duration_seconds)) ? Number(m.duration_seconds) : null,
      aspect_ratio: s(m.aspect_ratio) || null,
      width: Number.isFinite(Number(m.width)) ? Number(m.width) : null,
      height: Number.isFinite(Number(m.height)) ? Number(m.height) : null,
      sort_order: n(m.sort_order),
    }))
    .filter((m) => m.url);

  if (readyVideosResult.error) {
    console.error("[mobile/product] ready videos load failed", readyVideosResult.error);
  }

  const readyVideoIds = new Set(readyVideos.map((item) => item.id));
  const imageMedia = (row.media ?? [])
    .map((m: any) => ({
      id: s(m.id),
      type: s(m.media_kind || m.type) === "video" || Boolean(m.video_url) ? "video" as const : "image" as const,
      url: s(m.video_url || m.url || m.original_url),
      thumbnail_url: s(m.thumbnail_url || (s(m.media_kind || m.type) === "image" ? (m.url || m.original_url) : "")) || null,
      sort_order: n(m.sort_order),
    }))
    .filter((m) => m.url && m.type === "image" && !readyVideoIds.has(m.id));

  const media = [...imageMedia, ...readyVideos]
    .sort((a, b) => n(a.sort_order) - n(b.sort_order))
    .map(({ sort_order: _sortOrder, ...item }) => item);
  const reviewSummary = reviews.reduce((acc, review) => {
    acc.total += 1; acc.rating_sum += review.rating;
    if (review.fit === "small") acc.small += 1; else if (review.fit === "large") acc.large += 1; else acc.true += 1;
    return acc;
  }, { total: 0, rating_sum: 0, small: 0, true: 0, large: 0 });
  return {
    config_version: app.configVersion,
    product: {
      ...buildMobileProductCard(row, storeOptions, buildMobileProductOptions(row), {
        ...stats, showRating: policy.showRatingsOnApp, showPurchaseCount: canShowPurchaseCount(policy, row),
      }, productMarketing.get(String(row.id)) ?? null, commerceContext),
      description: detailVm.descriptionHtml,
      media,
      variants: safeArray(detailVm.variants).map((variant) => {
        const optionValueIds = safeArray(variant.option_value_ids ?? variant.optionValueIds).map((value) => s(value)).filter(Boolean);
        const optionValues = safeArray(variant.option_values).map((value) => ({
          id: s(value?.id),
          option_id: s(value?.option_id),
          name: s(value?.name),
          display_value: s(value?.display_value) || null,
          image_url: s(value?.image_url) || null,
        })).filter((value) => value.id);
        return {
          id: s(variant.id),
          price: n(variant.price),
          sale_price: variant.sale_price == null ? null : n(variant.sale_price),
          stock_quantity: n(variant.stock_quantity ?? variant.stockQuantity),
          unlimited_quantity: variant.unlimited_quantity === true || variant.unlimitedQuantity === true,
          available:
            variant.unlimited_quantity === true ||
            variant.unlimitedQuantity === true ||
            n(variant.stock_quantity ?? variant.stockQuantity) > 0 ||
            (variant.stock_quantity == null &&
              variant.stockQuantity == null &&
              variant.available !== false &&
              variant.is_available !== false &&
              variant.isAvailable !== false),
          option_value_ids: optionValueIds,
          option_values: optionValues,
        };
      }),
      ...detailsFromMetadata(row),
      reviews,
      review_summary: {
        average: reviewSummary.total ? reviewSummary.rating_sum / reviewSummary.total : n(stats.rating),
        total: reviewSummary.total || n(stats.reviewCount),
        distribution: {
          5: reviews.filter((review) => review.rating === 5).length,
          4: reviews.filter((review) => review.rating === 4).length,
          3: reviews.filter((review) => review.rating === 3).length,
          2: reviews.filter((review) => review.rating === 2).length,
          1: reviews.filter((review) => review.rating === 1).length,
        },
        recommended_percent: reviewSummary.total
          ? Math.round((reviews.filter((review) => review.rating >= 4).length / reviewSummary.total) * 100)
          : 0,
        fit: { small: 0, true: 0, large: 0 },
      },
      recommendations: recommendationRows.map((item) => {
        const itemStats = recommendationStats.get(item.id) ?? { rating: null, reviewCount: 0, soldQty: 0 };
        return buildMobileProductCard(item, storeOptions, buildMobileProductOptions(item), {
          ...itemStats, showRating: policy.showRatingsOnApp, showPurchaseCount: canShowPurchaseCount(policy, item),
        }, recommendationMarketing.get(s(item.id)) ?? null, commerceContext);
      }),
      latest_five_star_reviews: latestFiveStarReviews.map((review) => ({ id: review.id, body: review.body, author_name: review.authorName, published_at: review.publishedAt, is_verified_purchase: review.isVerifiedPurchase })),
    },
  };
}
