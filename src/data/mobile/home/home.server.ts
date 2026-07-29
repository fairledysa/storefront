import "server-only";

import { getCategoriesForGrid } from "@/data/catalog/categories";
import {
  getBestSellingProductsForGrid,
  getProductsForGrid
} from "@/data/catalog/products";
import { getStoreDb } from "@/data/db/store-db.server";
import { getStoreOptions } from "@/data/store/options";

import type { BootstrapRequest } from "../bootstrap/bootstrap.types";
import { getMobileCommerceContext } from "../commerce-context.server";
import { buildMobileProductCard } from "../mobile-product-card.server";
import { resolveActiveMobileStoreApp } from "../store-app.server";
import type { MobileHomePayload, MobileHomeSection, MobileRatingSettings, MobileStoreReview } from "./home.types";
import { buildMobileProductOptions } from "../product-options.server";
import { canShowPurchaseCount, loadProductSocialPolicy, loadProductSocialStats } from "../product-social.server";
import { loadMobileProductMarketingMap } from "../marketing/marketing.server";

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function number(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function maskPublicName(value: unknown) {
  const source = text(value) || "عميل";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      const chars = Array.from(part);
      if (chars.length <= 1) return `${chars[0] ?? "ع"}**`;
      if (chars.length === 2) return `${chars[0]}**`;
      return `${chars[0]}${"*".repeat(Math.max(2, chars.length - 2))}${chars[chars.length - 1]}`;
    })
    .join(" ");
}

function readRatingSettings(value: unknown): MobileRatingSettings & {
  publish_ratings: boolean;
  publish_testimonials: boolean;
  testimonials_enabled: boolean;
  featured_first: boolean;
  verified_purchase_first: boolean;
  default_sort: string;
} {
  const source = object(value);
  return {
    enabled: bool(source.ratingEnabled, true),
    publish_ratings: bool(source.publishRatings, true),
    publish_testimonials: bool(source.publishTestimonials, true),
    testimonials_enabled: bool(source.testimonialsEnabled, true),
    allow_hidden_names: bool(source.allowHiddenNames, false),
    show_rating_summary: bool(source.showRatingSummary, true),
    show_recommendation: bool(source.showRecommendation, true),
    display_testimonials: bool(source.displayTestimonials, true),
    display_customer_reviews: bool(source.displayCustomerReviews, true),
    featured_first: bool(source.featuredFirst, true),
    verified_purchase_first: bool(source.verifiedPurchaseFirst, true),
    default_sort: text(source.defaultSort) || "featured",
  };
}

