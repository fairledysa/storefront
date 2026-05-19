// FILE: apps/storefront/src/data/pages/tag.loader.ts
import "server-only";

import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/data/store/supabase.server";

function s(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeTagSlug(value: unknown) {
  let raw = s(value);

  if (!raw) return "";

  try {
    raw = decodeURIComponent(raw);
  } catch {}

  return raw
    .toLowerCase()
    .replace(/[\u064b-\u065f\u0670]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ـ/g, "")
    .replace(/^\s+|\s+$/g, "")
    .replace(/^\/+/, "")
    .replace(/^tags\/+/i, "")
    .replace(/^tag\/+/i, "")
    .replace(/[\\?#%]+/g, "")
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .replace(/\s+/g, "-")
    .replace(/\/+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function n(value: unknown) {
  const x = Number(value);
  return Number.isFinite(x) ? x : 0;
}

function normalizeCacheKey(value: unknown) {
  return s(value).toLowerCase();
}

function clampDecimals(value: unknown) {
  const x = Number(value ?? 0);
  if (!Number.isFinite(x)) return 0;

  return Math.max(0, Math.min(4, Math.floor(x)));
}

function isCssColor(value: unknown) {
  const text = s(value).toLowerCase();

  if (!text) return false;

  return (
    text.startsWith("#") ||
    text.startsWith("rgb(") ||
    text.startsWith("rgba(") ||
    text.startsWith("hsl(") ||
    text.startsWith("hsla(") ||
    text.startsWith("var(")
  );
}

function moneyLabel(value: number | null, currency: string) {
  if (value === null || value === undefined) return "";

  const clean = Number.isInteger(value)
    ? String(value)
    : Number(value).toFixed(2).replace(/\.?0+$/, "");

  const c = s(currency).toUpperCase();
  const label = !c || c === "SAR" ? "ريال" : currency;

  return `${clean} ${label}`;
}

/* ------------------------- store options ------------------------- */

async function loadStoreOptionsRaw(storeId: string) {
  const sb: any = supabaseAdmin();

  const { data, error } = await sb
    .from("store_settings")
    .select("slug,value")
    .eq("store_id", storeId)
    .like("slug", "options:%");

  if (error || !Array.isArray(data)) return {};

  const items: Record<string, unknown> = {};

  for (const row of data) {
    const slug = s(row?.slug);
    if (!slug) continue;

    items[slug] = row?.value;
  }

  return items;
}

const storeOptionsCache = new Map<
  string,
  () => Promise<Record<string, unknown>>
>();

function loadStoreOptions(storeId: string) {
  const key = normalizeCacheKey(storeId);

  let fn = storeOptionsCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () => loadStoreOptionsRaw(storeId),
      ["tag-page-store-options", storeId],
      { revalidate: 120 },
    );

    storeOptionsCache.set(key, fn);
  }

  return fn();
}

/* ------------------------- store currency ------------------------- */

type StoreCurrencyForTag = {
  code: string;
  symbol: string;
  decimalDigits: number;
};

async function loadStoreCurrencyRaw(
  storeId: string,
): Promise<StoreCurrencyForTag | null> {
  const store_id = s(storeId);
  if (!store_id) return null;

  const sb: any = supabaseAdmin();

  const { data, error } = await sb
    .from("store_currencies")
    .select("currency_code,symbol,decimal_digits,is_default,is_enabled,sort_order")
    .eq("store_id", store_id)
    .eq("is_enabled", true)
    .order("is_default", { ascending: false })
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const code = s(data?.currency_code).toUpperCase();
  if (!code) return null;

  const symbol = s(data?.symbol) || code;
  const decimalDigits = clampDecimals(data?.decimal_digits);

  return {
    code,
    symbol,
    decimalDigits,
  };
}

const storeCurrencyCache = new Map<
  string,
  () => Promise<StoreCurrencyForTag | null>
>();

function loadStoreCurrency(storeId: string) {
  const store_id = s(storeId);
  const key = normalizeCacheKey(store_id);

  let fn = storeCurrencyCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () => loadStoreCurrencyRaw(store_id),
      ["tag-page-store-currency", store_id],
      { revalidate: 120 },
    );

    storeCurrencyCache.set(key, fn);
  }

  return fn();
}

function attachStoreCurrencyToProducts(args: {
  products: any[];
  currency: StoreCurrencyForTag | null;
}) {
  const products = Array.isArray(args.products) ? args.products : [];
  const currency = args.currency;

  if (!products.length || !currency?.code) return products;

  const storeCurrency = {
    code: currency.code,
    currency_code: currency.code,
    symbol: currency.symbol,
    decimal_digits: currency.decimalDigits,
    decimalDigits: currency.decimalDigits,
  };

  return products.map((product) => {
    const metadata =
      product?.metadata && typeof product.metadata === "object"
        ? product.metadata
        : {};

    const pricing =
      product?.pricing && typeof product.pricing === "object"
        ? product.pricing
        : null;

    const seo =
      product?.seo && typeof product.seo === "object" ? product.seo : {};

    return {
      ...product,

      currency: currency.code,
      currency_code: currency.code,
      currencySymbol: currency.symbol,
      currency_symbol: currency.symbol,
      currencyDecimals: currency.decimalDigits,
      currency_decimals: currency.decimalDigits,
      decimalDigits: currency.decimalDigits,
      decimal_digits: currency.decimalDigits,

      store_currency: storeCurrency,
      storeCurrency,

      pricing: pricing
        ? {
            ...pricing,
            currency: currency.code,
            currency_code: currency.code,
            currencySymbol: currency.symbol,
            currency_symbol: currency.symbol,
            currencyDecimals: currency.decimalDigits,
            currency_decimals: currency.decimalDigits,
            decimalDigits: currency.decimalDigits,
            decimal_digits: currency.decimalDigits,
            store_currency: storeCurrency,
            storeCurrency,
          }
        : pricing,

      metadata: {
        ...metadata,
        currency: currency.code,
        currency_code: currency.code,
        currencySymbol: currency.symbol,
        currency_symbol: currency.symbol,
        currencyDecimals: currency.decimalDigits,
        currency_decimals: currency.decimalDigits,
        decimalDigits: currency.decimalDigits,
        decimal_digits: currency.decimalDigits,
        store_currency: storeCurrency,
        storeCurrency,
      },

      seo: {
        ...seo,
        currency: currency.code,
        currency_code: currency.code,
        currencySymbol: currency.symbol,
        currency_symbol: currency.symbol,
        currencyDecimals: currency.decimalDigits,
        currency_decimals: currency.decimalDigits,
        decimalDigits: currency.decimalDigits,
        decimal_digits: currency.decimalDigits,
        store_currency: storeCurrency,
        storeCurrency,
      },
    };
  });
}

/* ------------------------- product helpers ------------------------- */

function normalizeProductOptionsFromMetadata(metadata: any) {
  const options =
    metadata?.options ||
    metadata?.product_options ||
    metadata?.productOptions ||
    [];

  return Array.isArray(options) ? options : [];
}

function normalizeProductVariantsFromMetadata(metadata: any) {
  const variants = metadata?.variants || metadata?.product_variants || [];
  return Array.isArray(variants) ? variants : [];
}

function normalizeOptionValuesFromMetadata(metadata: any) {
  const values =
    metadata?.option_values ||
    metadata?.optionValues ||
    metadata?.product_option_values ||
    metadata?.productOptionValues ||
    [];

  return Array.isArray(values) ? values : [];
}

/* ------------------------- media ------------------------- */

async function loadProductMedia(args: {
  storeId: string;
  productIds: string[];
}) {
  const storeId = s(args.storeId);
  const productIds = Array.isArray(args.productIds)
    ? args.productIds.map(s).filter(Boolean)
    : [];

  if (!storeId || !productIds.length) return new Map<string, any[]>();

  const sb: any = supabaseAdmin();

  const mediaR = await sb
    .from("product_media")
    .select(
      "product_id,media_kind,original_url,thumbnail_url,alt,is_default,sort_order",
    )
    .eq("store_id", storeId)
    .in("product_id", productIds)
    .order("sort_order", { ascending: true });

  const rows = !mediaR.error && Array.isArray(mediaR.data) ? mediaR.data : [];
  const mediaByProduct = new Map<string, any[]>();

  for (const row of rows) {
    const productId = s(row?.product_id);
    const url = s(row?.original_url);

    if (!productId || !url) continue;

    const arr = mediaByProduct.get(productId) || [];

    arr.push({
      ...row,
      product_id: productId,
      media_kind: s(row?.media_kind) || "image",
      kind: s(row?.media_kind) || "image",
      type: s(row?.media_kind) || "image",
      original_url: url,
      url,
      public_url: url,
      image_url: url,
      src: url,
      is_default: Boolean(row?.is_default),
      sort_order: Number(row?.sort_order ?? 0),
    });

    mediaByProduct.set(productId, arr);
  }

  for (const [productId, media] of mediaByProduct.entries()) {
    mediaByProduct.set(
      productId,
      media.sort((a, b) => {
        const ad = a?.is_default ? 1 : 0;
        const bd = b?.is_default ? 1 : 0;

        if (bd !== ad) return bd - ad;

        return Number(a?.sort_order ?? 0) - Number(b?.sort_order ?? 0);
      }),
    );
  }

  return mediaByProduct;
}

/* ------------------------- pricing / stock ------------------------- */

async function loadProductPricing(productIds: string[]) {
  const ids = productIds.map(s).filter(Boolean);
  if (!ids.length) return new Map<string, any>();

  const sb: any = supabaseAdmin();

  const pricingR = await sb
    .from("product_pricing")
    .select(
      "product_id,currency,price,sale_price,cost_price,sale_start,sale_end,with_tax",
    )
    .in("product_id", ids);

  const rows =
    !pricingR.error && Array.isArray(pricingR.data) ? pricingR.data : [];

  const map = new Map<string, any>();

  for (const row of rows) {
    const productId = s(row?.product_id);
    if (productId) map.set(productId, row);
  }

  return map;
}

async function loadProductStock(productIds: string[]) {
  const ids = productIds.map(s).filter(Boolean);
  if (!ids.length) return new Map<string, any>();

  const sb: any = supabaseAdmin();

  const stockR = await sb
    .from("product_stock")
    .select(
      "product_id,quantity,unlimited_quantity,hide_quantity,maximum_quantity_per_order,notify_low",
    )
    .in("product_id", ids);

  const rows = !stockR.error && Array.isArray(stockR.data) ? stockR.data : [];
  const map = new Map<string, any>();

  for (const row of rows) {
    const productId = s(row?.product_id);
    if (productId) map.set(productId, row);
  }

  return map;
}

/* ------------------------- DB options if available ------------------------- */

type CardOptionValue = {
  id: string;
  name: string;
  label: string;
  value: string;
  display_value: string;
  displayValue: string;
  color: string | null;
  image: string | null;
  image_url: string | null;
};

type CardOption = {
  id: string;
  name: string;
  label: string;
  values: CardOptionValue[];
};

async function loadProductCardOptions(productIds: string[]) {
  const ids = productIds.map(s).filter(Boolean);
  if (!ids.length) return new Map<string, CardOption[]>();

  const sb: any = supabaseAdmin();

  const optionsR = await sb
    .from("product_options")
    .select("id,product_id,name,display_type,sort_order")
    .in("product_id", ids)
    .order("sort_order", { ascending: true });

  const optionRows =
    !optionsR.error && Array.isArray(optionsR.data) ? optionsR.data : [];

  if (!optionRows.length) return new Map<string, CardOption[]>();

  const optionIds = optionRows
    .map((option: any) => s(option?.id))
    .filter(Boolean);

  if (!optionIds.length) return new Map<string, CardOption[]>();

  const valuesR = await sb
    .from("product_option_values")
    .select(
      "id,option_id,name,display_value,image_url,quantity,is_default,sort_order",
    )
    .in("option_id", optionIds)
    .order("sort_order", { ascending: true });

  const valueRows =
    !valuesR.error && Array.isArray(valuesR.data) ? valuesR.data : [];

  if (!valueRows.length) return new Map<string, CardOption[]>();

  const optionById = new Map<string, any>();
  const valuesByOptionId = new Map<string, CardOptionValue[]>();

  for (const option of optionRows) {
    const optionId = s(option?.id);
    if (optionId) optionById.set(optionId, option);
  }

  for (const value of valueRows) {
    const optionId = s(value?.option_id);
    if (!optionId) continue;

    const option = optionById.get(optionId);
    const displayType = s(option?.display_type).toLowerCase();

    const rawName = s(value?.name);
    const rawDisplayValue = s(value?.display_value);
    const imageUrl = s(value?.image_url) || null;

    const colorSource = rawDisplayValue || rawName;
    const color =
      displayType === "color" && isCssColor(colorSource) ? colorSource : null;

    const label = rawName || rawDisplayValue;

    if (!label && !color && !imageUrl) continue;

    const arr = valuesByOptionId.get(optionId) || [];

    arr.push({
      id: s(value?.id) || `${optionId}-${arr.length}`,
      name: label,
      label,
      value: rawDisplayValue || rawName || label,
      display_value: rawDisplayValue || rawName || label,
      displayValue: rawDisplayValue || rawName || label,
      color,
      image: imageUrl,
      image_url: imageUrl,
    });

    valuesByOptionId.set(optionId, arr);
  }

  const optionsByProductId = new Map<string, CardOption[]>();

  for (const option of optionRows) {
    const productId = s(option?.product_id);
    const optionId = s(option?.id);

    if (!productId || !optionId) continue;

    const values = valuesByOptionId.get(optionId) || [];
    if (!values.length) continue;

    const arr = optionsByProductId.get(productId) || [];
    const name = s(option?.name);

    arr.push({
      id: optionId,
      name,
      label: name,
      values,
    });

    optionsByProductId.set(productId, arr);
  }

  return optionsByProductId;
}

async function loadProductVariants(productIds: string[]) {
  const ids = productIds.map(s).filter(Boolean);
  if (!ids.length) return new Map<string, any[]>();

  const sb: any = supabaseAdmin();

  const variantsR = await sb
    .from("product_variants")
    .select(
      "id,product_id,sku,barcode,mpn,gtin,price,sale_price,stock_quantity,unlimited_quantity,weight,weight_unit,is_default",
    )
    .in("product_id", ids);

  const rows =
    !variantsR.error && Array.isArray(variantsR.data) ? variantsR.data : [];

  if (!rows.length) return new Map<string, any[]>();

  const variantIds = rows.map((row: any) => s(row?.id)).filter(Boolean);

  const linksR = variantIds.length
    ? await sb
        .from("variant_option_values")
        .select("variant_id,option_value_id")
        .in("variant_id", variantIds)
    : { data: [], error: null };

  const optionValueIdsByVariant = new Map<string, string[]>();

  if (!linksR.error && Array.isArray(linksR.data)) {
    for (const row of linksR.data) {
      const variantId = s(row?.variant_id);
      const valueId = s(row?.option_value_id);

      if (!variantId || !valueId) continue;

      const arr = optionValueIdsByVariant.get(variantId) || [];
      arr.push(valueId);
      optionValueIdsByVariant.set(variantId, arr);
    }
  }

  const variantsByProductId = new Map<string, any[]>();

  for (const row of rows) {
    const productId = s(row?.product_id);
    const variantId = s(row?.id);

    if (!productId || !variantId) continue;

    const arr = variantsByProductId.get(productId) || [];

    arr.push({
      ...row,
      option_value_ids: optionValueIdsByVariant.get(variantId) || [],
    });

    variantsByProductId.set(productId, arr);
  }

  return variantsByProductId;
}

/* ------------------------- product rows ------------------------- */

async function loadProductsByIds(args: {
  storeId: string;
  productIds: string[];
  limit: number;
}) {
  const storeId = s(args.storeId);
  const productIds = args.productIds.map(s).filter(Boolean);
  const limit = Math.min(Math.max(Number(args.limit ?? 48), 1), 96);

  if (!storeId || !productIds.length) return [];

  const sb: any = supabaseAdmin();

  const [
    productsR,
    searchR,
    pricingByProduct,
    stockByProduct,
    mediaByProduct,
    dbOptionsByProduct,
    dbVariantsByProduct,
  ] = await Promise.all([
    sb
      .from("products")
      .select(
        "id,store_id,product_type,name,description,status,brand_id,require_shipping,metadata,created_at,updated_at,public_no",
      )
      .eq("store_id", storeId)
      .in("id", productIds)
      .neq("status", "hidden")
      .limit(limit),

    sb
      .from("product_search_index")
      .select(
        "product_id,title,description,href,image_url,price,compare_price,currency,is_visible,updated_at",
      )
      .eq("store_id", storeId)
      .eq("is_visible", true)
      .in("product_id", productIds)
      .limit(limit),

    loadProductPricing(productIds),
    loadProductStock(productIds),
    loadProductMedia({ storeId, productIds }),
    loadProductCardOptions(productIds),
    loadProductVariants(productIds),
  ]);

  const productRows =
    !productsR.error && Array.isArray(productsR.data) ? productsR.data : [];

  const searchRows =
    !searchR.error && Array.isArray(searchR.data) ? searchR.data : [];

  const searchByProductId = new Map<string, any>();

  for (const row of searchRows) {
    const productId = s(row?.product_id);
    if (productId) searchByProductId.set(productId, row);
  }

  const products = productRows.map((product: any) => {
    const productId = s(product?.id);
    const search = searchByProductId.get(productId) || {};
    const pricing = pricingByProduct.get(productId) || {};
    const stock = stockByProduct.get(productId) || {};
    const media = mediaByProduct.get(productId) || [];

    const metadata =
      product?.metadata && typeof product.metadata === "object"
        ? product.metadata
        : {};

    const metadataOptions = normalizeProductOptionsFromMetadata(metadata);
    const metadataVariants = normalizeProductVariantsFromMetadata(metadata);
    const metadataOptionValues = normalizeOptionValuesFromMetadata(metadata);

    const dbOptions = dbOptionsByProduct.get(productId) || [];
    const dbVariants = dbVariantsByProduct.get(productId) || [];

    const options = dbOptions.length ? dbOptions : metadataOptions;
    const variants = dbVariants.length ? dbVariants : metadataVariants;

    const firstMediaUrl = s(media?.[0]?.original_url);
    const currentImage =
      s(search?.image_url) ||
      s(metadata?.imageUrl) ||
      s(metadata?.image_url) ||
      firstMediaUrl;

    const hoverImage =
      media
        .map((item) => s(item?.original_url))
        .find((url) => url && url !== currentImage) ||
      s(metadata?.hoverImageUrl) ||
      s(metadata?.hover_image_url) ||
      s(metadata?.secondImageUrl) ||
      s(metadata?.second_image_url) ||
      "";

    const images = media.map((item) => ({
      url: item.original_url,
      src: item.original_url,
      original_url: item.original_url,
      image_url: item.original_url,
    }));

    const currency = s(pricing?.currency) || s(search?.currency) || "SAR";

    const basePrice =
      pricing?.price != null
        ? n(pricing.price)
        : search?.compare_price != null
          ? n(search.compare_price)
          : n(search?.price);

    const salePrice =
      pricing?.sale_price != null && n(pricing.sale_price) > 0
        ? n(pricing.sale_price)
        : search?.price != null &&
            search?.compare_price != null &&
            n(search.compare_price) > n(search.price)
          ? n(search.price)
          : null;

    const finalPrice =
      salePrice && salePrice > 0 && salePrice < basePrice
        ? salePrice
        : basePrice;

    const compareAtPrice =
      salePrice && salePrice > 0 && salePrice < basePrice ? basePrice : null;

    return {
      ...product,

      id: productId,
      product_id: productId,

      name: s(product?.name) || s(search?.title),
      title: s(search?.title) || s(product?.name),
      description: s(product?.description) || s(search?.description),

      href: s(search?.href),
      url: s(search?.href),

      image_url: currentImage || null,
      imageUrl: currentImage || null,
      thumbnail_url: currentImage || null,
      thumbnailUrl: currentImage || null,
      image: currentImage || null,

      hoverImageUrl: hoverImage || null,
      hover_image_url: hoverImage || null,
      secondImageUrl: hoverImage || null,
      second_image_url: hoverImage || null,

      images,
      media,

      currency,

      price: finalPrice,
      sale_price: salePrice,
      regular_price: basePrice,
      compare_at_price: compareAtPrice,
      compareAtPrice,

      priceFormatted: moneyLabel(finalPrice, currency),
      price_formatted: moneyLabel(finalPrice, currency),

      pricing: {
        ...pricing,
        currency,
        price: basePrice,
        sale_price: salePrice,
        sale_end:
          pricing?.sale_end ?? metadata?.sale_end ?? metadata?.saleEnd ?? null,
      },

      stock: {
        ...stock,
      },

      options,
      product_options: options,
      productOptions: options,

      option_values: metadataOptionValues,
      optionValues: metadataOptionValues,
      product_option_values: metadataOptionValues,
      productOptionValues: metadataOptionValues,

      variants,

      metadata: {
        ...metadata,

        media,
        images,

        options,
        product_options: options,
        productOptions: options,

        option_values: metadataOptionValues,
        optionValues: metadataOptionValues,
        product_option_values: metadataOptionValues,
        productOptionValues: metadataOptionValues,

        variants,

        hoverImageUrl: hoverImage || null,
        hover_image_url: hoverImage || null,
        secondImageUrl: hoverImage || null,
        second_image_url: hoverImage || null,
      },

      seo: {
        ...(metadata?.seo && typeof metadata.seo === "object"
          ? metadata.seo
          : {}),
        currency,
        price: basePrice,
        sale_price: salePrice,
        og_image_url: currentImage || null,
        hoverImageUrl: hoverImage || null,
        hover_image_url: hoverImage || null,
        secondImageUrl: hoverImage || null,
        second_image_url: hoverImage || null,
        in_stock: true,
        options,
        product_options: options,
        productOptions: options,
        option_values: metadataOptionValues,
        optionValues: metadataOptionValues,
        product_option_values: metadataOptionValues,
        productOptionValues: metadataOptionValues,
        variants,
      },
    };
  });

  const order = new Map<string, number>(
    productIds.map((id, index) => [String(id), index] as const),
  );

  return products.sort((a: any, b: any) => {
    const aId = s(a?.product_id) || s(a?.id);
    const bId = s(b?.product_id) || s(b?.id);

    return Number(order.get(aId) ?? 9999) - Number(order.get(bId) ?? 9999);
  });
}

/* ------------------------- loader ------------------------- */

export async function loadTagPageBySlug(args: {
  store_id: string;
  slug: string;
  limit?: number;
}) {
  const storeId = s(args.store_id);
  const incomingSlug = normalizeTagSlug(args.slug);
  const limit = Math.min(Math.max(Number(args.limit ?? 48), 1), 96);

  if (!storeId || !incomingSlug) return null;

  const sb: any = supabaseAdmin();

  const [tagsR, options, currency] = await Promise.all([
    sb
      .from("product_tags")
      .select(
        [
          "id",
          "store_id",
          "name",
          "slug",
          "description",
          "status",
          "sort_order",
          "seo_title",
          "seo_description",
          "created_at",
          "updated_at",
        ].join(","),
      )
      .eq("store_id", storeId)
      .eq("status", "active")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(1000),

    loadStoreOptions(storeId),

    loadStoreCurrency(storeId),
  ]);

  if (tagsR.error || !Array.isArray(tagsR.data)) return null;

  const tag = tagsR.data.find((row: any) => {
    const rowSlug = normalizeTagSlug(row?.slug);
    const rowName = normalizeTagSlug(row?.name);

    return rowSlug === incomingSlug || rowName === incomingSlug;
  });

  if (!tag?.id) return null;

  const linksR = await sb
    .from("product_tag_links")
    .select("product_id,created_at")
    .eq("tag_id", tag.id)
    .limit(1000);

  if (linksR.error) return null;

  const productIds: string[] = Array.from(
    new Set<string>(
      (Array.isArray(linksR.data) ? (linksR.data as any[]) : [])
        .map((row: any) => s(row?.product_id))
        .filter((id: string) => Boolean(id)),
    ),
  );

  const loadedProducts = productIds.length
    ? await loadProductsByIds({
        storeId,
        productIds,
        limit,
      })
    : [];

  const products = attachStoreCurrencyToProducts({
    products: loadedProducts,
    currency,
  });

  const tagName = s(tag.name);
  const tagSlug = s(tag.slug) || incomingSlug;
  const tagDescription = s(tag.description);

  const categoryLike = {
    id: String(tag.id),
    store_id: storeId,
    name: tagName,
    title: tagName,
    slug: tagSlug,
    description: tagDescription,
    public_no: null,
    seo_title: tag.seo_title ?? null,
    seo_description: tag.seo_description ?? null,
    is_tag: true,
    type: "tag",
    source: "tag",
  };

  return {
    route: "tag",
    type: "tag",
    source: "tag",

    id: String(tag.id),
    title: tagName,
    heading: tagName,
    name: tagName,
    description: tagDescription,

    seoTitle: s(tag.seo_title) || tagName,
    seoDescription: s(tag.seo_description) || tagDescription,

    tag: {
      id: String(tag.id),
      store_id: storeId,
      name: tagName,
      title: tagName,
      slug: tagSlug,
      description: tagDescription,
      seo_title: tag.seo_title ?? null,
      seo_description: tag.seo_description ?? null,
      status: s(tag.status) || "active",
      sort_order: Number(tag.sort_order ?? 0),
      created_at: tag.created_at ?? null,
      updated_at: tag.updated_at ?? null,
    },

    category: categoryLike,
    currentCategory: categoryLike,

    options,
    currency,

    products,
    items: products,
    productItems: products,

    list: {
      items: products,
      total: products.length,
    },

    productCount: products.length,
    total: products.length,

    pagination: {
      page: 1,
      perPage: limit,
      total: products.length,
      hasMore: false,
    },

    breadcrumbs: [
      {
        label: "الرئيسية",
        href: "/",
      },
      {
        label: tagName,
        href: `/tags/${tagSlug}`,
      },
    ],
  };
}