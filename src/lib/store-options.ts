// src/lib/store-options.ts
export type StoreOptions = {
  switches: {
    showProductSku: boolean;
    showWeight: boolean;
    showDashInstead: boolean;
    priceStartFrom: boolean;
    seeMoreButton: boolean;
    digitalProductProtection: boolean;
    hsCodeEnabled: boolean;
    taxIncluded: boolean;
    quantitySort: boolean;
  };

  productPurchaseCount: {
    enabled: boolean;
    selectedCategoriesOnly: boolean;
    categoryIds: string[];
  };

  productRecommendations: {
    enabled: boolean;
    type: "random" | "category" | "brand" | "tag";
  };

  reviews: {
    enabled: boolean;
    productReviewsEnabled: boolean;
    storeReviewsEnabled: boolean;
    categoryCommentsEnabled: boolean;
    pageCommentsEnabled: boolean;

    allowGuestReviews: boolean;
    allowGuestComments: boolean;

    requireVerifiedPurchaseForProductReview: boolean;
    autoPublish: boolean;

    allowReviewImages: boolean;
    maxReviewImages: number;

    allowAdminReply: boolean;
    allowHelpfulVotes: boolean;

    showAverageRating: boolean;
    showRatingDistribution: boolean;
    showRecommendationPercentage: boolean;
    showCustomerPhotosFirst: boolean;

    defaultSort:
      | "featured"
      | "newest"
      | "oldest"
      | "highest_rating"
      | "lowest_rating"
      | "most_helpful";

    featuredFirst: boolean;
    verifiedPurchaseFirst: boolean;

    minimumCommentLength: number;
    maximumCommentLength: number;

    // ✅ إضافة منطق الأسئلة من الإدارة
    autoPublishQuestions: boolean;
    productQuestionsEnabled: boolean;
    pageQuestionsEnabled: boolean;
    allowGuestQuestions: boolean;
  };
};

export const DEFAULT_STORE_OPTIONS: StoreOptions = {
  switches: {
    showProductSku: true,
    showWeight: false,
    showDashInstead: true,
    priceStartFrom: true,
    seeMoreButton: true,
    digitalProductProtection: false,
    hsCodeEnabled: false,
    taxIncluded: false,
    quantitySort: true,
  },

  productPurchaseCount: {
    enabled: true,
    selectedCategoriesOnly: false,
    categoryIds: [],
  },

  productRecommendations: {
    enabled: true,
    type: "category",
  },

  reviews: {
    enabled: true,
    productReviewsEnabled: true,
    storeReviewsEnabled: true,
    categoryCommentsEnabled: true,
    pageCommentsEnabled: true,

    allowGuestReviews: false,
    allowGuestComments: true,

    requireVerifiedPurchaseForProductReview: false,
    autoPublish: false,

    allowReviewImages: true,
    maxReviewImages: 5,

    allowAdminReply: true,
    allowHelpfulVotes: true,

    showAverageRating: true,
    showRatingDistribution: true,
    showRecommendationPercentage: true,
    showCustomerPhotosFirst: true,

    defaultSort: "featured",

    featuredFirst: true,
    verifiedPurchaseFirst: true,

    minimumCommentLength: 3,
    maximumCommentLength: 1200,

    autoPublishQuestions: true,
    productQuestionsEnabled: true,
    pageQuestionsEnabled: true,
    allowGuestQuestions: false,
  },
};

