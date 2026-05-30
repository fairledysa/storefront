// FILE: apps/storefront/src/data/pages/home.loader.ts

import { unstable_cache } from "next/cache";
import { createHash } from "node:crypto";

import { cacheKey } from "@/data/cache/cache-keys";
import { redisCached } from "@/data/cache/redis-cache.server";
import {
  getBestSellingProductsForGrid,
  getProductsByIds,
  getProductsForGrid,
} from "@/data/catalog/products";
import { getStoreDb } from "@/data/db/store-db.server";

function s(value: any) {
  return String(value ?? "").trim();
}

function safeObject(value: any): Record<string, any> {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;
  return {};
}

function hashText(value: string) {
  return createHash("sha1").update(value).digest("hex");
}

function getEnabledHomepageSections(themeOptions: any) {
  const sections = Array.isArray(themeOptions?.homepage?.sections)
    ? themeOptions.homepage.sections
    : [];

  return sections.filter((section: any) => section && section.enabled !== false);
}

function getSectionKey(section: any) {
  return s(
    section?.key ||
      section?.component_key ||
      section?.componentKey ||
      section?.slug ||
      section?.component_slug ||
      section?.componentSlug ||
      section?.renderKey ||
      section?.raw?.key ||
      section?.raw?.id,
  ).toLowerCase();
}

function walkAnyValue(
  value: any,
  visit: (value: any, key?: string) => void,
  seen = new WeakSet<object>(),
  key?: string,
) {
  if (!value) return;

  visit(value, key);

  if (Array.isArray(value)) {
    for (const item of value) {
      walkAnyValue(item, visit, seen);
    }

    return;
  }

  if (typeof value !== "object") return;

  if (seen.has(value)) return;
  seen.add(value);

  for (const [nextKey, nextValue] of Object.entries(value)) {
    walkAnyValue(nextValue, visit, seen, nextKey);
  }
}

function hasTextInAnyValue(value: any, patterns: string[]) {
  let found = false;

  walkAnyValue(value, (current) => {
    if (found) return;

    if (typeof current !== "string" && typeof current !== "number") return;

    const text = s(current).toLowerCase();
    if (!text) return;

    found = patterns.some((pattern) => text.includes(pattern));
  });

  return found;
}

function hasHomepageSections(themeOptions: any) {
  return getEnabledHomepageSections(themeOptions).length > 0;
}

function homepageNeedsProducts(themeOptions: any) {
  const sections = getEnabledHomepageSections(themeOptions);

  if (!sections.length) return true;

  return sections.some((section: any) => {
    const key = getSectionKey(section);

    return (
      key.includes("product") ||
      key.includes("products") ||
      key.includes("collection") ||
      key.includes("tabs")
    );
  });
}

function homepageNeedsBestSellingProducts(themeOptions: any) {
  const sections = getEnabledHomepageSections(themeOptions);

  if (!sections.length) return true;

  return sections.some((section: any) => {
    const key = getSectionKey(section);
    const values = section?.values;

    if (!key.includes("product") && !key.includes("collection")) return false;

    return hasTextInAnyValue(values, [
      "best_selling",
      "best-selling",
      "bestselling",
      "best selling",
      "bestSelling",
      "most_sold",
      "top_selling",
      "الأكثر",
      "اكثر",
    ]);
  });
}

function homepageNeedsReviews(themeOptions: any) {
  const sections = getEnabledHomepageSections(themeOptions);

  if (!sections.length) return true;

  return sections.some((section: any) => {
    const key = getSectionKey(section);

    return (
      key.includes("testimonial") ||
      key.includes("testimonials") ||
      key.includes("review") ||
      key.includes("reviews") ||
      key.includes("rating") ||
      key.includes("ratings")
    );
  });
}

function isRealUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normalizeProductId(value: any) {
  if (!value) return "";

  if (typeof value === "string" || typeof value === "number") return s(value);

  if (typeof value === "object") {
    return (
      s(value.id) ||
      s(value.value) ||
      s(value.product_id) ||
      s(value.productId) ||
      s(value.uuid)
    );
  }

  return "";
}

