// FILE: apps/storefront/src/data/catalog/product-search-index.ts
import "server-only";

import { supabaseAdmin } from "@/data/store/supabase.server";
import { isProductVisibleInWeb } from "@/data/catalog/products";

const PRODUCT_SELECT =
  "id,store_id,name,description,status,public_no,created_at,brand_id,metadata,product_metadata(url,title,description)";

function s(value: unknown) {
  return String(value ?? "").trim();
}

function readOne(value: any) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
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

function firstText(...values: any[]) {
  for (const value of values) {
    const text = s(value);
    if (text) return text;
  }

  return "";
}

function firstNumber(...values: any[]) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;

    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }

  return null;
}

function normalizeArabic(value: unknown) {
  return s(value)
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ـ/g, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeProductSlug(name: string) {
  const raw = s(name)
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return raw || "product";
}

function normalizeShortPath(value: string) {
  const raw = s(value);
  if (!raw) return "";

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("/")
  ) {
    return raw;
  }

  return `/${raw}`;
}

function getProductMetadata(product: any) {
  return readOne(product?.product_metadata);
}

function buildProductHref(product: any) {
  const metadata = safeObject(product?.metadata);
  const productMetadata = getProductMetadata(product);

  const shortUrl = firstText(
    productMetadata?.url,
    product?.short_url,
    product?.shortUrl,
    product?.short_code,
    product?.shortCode,
    metadata.short_url,
    metadata.shortUrl,
    metadata.short_code,
    metadata.shortCode,
  );

  if (shortUrl) return normalizeShortPath(shortUrl);

  const publicNo = firstNumber(
    product?.public_no,
    product?.publicNo,
    product?.public_number,
    product?.publicNumber,
    metadata.public_no,
    metadata.publicNo,
  );

  if (publicNo && publicNo > 0) {
    const slug = normalizeProductSlug(product?.name);
    return `/${slug}/p${publicNo}`;
  }

  return `/product/${product?.id}`;
}

function collectTextFromAny(value: any, out: string[], depth = 0) {
  if (depth > 5) return;
  if (value === null || value === undefined) return;

  if (typeof value === "string" || typeof value === "number") {
    const text = s(value);

    if (
      text &&
      !text.startsWith("http://") &&
      !text.startsWith("https://") &&
      !text.startsWith("data:")
    ) {
      out.push(text);
    }

    return;
  }

  if (typeof value === "boolean") return;

  if (Array.isArray(value)) {
    for (const item of value) {
      collectTextFromAny(item, out, depth + 1);
    }

    return;
  }

  if (typeof value === "object") {
    for (const item of Object.values(value)) {
      collectTextFromAny(item, out, depth + 1);
    }
  }
}

function uniqueText(values: unknown[]) {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const text = s(value);
    if (!text) continue;

    const key = normalizeArabic(text);
    if (!key) continue;
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(text);
  }

  return out;
}

function splitSuggestionTerms(values: unknown[]) {
  const terms: string[] = [];

  for (const value of values) {
    const text = s(value);
    if (!text) continue;

    terms.push(text);

    const words = text
      .replace(/[^\p{L}\p{N}\s]+/gu, " ")
      .split(/\s+/)
      .map((x) => x.trim())
      .filter((x) => x.length >= 2 && x.length <= 40);

    terms.push(...words);
  }

  return uniqueText(terms).slice(0, 80);
}