export function parseStoreOptions(
  items: Record<string, any>
): StoreOptions {
  const o: StoreOptions = {
    switches: { ...DEFAULT_STORE_OPTIONS.switches },
    productPurchaseCount: { ...DEFAULT_STORE_OPTIONS.productPurchaseCount },
    productRecommendations: { ...DEFAULT_STORE_OPTIONS.productRecommendations },
    reviews: { ...DEFAULT_STORE_OPTIONS.reviews },
  };

  const g = (k: string) => items[`options:${k}`];

  if (g("switch_show_product_sku")?.enabled !== undefined)
    o.switches.showProductSku = g("switch_show_product_sku").enabled;

  if (g("switch_show_weight")?.enabled !== undefined)
    o.switches.showWeight = g("switch_show_weight").enabled;

  if (g("switch_show_dash_instead")?.enabled !== undefined)
    o.switches.showDashInstead = g("switch_show_dash_instead").enabled;

  if (g("switch_price_start_from")?.enabled !== undefined)
    o.switches.priceStartFrom = g("switch_price_start_from").enabled;

  if (g("switch_see_more_button")?.enabled !== undefined)
    o.switches.seeMoreButton = g("switch_see_more_button").enabled;

  if (g("switch_digital_product_protection")?.enabled !== undefined)
    o.switches.digitalProductProtection =
      g("switch_digital_product_protection").enabled;

  if (g("switch_hs_code_enabled")?.enabled !== undefined)
    o.switches.hsCodeEnabled = g("switch_hs_code_enabled").enabled;

  if (g("switch_tax_included")?.enabled !== undefined)
    o.switches.taxIncluded = g("switch_tax_included").enabled;

  if (g("switch_quantity_sort")?.enabled !== undefined)
    o.switches.quantitySort = g("switch_quantity_sort").enabled;

  if (g("product_purchase_count")) {
    o.productPurchaseCount = {
      enabled: g("product_purchase_count").enabled ?? true,
      selectedCategoriesOnly:
        g("product_purchase_count").selectedCategoriesOnly ?? false,
      categoryIds: Array.isArray(g("product_purchase_count").categoryIds)
        ? g("product_purchase_count").categoryIds.map(String).filter(Boolean)
        : [],
    };
  }

  if (g("product_recommendations")) {
    o.productRecommendations = {
      enabled: g("product_recommendations").enabled ?? true,
      type: g("product_recommendations").type ?? "category",
    };
  }

  if (g("reviews")) {
    const r = g("reviews");

    o.reviews = {
      enabled: r.enabled ?? DEFAULT_STORE_OPTIONS.reviews.enabled,
      productReviewsEnabled:
        r.productReviewsEnabled ??
        DEFAULT_STORE_OPTIONS.reviews.productReviewsEnabled,
      storeReviewsEnabled:
        r.storeReviewsEnabled ??
        DEFAULT_STORE_OPTIONS.reviews.storeReviewsEnabled,
      categoryCommentsEnabled:
        r.categoryCommentsEnabled ??
        DEFAULT_STORE_OPTIONS.reviews.categoryCommentsEnabled,
      pageCommentsEnabled:
        r.pageCommentsEnabled ??
        DEFAULT_STORE_OPTIONS.reviews.pageCommentsEnabled,

      allowGuestReviews:
        r.allowGuestReviews ??
        DEFAULT_STORE_OPTIONS.reviews.allowGuestReviews,
      allowGuestComments:
        r.allowGuestComments ??
        DEFAULT_STORE_OPTIONS.reviews.allowGuestComments,

      requireVerifiedPurchaseForProductReview:
        r.requireVerifiedPurchaseForProductReview ??
        DEFAULT_STORE_OPTIONS.reviews.requireVerifiedPurchaseForProductReview,
      autoPublish:
        r.autoPublish ?? DEFAULT_STORE_OPTIONS.reviews.autoPublish,

      allowReviewImages:
        r.allowReviewImages ??
        DEFAULT_STORE_OPTIONS.reviews.allowReviewImages,
      maxReviewImages:
        Number(
          r.maxReviewImages ?? DEFAULT_STORE_OPTIONS.reviews.maxReviewImages
        ) || 5,

      allowAdminReply:
        r.allowAdminReply ??
        DEFAULT_STORE_OPTIONS.reviews.allowAdminReply,
      allowHelpfulVotes:
        r.allowHelpfulVotes ??
        DEFAULT_STORE_OPTIONS.reviews.allowHelpfulVotes,

      showAverageRating:
        r.showAverageRating ??
        DEFAULT_STORE_OPTIONS.reviews.showAverageRating,
      showRatingDistribution:
        r.showRatingDistribution ??
        DEFAULT_STORE_OPTIONS.reviews.showRatingDistribution,
      showRecommendationPercentage:
        r.showRecommendationPercentage ??
        DEFAULT_STORE_OPTIONS.reviews.showRecommendationPercentage,
      showCustomerPhotosFirst:
        r.showCustomerPhotosFirst ??
        DEFAULT_STORE_OPTIONS.reviews.showCustomerPhotosFirst,

      defaultSort:
        r.defaultSort ?? DEFAULT_STORE_OPTIONS.reviews.defaultSort,

      featuredFirst:
        r.featuredFirst ?? DEFAULT_STORE_OPTIONS.reviews.featuredFirst,
      verifiedPurchaseFirst:
        r.verifiedPurchaseFirst ??
        DEFAULT_STORE_OPTIONS.reviews.verifiedPurchaseFirst,

      minimumCommentLength:
        Number(
          r.minimumCommentLength ??
            DEFAULT_STORE_OPTIONS.reviews.minimumCommentLength
        ) || 3,
      maximumCommentLength:
        Number(
          r.maximumCommentLength ??
            DEFAULT_STORE_OPTIONS.reviews.maximumCommentLength
        ) || 1200,

      autoPublishQuestions:
        r.autoPublishQuestions ??
        DEFAULT_STORE_OPTIONS.reviews.autoPublishQuestions,
      productQuestionsEnabled:
        r.productQuestionsEnabled ??
        DEFAULT_STORE_OPTIONS.reviews.productQuestionsEnabled,
      pageQuestionsEnabled:
        r.pageQuestionsEnabled ??
        DEFAULT_STORE_OPTIONS.reviews.pageQuestionsEnabled,
      allowGuestQuestions:
        r.allowGuestQuestions ??
        DEFAULT_STORE_OPTIONS.reviews.allowGuestQuestions,
    };
  }

  // ✅ ربط مباشر من سويتشات الإدارة الحالية
  if (g("switch_publish_comments")?.enabled !== undefined) {
    o.reviews.autoPublishQuestions =
      g("switch_publish_comments").enabled === true;
  }

  if (g("switch_pages_feedback_enable")?.enabled !== undefined) {
    o.reviews.pageQuestionsEnabled =
      g("switch_pages_feedback_enable").enabled === true;
  }

  if (g("switch_products_feedback_enable")?.enabled !== undefined) {
    o.reviews.productQuestionsEnabled =
      g("switch_products_feedback_enable").enabled === true;
  }

  if (g("switch_products_feedback_disable_guest")?.enabled !== undefined) {
    o.reviews.allowGuestQuestions =
      g("switch_products_feedback_disable_guest").enabled === true
        ? false
        : true;
  }

  return o;
}

// ===============================
// إبقاء نفس الواجهات بدون كاش فعلي
// ===============================

export function getStoreOptionsCached(
  items: Record<string, any>
): StoreOptions {
  return parseStoreOptions(items);
}

export function clearStoreOptionsCache() {
  // no-op
}