function normalizeCategoryId(value: any) {
  if (!value) return "";

  if (typeof value === "string" || typeof value === "number") return s(value);

  if (typeof value === "object") {
    return (
      s(value.value) ||
      s(value.id) ||
      s(value.category_id) ||
      s(value.categoryId) ||
      s(value.target_id) ||
      s(value.targetId) ||
      s(value.uuid) ||
      s(value.public_no) ||
      s(value.publicNo) ||
      s(value.slug)
    );
  }

  return "";
}

function normalizeLinkType(value: any) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";

  return s(
    value.type ||
      value.link_type ||
      value.linkType ||
      value.kind ||
      value.target_type ||
      value.targetType ||
      value.url_type ||
      value.urlType,
  ).toLowerCase();
}

function collectProductIdsFromAnyValue(value: any, out: Set<string>) {
  if (!value) return;

  if (Array.isArray(value)) {
    for (const item of value) {
      collectProductIdsFromAnyValue(item, out);
    }

    return;
  }

  if (typeof value !== "object") return;

  if (value.link) {
    collectProductIdsFromAnyValue(value.link, out);
  }

  const type = normalizeLinkType(value);

  if (type === "product") {
    const id = normalizeProductId(value);
    if (id) out.add(id);
  }

  for (const key of [
    "product",
    "selected_product",
    "selectedProduct",
    "product_id",
    "productId",
    "products",
    "product_ids",
    "productIds",
    "selected_products",
    "selectedProducts",
  ]) {
    const next = value[key];
    if (!next) continue;

    if (
      key === "product_id" ||
      key === "productId" ||
      key === "selected_product" ||
      key === "selectedProduct"
    ) {
      const id = normalizeProductId(next);
      if (id) out.add(id);
      continue;
    }

    collectProductIdsFromAnyValue(next, out);
  }

  for (const key of [
    "field_1",
    "field_2",
    "field_3",
    "field_4",
    "field_5",
    "field_6",
    "field_7",
    "field_8",
    "field_9",
    "field_10",
    "field_11",
    "field_12",
    "field_13",
    "link",
    "href",
    "target",
    "url",
    "items",
    "rows",
    "banners",
    "links",
    "images",
    "tabs",
  ]) {
    const next = value[key];
    if (!next) continue;

    if (
      next &&
      typeof next === "object" &&
      !Array.isArray(next) &&
      normalizeLinkType(next) === "product"
    ) {
      const id = normalizeProductId(next);
      if (id) out.add(id);
      continue;
    }

    if (
      key === "items" ||
      key === "rows" ||
      key === "banners" ||
      key === "links" ||
      key === "images" ||
      key === "tabs"
    ) {
      collectProductIdsFromAnyValue(next, out);
    }
  }
}

function isExternalOrPathValue(value: string) {
  const text = s(value);

  return (
    !text ||
    text.startsWith("/") ||
    text.startsWith("#") ||
    text.startsWith("http://") ||
    text.startsWith("https://") ||
    text.startsWith("mailto:") ||
    text.startsWith("tel:") ||
    text.startsWith("whatsapp:")
  );
}

function collectCategoryIdFromCategoryLink(value: any, out: Set<string>) {
  if (!value) return;

  if (Array.isArray(value)) {
    for (const item of value) {
      collectCategoryIdFromCategoryLink(item, out);
    }

    return;
  }

  if (typeof value === "string" || typeof value === "number") {
    const id = s(value);

    if (id && !isExternalOrPathValue(id)) {
      out.add(id);
    }

    return;
  }

  if (typeof value !== "object") return;

  if (value.link) {
    collectCategoryIdFromCategoryLink(value.link, out);
  }

  const id = normalizeCategoryId(value);

  if (id && !isExternalOrPathValue(id)) {
    out.add(id);
  }
}