async function loadPricingMap(productIds: string[]) {
  if (!productIds.length) return new Map<string, any>();

  const sb = supabaseAdmin() as any;

  const { data } = await sb
    .from("product_pricing")
    .select("product_id,currency,price,sale_price,sale_end")
    .in("product_id", productIds);

  const map = new Map<string, any>();

  for (const row of data || []) {
    const productId = s(row?.product_id);
    if (!productId) continue;
    map.set(productId, row);
  }

  return map;
}

 async function loadMediaMap(productIds: string[]) {
  if (!productIds.length) return new Map<string, string>();

  const sb = supabaseAdmin() as any;

  const { data, error } = await sb
    .from("product_media")
    .select(
      "product_id,original_url,thumbnail_url,media_kind,is_default,sort_order,created_at",
    )
    .in("product_id", productIds);

  if (error || !Array.isArray(data)) {
    return new Map<string, string>();
  }

  const rows = [...data].sort((a: any, b: any) => {
    const aDefault = a?.is_default ? 1 : 0;
    const bDefault = b?.is_default ? 1 : 0;

    if (bDefault !== aDefault) return bDefault - aDefault;

    const aSort = Number(a?.sort_order ?? 0);
    const bSort = Number(b?.sort_order ?? 0);

    if (aSort !== bSort) return aSort - bSort;

    return (
      new Date(a?.created_at || 0).getTime() -
      new Date(b?.created_at || 0).getTime()
    );
  });

  const map = new Map<string, string>();

  for (const row of rows) {
    const productId = s(row?.product_id);
    if (!productId || map.has(productId)) continue;

    const url = firstText(row?.thumbnail_url, row?.original_url);

    if (url) map.set(productId, url);
  }

  return map;
}

async function loadBrandsMap(storeId: string, brandIds: string[]) {
  const cleanIds = Array.from(new Set(brandIds.map(s).filter(Boolean)));
  if (!cleanIds.length) return new Map<string, any>();

  const sb = supabaseAdmin() as any;

  const { data } = await sb
    .from("brands")
    .select("id,name,description,metadata,seo_description")
    .eq("store_id", storeId)
    .in("id", cleanIds);

  const map = new Map<string, any>();

  for (const row of data || []) {
    map.set(String(row.id), row);
  }

  return map;
}

async function loadCategoriesByProductId(productIds: string[]) {
  if (!productIds.length) return new Map<string, any[]>();

  const sb = supabaseAdmin() as any;

  const [a, b] = await Promise.all([
    sb
      .from("product_categories")
      .select("product_id,category_id,is_primary")
      .in("product_id", productIds),

    sb
      .from("category_products")
      .select("product_id,category_id")
      .in("product_id", productIds),
  ]);

  const links = [
    ...(Array.isArray(a.data) ? a.data : []),
    ...(Array.isArray(b.data) ? b.data : []),
  ];

  const categoryIds = Array.from(
    new Set(links.map((row: any) => s(row?.category_id)).filter(Boolean)),
  );

  const categoriesById = new Map<string, any>();

  if (categoryIds.length) {
    const { data } = await sb
      .from("categories")
      .select("id,name,slug,path,status")
      .in("id", categoryIds);

    for (const row of data || []) {
      categoriesById.set(String(row.id), row);
    }
  }

  const map = new Map<string, any[]>();

  for (const link of links) {
    const productId = s(link?.product_id);
    const categoryId = s(link?.category_id);
    const category = categoriesById.get(categoryId);

    if (!productId || !category) continue;

    const arr = map.get(productId) || [];
    arr.push(category);
    map.set(productId, arr);
  }

  return map;
}

async function loadOptionsByProductId(productIds: string[]) {
  if (!productIds.length) return new Map<string, any[]>();

  const sb = supabaseAdmin() as any;

  const { data: options } = await sb
    .from("product_options")
    .select("id,product_id,name,option_field_type,display_type")
    .in("product_id", productIds);

  const optionRows = Array.isArray(options) ? options : [];
  const optionIds = optionRows.map((row: any) => s(row?.id)).filter(Boolean);

  const valuesByOptionId = new Map<string, any[]>();

  if (optionIds.length) {
    const { data: values } = await sb
      .from("product_option_values")
      .select("option_id,name,display_value")
      .in("option_id", optionIds);

    for (const value of values || []) {
      const optionId = s(value?.option_id);
      if (!optionId) continue;

      const arr = valuesByOptionId.get(optionId) || [];
      arr.push(value);
      valuesByOptionId.set(optionId, arr);
    }
  }

  const map = new Map<string, any[]>();

  for (const option of optionRows) {
    const productId = s(option?.product_id);
    if (!productId) continue;

    const arr = map.get(productId) || [];

    arr.push({
      ...option,
      values: valuesByOptionId.get(s(option?.id)) || [],
    });

    map.set(productId, arr);
  }

  return map;
}