async function loadMobileStoreReviews(args: {
  storeDb: any;
  storeId: string;
  sections: MobileHomeSection[];
  storeOptions: Awaited<ReturnType<typeof getStoreOptions>>;
}) {
  const reviewSections = args.sections.filter((section) => section.type === "reviews" && section.enabled);
  const requestedLimit = reviewSections.length
    ? Math.min(24, Math.max(...reviewSections.map((section) => Number(section.config.limit ?? section.item_count ?? 6))))
    : 0;
  const minimumRating = reviewSections.length
    ? Math.max(1, Math.min(5, Math.min(...reviewSections.map((section) => Number(section.config.minimum_rating ?? 1)))))
    : 1;

  const settingResult = await args.storeDb
    .from("store_settings")
    .select("value")
    .eq("store_id", args.storeId)
    .eq("slug", "rating_settings")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const ratingSettings = readRatingSettings(settingResult.data?.value);
  ratingSettings.featured_first = args.storeOptions.reviews.featuredFirst;
  ratingSettings.verified_purchase_first = args.storeOptions.reviews.verifiedPurchaseFirst;
  ratingSettings.default_sort = args.storeOptions.reviews.defaultSort;

  const enabled = requestedLimit > 0
    && args.storeOptions.reviews.enabled
    && args.storeOptions.reviews.storeReviewsEnabled
    && ratingSettings.enabled
    && ratingSettings.publish_ratings
    && ratingSettings.publish_testimonials
    && ratingSettings.testimonials_enabled
    && ratingSettings.display_testimonials
    && ratingSettings.display_customer_reviews;

  if (!enabled) {
    return { reviews: [] as MobileStoreReview[], ratingSettings };
  }

  let query = args.storeDb
    .from("review_entries")
    .select(`
      id,
      rating,
      title,
      body,
      author_name,
      is_verified_purchase,
      is_featured,
      is_pinned,
      helpful_count,
      published_at,
      created_at,
      customers(full_name)
    `)
    .eq("store_id", args.storeId)
    .eq("target_type", "store")
    .eq("review_type", "review")
    .eq("status", "published")
    .gte("rating", minimumRating);

  query = query.order("is_pinned", { ascending: false });
  if (ratingSettings.featured_first) query = query.order("is_featured", { ascending: false });
  if (ratingSettings.verified_purchase_first) query = query.order("is_verified_purchase", { ascending: false });

  switch (ratingSettings.default_sort) {
    case "oldest":
      query = query.order("published_at", { ascending: true, nullsFirst: false });
      break;
    case "highest_rating":
      query = query.order("rating", { ascending: false });
      break;
    case "lowest_rating":
      query = query.order("rating", { ascending: true });
      break;
    case "most_helpful":
      query = query.order("helpful_count", { ascending: false });
      break;
    case "newest":
    case "featured":
    default:
      query = query.order("published_at", { ascending: false, nullsFirst: false });
      break;
  }

  const result = await query.order("created_at", { ascending: false }).limit(requestedLimit);
  if (result.error || !Array.isArray(result.data)) {
    console.error("[mobile-home] failed to load store reviews", result.error);
    return { reviews: [] as MobileStoreReview[], ratingSettings };
  }

  const reviews = result.data
    .map((row: any) => {
      const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
      const rawName = text(row.author_name) || text(customer?.full_name) || "عميل";
      const body = text(row.body) || text(row.title);
      if (!body) return null;
      return {
        id: String(row.id),
        rating: Math.max(1, Math.min(5, Number(row.rating ?? 5))),
        title: text(row.title) || null,
        body,
        author_name: ratingSettings.allow_hidden_names ? maskPublicName(rawName) : rawName,
        published_at: row.published_at ?? row.created_at ?? null,
        is_verified_purchase: row.is_verified_purchase === true,
        is_featured: row.is_featured === true || row.is_pinned === true,
        helpful_count: Math.max(0, Number(row.helpful_count ?? 0)),
      } satisfies MobileStoreReview;
    })
    .filter((item: MobileStoreReview | null): item is MobileStoreReview => item !== null);

  return { reviews, ratingSettings };
}

function readSections(branding: unknown): MobileHomeSection[] {
  const source = object(branding);
  const nativeDesign = object(source.native_design);
  const homeLayout = object(nativeDesign.home_layout);
  const items = Array.isArray(homeLayout.items) ? homeLayout.items : [];

  return items
    .filter((entry) => entry && typeof entry === "object")
    .map((entry, index) => {
      const item = object(entry);
      const colors = object(item.colors);
      return {
        id: String(item.id ?? `section-${index + 1}`),
        type: String(item.type ?? "featured_products"),
        enabled: item.enabled !== false,
        title: typeof item.title === "string" ? item.title : null,
        subtitle: typeof item.subtitle === "string" ? item.subtitle : null,
        display_style: String(item.display_style ?? "cards"),
        item_count: Math.max(1, Math.min(20, Number(item.item_count ?? 6))),
        image_size: String(item.image_size ?? "medium"),
        radius: String(item.radius ?? "rounded"),
        spacing: String(item.spacing ?? "medium"),
        colors: {
          background: String(colors.background ?? "#FFFFFF"),
          text: String(colors.text ?? "#172126"),
        },
        config: object(item.config),
      };
    })
    .filter((item) => item.enabled);
}