function collectCategoryIdsFromAnyValue(
  value: any,
  out: Set<string>,
  seen = new WeakSet<object>(),
) {
  if (!value) return;

  if (Array.isArray(value)) {
    for (const item of value) {
      collectCategoryIdsFromAnyValue(item, out, seen);
    }

    return;
  }

  if (typeof value !== "object") return;

  if (seen.has(value)) return;
  seen.add(value);

  const type = normalizeLinkType(value);

  if (type === "category") {
    collectCategoryIdFromCategoryLink(value, out);
  }

  if (value.link) {
    collectCategoryIdsFromAnyValue(value.link, out, seen);
  }

  for (const key of [
    "category",
    "selected_category",
    "selectedCategory",
    "category_id",
    "categoryId",
    "categories",
    "selected_categories",
    "selectedCategories",
  ]) {
    if (value[key]) {
      collectCategoryIdFromCategoryLink(value[key], out);
    }
  }

  for (const [key, next] of Object.entries(value)) {
    if (!next) continue;

    if (
      key === "category_id" ||
      key === "categoryId" ||
      key === "target_id" ||
      key === "targetId"
    ) {
      if (type === "category") {
        collectCategoryIdFromCategoryLink(next, out);
      }

      continue;
    }

    if (Array.isArray(next)) {
      collectCategoryIdsFromAnyValue(next, out, seen);
      continue;
    }

    if (typeof next === "object") {
      const nextType = normalizeLinkType(next);

      if (nextType === "category") {
        collectCategoryIdFromCategoryLink(next, out);
        continue;
      }

      collectCategoryIdsFromAnyValue(next, out, seen);
    }
  }
}

function collectManualProductsFromHomepageThemeOptions(themeOptions: any) {
  const ids = new Set<string>();

  const homepageSections = Array.isArray(themeOptions?.homepage?.sections)
    ? themeOptions.homepage.sections
    : [];

  for (const section of homepageSections) {
    if (!section || section.enabled === false) continue;

    const key = s(
      section.key ||
        section.component_key ||
        section.componentKey ||
        section.slug ||
        section.component_slug ||
        section.componentSlug,
    ).toLowerCase();

    const rawValues = safeObject(section.values);

    const isProductsTabs =
      key === "products_tabs" ||
      key.includes("products_tabs") ||
      key.includes("product_tabs");

    if (!isProductsTabs) continue;

    const rows =
      rawValues.field_1 ||
      rawValues.tabs ||
      rawValues.items ||
      rawValues.products_tabs ||
      [];

    if (!Array.isArray(rows)) continue;

    for (const row of rows) {
      if (!row || typeof row !== "object") continue;

      const source = s(
        row.field_2 || row.source || row.products_source,
      ).toLowerCase();

      if (source !== "manual") continue;

      collectProductIdsFromAnyValue(
        row.field_3 ||
          row.product_ids ||
          row.productIds ||
          row.products ||
          row.selected_products ||
          row.selectedProducts,
        ids,
      );
    }
  }

  return Array.from(ids).filter(Boolean).slice(0, 80);
}

function collectCountdownOfferProductIdsFromHomepageThemeOptions(
  themeOptions: any,
) {
  const ids = new Set<string>();

  const homepageSections = Array.isArray(themeOptions?.homepage?.sections)
    ? themeOptions.homepage.sections
    : [];

  for (const section of homepageSections) {
    if (!section || section.enabled === false) continue;

    const key = getSectionKey(section);

    if (key !== "countdown_offer" && !key.includes("countdown_offer")) {
      continue;
    }

    const values = safeObject(section.values);
    const field4 = values?.field_4;

    const buttonLink =
      field4 && typeof field4 === "object" && !Array.isArray(field4)
        ? field4.link ?? field4
        : null;

    if (
      buttonLink &&
      typeof buttonLink === "object" &&
      !Array.isArray(buttonLink) &&
      normalizeLinkType(buttonLink) === "product"
    ) {
      const id = normalizeProductId(buttonLink);
      if (id) ids.add(id);
    }
  }

  return Array.from(ids).filter(Boolean).slice(0, 10);
}

function collectLinkedCategoriesFromHomepageThemeOptions(themeOptions: any) {
  const ids = new Set<string>();

  const homepageSections = Array.isArray(themeOptions?.homepage?.sections)
    ? themeOptions.homepage.sections
    : [];

  for (const section of homepageSections) {
    if (!section || section.enabled === false) continue;

    collectCategoryIdsFromAnyValue(section.values, ids);
  }

  return Array.from(ids).filter(Boolean).slice(0, 200);
}