async function loadTagsByProductId(storeId: string, productIds: string[]) {
  if (!productIds.length) return new Map<string, any[]>();

  const sb = supabaseAdmin() as any;

  const { data: links } = await sb
    .from("product_tag_links")
    .select("product_id,tag_id")
    .in("product_id", productIds);

  const tagIds = Array.from(
    new Set((links || []).map((row: any) => s(row?.tag_id)).filter(Boolean)),
  );

  const tagsById = new Map<string, any>();

  if (tagIds.length) {
    const { data: tags } = await sb
      .from("product_tags")
      .select("id,name")
      .eq("store_id", storeId)
      .in("id", tagIds);

    for (const tag of tags || []) {
      tagsById.set(String(tag.id), tag);
    }
  }

  const map = new Map<string, any[]>();

  for (const link of links || []) {
    const productId = s(link?.product_id);
    const tag = tagsById.get(s(link?.tag_id));

    if (!productId || !tag) continue;

    const arr = map.get(productId) || [];
    arr.push(tag);
    map.set(productId, arr);
  }

  return map;
}

async function loadVariantsByProductId(productIds: string[]) {
  if (!productIds.length) return new Map<string, any[]>();

  const sb = supabaseAdmin() as any;

  const { data } = await sb
    .from("product_variants")
    .select("product_id,sku,barcode,mpn,gtin")
    .in("product_id", productIds);

  const map = new Map<string, any[]>();

  for (const row of data || []) {
    const productId = s(row?.product_id);
    if (!productId) continue;

    const arr = map.get(productId) || [];
    arr.push(row);
    map.set(productId, arr);
  }

  return map;
}
function readProductImage(product: any, mediaUrl = "") {
  const metadata = safeObject(product?.metadata);

  const fromMetadataMedia = Array.isArray(metadata.media)
    ? metadata.media
        .map((item: any) =>
          firstText(
            item?.thumbnail_url,
            item?.thumbnailUrl,
            item?.original_url,
            item?.originalUrl,
            item?.url,
            item?.src,
            item?.image_url,
            item?.imageUrl,
          ),
        )
        .find(Boolean)
    : "";

  return firstText(
    mediaUrl,
    product?.image_url,
    product?.imageUrl,
    product?.thumbnail_url,
    product?.thumbnailUrl,
    product?.cover_url,
    product?.coverUrl,
    metadata.image_url,
    metadata.imageUrl,
    metadata.thumbnail_url,
    metadata.thumbnailUrl,
    metadata.cover_url,
    metadata.coverUrl,
    fromMetadataMedia,
  );
}
function buildIndexPayload(args: {
  product: any;
  pricing: any;
  imageUrl: string;
  brand: any;
  categories: any[];
  options: any[];
  tags: any[];
  variants: any[];
}) {
  const {
    product,
    pricing,
    imageUrl,
    brand,
    categories,
    options,
    tags,
    variants,
  } = args;

  const productMetadata = getProductMetadata(product);
  const metadata = safeObject(product?.metadata);

  const visible = isProductVisibleInWeb({
    status: product?.status,
    metadata: product?.metadata,
  });

  const regularPrice = firstNumber(pricing?.price);
  const salePrice = firstNumber(pricing?.sale_price);

  const hasSale =
    salePrice !== null &&
    salePrice > 0 &&
    regularPrice !== null &&
    regularPrice > salePrice;

  const finalPrice = hasSale ? salePrice : regularPrice;
  const comparePrice = hasSale ? regularPrice : null;
  const currency = firstText(pricing?.currency, "SAR");

  const textParts: string[] = [];
  const suggestionParts: string[] = [];

  textParts.push(product?.name);
  textParts.push(product?.description);
  textParts.push(productMetadata?.title);
  textParts.push(productMetadata?.description);
  textParts.push(productMetadata?.url);

  suggestionParts.push(product?.name);
  suggestionParts.push(productMetadata?.title);

  if (brand) {
    textParts.push(brand?.name);
    textParts.push(brand?.description);
    textParts.push(brand?.seo_description);
    collectTextFromAny(brand?.metadata, textParts);
    suggestionParts.push(brand?.name);
  }

  for (const category of categories) {
    textParts.push(category?.name);
    textParts.push(category?.slug);
    textParts.push(category?.path);
    suggestionParts.push(category?.name);
  }

  for (const option of options) {
    textParts.push(option?.name);
    textParts.push(option?.option_field_type);
    textParts.push(option?.display_type);
    suggestionParts.push(option?.name);

    for (const value of option?.values || []) {
      textParts.push(value?.name);
      textParts.push(value?.display_value);
      suggestionParts.push(value?.name);
      suggestionParts.push(value?.display_value);
    }
  }

  for (const tag of tags) {
    textParts.push(tag?.name);
    suggestionParts.push(tag?.name);
  }

  for (const variant of variants) {
    textParts.push(variant?.sku);
    textParts.push(variant?.barcode);
    textParts.push(variant?.mpn);
    textParts.push(variant?.gtin);
    suggestionParts.push(variant?.sku);
    suggestionParts.push(variant?.barcode);
    suggestionParts.push(variant?.mpn);
    suggestionParts.push(variant?.gtin);
  }

  collectTextFromAny(metadata, textParts);

  const searchText = uniqueText(textParts).join(" ");
  const suggestionTerms = splitSuggestionTerms(suggestionParts);
  const suggestionTermsText = suggestionTerms.join(" ");

  return {
    store_id: product.store_id,
    product_id: product.id,

    title: s(product?.name),
    description: firstText(product?.description, productMetadata?.description),
    href: buildProductHref(product),
  image_url: imageUrl || "",

    price: finalPrice,
    compare_price: comparePrice,
    currency,

    search_text: searchText,
    search_text_normalized: normalizeArabic(searchText),

    suggestion_terms: suggestionTerms,
    suggestion_terms_text: suggestionTermsText,

    is_visible: visible,
    updated_at: new Date().toISOString(),
  };
}