export async function getMobileHome(input: BootstrapRequest): Promise<MobileHomePayload> {
  const app = await resolveActiveMobileStoreApp(input.publicAppId);
  const storeId = app.storeId;
  const commerceContext = await getMobileCommerceContext(app, input);
  const storeDb = (await getStoreDb(storeId)) as any;
  const sections = readSections(app.branding);
  const maxProducts = Math.max(
    8,
    ...sections
      .filter((section) => ["featured_products", "carousel_products", "products", "static_products"].includes(section.type))
      .map((section) => section.item_count),
  );

  const [categories, products, bestSelling, storeOptions, checkoutResult, walletResult, paymentResult, orderOptionsResult] = await Promise.all([
    getCategoriesForGrid({ store_id: storeId, limit: 24, source: "top_level" }),
    getProductsForGrid({ store_id: storeId, limit: Math.min(maxProducts, 60) }),
    getBestSellingProductsForGrid({ store_id: storeId, limit: Math.min(maxProducts, 60) }),
    getStoreOptions(storeId),
    storeDb.from("store_checkout_settings").select("prefill_from_last_order,company_purchase_enabled").eq("store_id", storeId).maybeSingle(),
    storeDb.from("store_wallet_settings").select("wallet_enabled,checkout_enabled,partial_payment_enabled,gifting_enabled").eq("store_id", storeId).maybeSingle(),
    storeDb.from("store_payment_methods").select("provider_code,enabled,status,sort_order").eq("store_id", storeId).eq("enabled", true).order("sort_order", { ascending: true }),
    storeDb.from("store_order_options").select("id", { count: "exact", head: true }).eq("store_id", storeId).eq("status", "active"),
  ]);

  const reviewData = await loadMobileStoreReviews({ storeDb, storeId, sections, storeOptions });
  const [socialPolicy, socialStats, productMarketing] = await Promise.all([
    loadProductSocialPolicy(storeId, storeOptions),
    loadProductSocialStats(storeId, [...products, ...bestSelling]),
    loadMobileProductMarketingMap({ storeId, productIds: [...products, ...bestSelling].map((row) => String(row.id)) }),
  ]);

  return {
    config_version: app.configVersion,
    app_name_ar: app.appNameAr,
    branding: app.branding,
    navigation: app.navigation,
    currencies: commerceContext.currencies,
    tax: commerceContext.tax,
    sections,
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      public_no: category.public_no,
      image_url: category.image?.url ?? null,
    })),
    products: products.map((row) => {
      const stats = socialStats.get(row.id) ?? { rating: null, reviewCount: 0, soldQty: Math.max(0, Number(row.sold_qty ?? 0) || 0) };
      return buildMobileProductCard(row, storeOptions, buildMobileProductOptions(row), { ...stats, showRating: socialPolicy.showRatingsOnApp, showPurchaseCount: canShowPurchaseCount(socialPolicy, row) }, productMarketing.get(String(row.id)) ?? null, commerceContext);
    }),
    best_selling_products: bestSelling.map((row) => {
      const stats = socialStats.get(row.id) ?? { rating: null, reviewCount: 0, soldQty: Math.max(0, Number(row.sold_qty ?? 0) || 0) };
      return buildMobileProductCard(row, storeOptions, buildMobileProductOptions(row), { ...stats, showRating: socialPolicy.showRatingsOnApp, showPurchaseCount: canShowPurchaseCount(socialPolicy, row) }, productMarketing.get(String(row.id)) ?? null, commerceContext);
    }),
    reviews: reviewData.reviews,
    rating_settings: {
      enabled: reviewData.ratingSettings.enabled,
      allow_hidden_names: reviewData.ratingSettings.allow_hidden_names,
      show_rating_summary: reviewData.ratingSettings.show_rating_summary,
      show_recommendation: reviewData.ratingSettings.show_recommendation,
      display_testimonials: reviewData.ratingSettings.display_testimonials,
      display_customer_reviews: reviewData.ratingSettings.display_customer_reviews,
    },
    commerce: {
      checkout: {
        prefill_from_last_order: checkoutResult.data?.prefill_from_last_order !== false,
        company_purchase_enabled: checkoutResult.data?.company_purchase_enabled === true,
      },
      tax: {
        enabled: commerceContext.tax.enabled,
        prices_include_tax: commerceContext.tax.prices_include_tax,
        shipping_include_tax: commerceContext.tax.shipping_include_tax,
        tax_label: commerceContext.tax.tax_label,
      },
      wallet: {
        enabled: walletResult.data?.wallet_enabled === true,
        checkout_enabled: walletResult.data?.checkout_enabled === true,
        partial_payment_enabled: walletResult.data?.partial_payment_enabled === true,
        gifting_enabled: walletResult.data?.gifting_enabled === true,
      },
      payment_methods: (paymentResult.data ?? []).map((method: any) => ({
        provider_code: String(method.provider_code),
        enabled: method.enabled === true,
        status: String(method.status ?? "inactive"),
        sort_order: Number(method.sort_order ?? 0),
      })),
      order_options_enabled: Number(orderOptionsResult.count ?? 0) > 0,
      store_options: storeOptions,
    },
  };
}