async function loadLinkedProductsByIdRaw(args: {
  store_id: string;
  productIds: string[];
}) {
  const ids = Array.from(new Set(args.productIds.map(s).filter(Boolean)));
  if (!ids.length) return {};

  const products = await getProductsByIds({
    store_id: args.store_id,
    ids,
    limit: ids.length,
  });

  const map: Record<string, any> = {};

  for (const product of Array.isArray(products) ? products : []) {
    const id = s(product?.id);
    if (!id) continue;

    map[id] = product;
  }

  return map;
}

async function loadLinkedCategoriesByIdRaw(args: {
  store_id: string;
  categoryIds: string[];
}) {
  const ids = Array.from(new Set(args.categoryIds.map(s).filter(Boolean)));
  if (!ids.length) return {};

  const sb = await getStoreDb(args.store_id);

  const uuidIds = ids.filter((id) => isRealUuid(id));

  const publicNos = ids
    .filter((id) => /^\d+$/.test(id))
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id));

  const slugs = ids.filter(
    (id) =>
      !isRealUuid(id) &&
      !/^\d+$/.test(id) &&
      !id.startsWith("/") &&
      !id.startsWith("#") &&
      !id.startsWith("http://") &&
      !id.startsWith("https://"),
  );

  const select = "id,name,slug,public_no,parent_id,sort_order,depth,path,status";

  const results: any[] = [];

  if (uuidIds.length) {
    const result = await sb
      .from("categories")
      .select(select)
      .eq("store_id", args.store_id)
      .in("id", uuidIds);

    results.push(result);
  }

  if (publicNos.length) {
    const result = await sb
      .from("categories")
      .select(select)
      .eq("store_id", args.store_id)
      .in("public_no", publicNos);

    results.push(result);
  }

  if (slugs.length) {
    const result = await sb
      .from("categories")
      .select(select)
      .eq("store_id", args.store_id)
      .in("slug", slugs);

    results.push(result);
  }

  const map: Record<string, any> = {};

  for (const result of results) {
    if (result?.error || !Array.isArray(result?.data)) {
      if (result?.error) {
        console.error("HOME_LINKED_CATEGORIES_LOAD_FAILED", result.error);
      }

      continue;
    }

    for (const category of result.data) {
      if (!category?.id) continue;

      const row = {
        ...category,
        title: category.name,
        label: category.name,
        short_url: null,
        shortUrl: null,
      };

      const keys = [
        s(category.id),
        s(category.public_no),
        s(category.slug),
      ].filter(Boolean);

      for (const key of keys) {
        map[key] = row;
      }
    }
  }

  return map;
}

const linkedProductsCache = new Map<string, () => Promise<Record<string, any>>>();

function loadLinkedProductsById(args: {
  store_id: string;
  productIds: string[];
}) {
  const ids = Array.from(new Set(args.productIds.map(s).filter(Boolean))).sort();

  if (!ids.length) return Promise.resolve({});

  const idsFingerprint = ids.join(",");
  const idsHash = hashText(idsFingerprint);
  const key = `${args.store_id}:${idsHash}`;

  let fn = linkedProductsCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey("home", "linked-products", args.store_id, idsHash),
          { ttlSeconds: 180 },
          () =>
            loadLinkedProductsByIdRaw({
              store_id: args.store_id,
              productIds: ids,
            }),
        ),
      ["homepage-linked-products", args.store_id, idsHash],
      { revalidate: 120 },
    );

    linkedProductsCache.set(key, fn);
  }

  return fn();
}

const linkedCategoriesCache = new Map<
  string,
  () => Promise<Record<string, any>>
>();

function loadLinkedCategoriesById(args: {
  store_id: string;
  categoryIds: string[];
}) {
  const ids = Array.from(new Set(args.categoryIds.map(s).filter(Boolean))).sort();

  if (!ids.length) return Promise.resolve({});

  const idsFingerprint = ids.join(",");
  const idsHash = hashText(idsFingerprint);
  const key = `${args.store_id}:${idsHash}`;

  let fn = linkedCategoriesCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey("home", "linked-categories", args.store_id, idsHash),
          { ttlSeconds: 300 },
          () =>
            loadLinkedCategoriesByIdRaw({
              store_id: args.store_id,
              categoryIds: ids,
            }),
        ),
      ["homepage-linked-categories", args.store_id, idsHash],
      { revalidate: 120 },
    );

    linkedCategoriesCache.set(key, fn);
  }

  return fn();
}