export async function syncStoreSearchIndex(args: {
  storeId: string;
  limit?: number;
}) {
  const sb = supabaseAdmin() as any;

  const limit = Math.min(Math.max(Number(args.limit || 500), 1), 5000);

  const { data: products, error } = await sb
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("store_id", args.storeId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return {
      ok: false,
      indexed: 0,
      error: error.message,
    };
  }

  const rows = Array.isArray(products) ? products : [];
  const productIds = rows.map((product: any) => s(product?.id)).filter(Boolean);

  const brandIds = rows
    .map((product: any) => s(product?.brand_id))
    .filter(Boolean);

  const [
    pricingMap,
    mediaMap,
    brandMap,
    categoriesMap,
    optionsMap,
    tagsMap,
    variantsMap,
  ] = await Promise.all([
    loadPricingMap(productIds),
    loadMediaMap(productIds),
    loadBrandsMap(args.storeId, brandIds),
    loadCategoriesByProductId(productIds),
    loadOptionsByProductId(productIds),
    loadTagsByProductId(args.storeId, productIds),
    loadVariantsByProductId(productIds),
  ]);

  const payloads = rows.map((product: any) => {
    const productId = s(product?.id);

    return buildIndexPayload({
      product,
      pricing: pricingMap.get(productId) || {},
      imageUrl: mediaMap.get(productId) || "",
      brand: product?.brand_id ? brandMap.get(s(product.brand_id)) : null,
      categories: categoriesMap.get(productId) || [],
      options: optionsMap.get(productId) || [],
      tags: tagsMap.get(productId) || [],
      variants: variantsMap.get(productId) || [],
    });
  });

  if (!payloads.length) {
    return {
      ok: true,
      indexed: 0,
    };
  }

  const { error: upsertError } = await sb
    .from("product_search_index")
    .upsert(payloads, {
      onConflict: "store_id,product_id",
    });

  if (upsertError) {
    return {
      ok: false,
      indexed: 0,
      error: upsertError.message,
    };
  }

  return {
    ok: true,
    indexed: payloads.length,
  };
}