function customerNameFromReview(review: any) {
  const customer = Array.isArray(review?.customers)
    ? review.customers[0]
    : review?.customers;

  return (
    s(review?.author_name) ||
    s(customer?.full_name) ||
    s(review?.author_email) ||
    "عميل"
  );
}

function normalizeStoreReview(review: any) {
  const name = customerNameFromReview(review);
  const body = s(review?.body);
  const title = s(review?.title);
  const createdAt = review?.published_at || review?.created_at || null;

  return {
    id: String(review?.id ?? ""),

    rating: Number(review?.rating ?? 5),

    title,
    body,
    text: body || title,
    comment: body || title,
    content: body || title,
    message: body || title,
    review: body || title,
    description: body || title,

    author_name: name,
    authorName: name,
    customer_name: name,
    customerName: name,
    name,

    role: review?.is_verified_purchase ? "عميل موثّق" : "",

    avatar: "",
    image: "",

    is_verified_purchase: Boolean(review?.is_verified_purchase),
    isVerifiedPurchase: Boolean(review?.is_verified_purchase),

    is_guest: Boolean(review?.is_guest),
    isGuest: Boolean(review?.is_guest),

    is_pinned: Boolean(review?.is_pinned),
    isPinned: Boolean(review?.is_pinned),

    is_featured: Boolean(review?.is_featured),
    isFeatured: Boolean(review?.is_featured),

    helpful_count: Number(review?.helpful_count ?? 0),
    helpfulCount: Number(review?.helpful_count ?? 0),

    published_at: review?.published_at ?? createdAt,
    publishedAt: review?.published_at ?? createdAt,

    created_at: review?.created_at ?? createdAt,
    createdAt: review?.created_at ?? createdAt,
  };
}

async function loadStoreReviewsRaw(storeId: string) {
  const sb = await getStoreDb(storeId);

  const baseSelect = `
    id,
    rating,
    title,
    body,
    author_name,
    author_email,
    is_verified_purchase,
    is_guest,
    is_pinned,
    is_featured,
    helpful_count,
    published_at,
    created_at,
    customers (
      id,
      full_name
    )
  `;

  const exact = await sb
    .from("review_entries")
    .select(baseSelect)
    .eq("store_id", storeId)
    .eq("target_type", "store")
    .eq("target_id", storeId)
    .eq("review_type", "review")
    .eq("status", "published")
    .not("rating", "is", null)
    .order("is_pinned", { ascending: false })
    .order("is_featured", { ascending: false })
    .order("rating", { ascending: false })
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(24);

  if (!exact.error && Array.isArray(exact.data) && exact.data.length) {
    return exact.data
      .map((review: any) => normalizeStoreReview(review))
      .filter((review: any) => review.text && review.rating > 0);
  }

  const fallback = await sb
    .from("review_entries")
    .select(baseSelect)
    .eq("store_id", storeId)
    .eq("target_type", "store")
    .eq("review_type", "review")
    .eq("status", "published")
    .not("rating", "is", null)
    .order("is_pinned", { ascending: false })
    .order("is_featured", { ascending: false })
    .order("rating", { ascending: false })
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(24);

  if (fallback.error || !Array.isArray(fallback.data)) return [];

  return fallback.data
    .map((review: any) => normalizeStoreReview(review))
    .filter((review: any) => review.text && review.rating > 0);
}

const storeReviewsCache = new Map<string, () => Promise<any[]>>();

function loadStoreReviews(storeId: string) {
  let fn = storeReviewsCache.get(storeId);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey("home", "store-reviews", storeId),
          { ttlSeconds: 180 },
          () => loadStoreReviewsRaw(storeId),
        ),
      ["homepage-store-reviews", storeId],
      { revalidate: 120 },
    );

    storeReviewsCache.set(storeId, fn);
  }

  return fn();
}

async function loadHomePageRaw(args: {
  store_id: string;
  limit: number;
  themeOptions: Record<string, any>;
}) {
  const hasSections = hasHomepageSections(args.themeOptions);

  const needsProducts = !hasSections || homepageNeedsProducts(args.themeOptions);
  const needsBestSellingProducts =
    !hasSections || homepageNeedsBestSellingProducts(args.themeOptions);
  const needsReviews = !hasSections || homepageNeedsReviews(args.themeOptions);

  const manualProductIds =
    collectManualProductsFromHomepageThemeOptions(args.themeOptions);

  const countdownOfferProductIds =
    collectCountdownOfferProductIdsFromHomepageThemeOptions(args.themeOptions);

  const linkedProductIds = Array.from(
    new Set(
      [...manualProductIds, ...countdownOfferProductIds].map(s).filter(Boolean),
    ),
  ).slice(0, 100);

  const linkedCategoryIds =
    collectLinkedCategoriesFromHomepageThemeOptions(args.themeOptions);

  const [
    products,
    bestSellingProducts,
    linkedProductsById,
    linkedCategoriesById,
    storeReviews,
  ] = await Promise.all([
    needsProducts
      ? getProductsForGrid({
          store_id: args.store_id,
          limit: args.limit,
        })
      : Promise.resolve([]),

    needsBestSellingProducts
      ? getBestSellingProductsForGrid({
          store_id: args.store_id,
          limit: args.limit,
        })
      : Promise.resolve([]),

    linkedProductIds.length
      ? loadLinkedProductsById({
          store_id: args.store_id,
          productIds: linkedProductIds,
        })
      : Promise.resolve({}),

    linkedCategoryIds.length
      ? loadLinkedCategoriesById({
          store_id: args.store_id,
          categoryIds: linkedCategoryIds,
        })
      : Promise.resolve({}),

    needsReviews ? loadStoreReviews(args.store_id) : Promise.resolve([]),
  ]);

  return {
    products,
    bestSellingProducts,

    linkedProductsById,
    linked_products_by_id: linkedProductsById,

    linkedCategoriesById,
    linked_categories_by_id: linkedCategoriesById,

    storeReviews,
    store_reviews: storeReviews,
    testimonials: storeReviews,
    reviews: storeReviews,

    homepage: {
      linkedProductsById,
      linked_products_by_id: linkedProductsById,

      linkedCategoriesById,
      linked_categories_by_id: linkedCategoriesById,

      storeReviews,
      store_reviews: storeReviews,
      testimonials: storeReviews,
      reviews: storeReviews,
    },

    themeData: {
      linkedProductsById,
      linked_products_by_id: linkedProductsById,

      linkedCategoriesById,
      linked_categories_by_id: linkedCategoriesById,

      storeReviews,
      store_reviews: storeReviews,
      testimonials: storeReviews,
      reviews: storeReviews,
    },

    theme_data: {
      linkedProductsById,
      linked_products_by_id: linkedProductsById,

      linkedCategoriesById,
      linked_categories_by_id: linkedCategoriesById,

      storeReviews,
      store_reviews: storeReviews,
      testimonials: storeReviews,
      reviews: storeReviews,
    },
  };
}

const homePageCache = new Map<string, () => Promise<any>>();

export async function loadHomePage(args: {
  store_id: string;
  limit?: number;
  themeOptions?: Record<string, any>;
}) {
  const limit = Math.min(Math.max(Number(args.limit ?? 24), 1), 60);
  const themeOptions = safeObject(args.themeOptions);

  const sectionsFingerprint = JSON.stringify(
    Array.isArray(themeOptions?.homepage?.sections)
      ? themeOptions.homepage.sections.map((section: any) => ({
          id: section?.id ?? null,
          key:
            section?.key ??
            section?.component_key ??
            section?.componentKey ??
            section?.slug ??
            null,
          enabled: section?.enabled !== false,
          values: section?.values ?? null,
        }))
      : [],
  );

  const sectionsHash = hashText(sectionsFingerprint);
  const key = `${args.store_id}:${limit}:${sectionsHash}`;

  let fn = homePageCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey("home", "page", args.store_id, String(limit), sectionsHash),
          { ttlSeconds: 90 },
          () =>
            loadHomePageRaw({
              store_id: args.store_id,
              limit,
              themeOptions,
            }),
        ),
      ["homepage-data", args.store_id, String(limit), sectionsHash],
      { revalidate: 60 },
    );

    homePageCache.set(key, fn);
  }

  return fn();
}