// FILE: apps/storefront/src/data/pages/category.loader.ts
import { unstable_cache } from "next/cache";
import { createHash } from "node:crypto";

import { cacheKey } from "@/data/cache/cache-keys";
import { redisCached } from "@/data/cache/redis-cache.server";
import {
  getCategoryByPublicNo,
  getCategoryByShortUrl,
} from "@/data/catalog/category";
import {
  getProductsByCategory,
  getProductsByIds,
} from "@/data/catalog/products";
import { getStoreDb } from "@/data/db/store-db.server";
import { fromBase62 } from "@/lib/seo/base62";

/* ------------------------- helpers ------------------------ */

function s(value: any) {
  return String(value ?? "").trim();
}

function hashText(value: string) {
  return createHash("sha1").update(value).digest("hex");
}

function isCssColor(value: any) {
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

function normalizeCacheKey(value: any) {
  return s(value).toLowerCase();
}

function firstText(...values: any[]) {
  for (const value of values) {
    const text = s(value);
    if (text) return text;
  }

  return "";
}

function toDecimalDigits(value: any) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;

  return Math.max(0, Math.min(4, Math.floor(n)));
}

function uniqueStrings(values: any[]) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => s(value))
        .filter(Boolean),
    ),
  );
}

/* ------------------------- store options loader ------------------------ */

async function loadStoreOptionsRaw(store_id: string) {
  const storeId = s(store_id);
  if (!storeId) return {};

  const sb = await getStoreDb(storeId);

  const { data, error } = await sb
    .from("store_settings")
    .select("slug,value")
    .eq("store_id", storeId)
    .like("slug", "options:%");

  if (error || !Array.isArray(data)) {
    return {};
  }

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

function loadStoreOptions(store_id: string) {
  const storeId = s(store_id);
  const key = normalizeCacheKey(storeId);

  let fn = storeOptionsCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey("category", "store-options", storeId),
          { ttlSeconds: 300 },
          () => loadStoreOptionsRaw(storeId),
        ),
      ["category-store-options", storeId],
      {
        revalidate: 120,
      },
    );

    storeOptionsCache.set(key, fn);
  }

  return fn();
}

/* ------------------------- store currency loader ------------------------ */

type StoreCurrencyForProductCard = {
  currency_code: string;
  currencyCode: string;
  symbol: string;
  decimal_digits: number;
  decimalDigits: number;
  is_default: boolean;
};

async function loadStoreCurrenciesRaw(
  store_id: string,
): Promise<StoreCurrencyForProductCard[]> {
  const storeId = s(store_id);
  if (!storeId) return [];

  const sb = await getStoreDb(storeId);

  const { data, error } = await sb
    .from("store_currencies")
    .select(
      "currency_code,symbol,decimal_digits,is_default,is_enabled,sort_order",
    )
    .eq("store_id", storeId)
    .eq("is_enabled", true)
    .order("is_default", { ascending: false })
    .order("sort_order", { ascending: true });

  if (error || !Array.isArray(data)) return [];

  return data
    .map((row: any) => {
      const currencyCode = s(row?.currency_code).toUpperCase();
      if (!currencyCode) return null;

      const decimalDigits = toDecimalDigits(row?.decimal_digits);

      return {
        currency_code: currencyCode,
        currencyCode,
        symbol: s(row?.symbol),
        decimal_digits: decimalDigits,
        decimalDigits,
        is_default: Boolean(row?.is_default ?? false),
      };
    })
    .filter(Boolean) as StoreCurrencyForProductCard[];
}

const storeCurrenciesCache = new Map<
  string,
  () => Promise<StoreCurrencyForProductCard[]>
>();

function loadStoreCurrencies(store_id: string) {
  const storeId = s(store_id);
  const key = normalizeCacheKey(storeId);

  let fn = storeCurrenciesCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey("category", "store-currencies", storeId),
          { ttlSeconds: 300 },
          () => loadStoreCurrenciesRaw(storeId),
        ),
      ["category-store-currencies-product-card", storeId],
      {
        revalidate: 120,
      },
    );

    storeCurrenciesCache.set(key, fn);
  }

  return fn();
}

function readProductCurrencyCode(product: any) {
  const pricing =
    product?.pricing && typeof product.pricing === "object"
      ? product.pricing
      : product?.product_pricing && typeof product.product_pricing === "object"
        ? product.product_pricing
        : null;

  return firstText(
    pricing?.currency_code,
    pricing?.currencyCode,
    pricing?.currency,
    product?.currency_code,
    product?.currencyCode,
    product?.currency,
    product?.seo?.currency_code,
    product?.seo?.currencyCode,
    product?.seo?.currency,
    product?.metadata?.currency_code,
    product?.metadata?.currencyCode,
    product?.metadata?.currency,
  ).toUpperCase();
}

function pickCurrencyForProduct(args: {
  product: any;
  currencies: StoreCurrencyForProductCard[];
}) {
  const currencies = Array.isArray(args.currencies) ? args.currencies : [];
  if (!currencies.length) return null;

  const code = readProductCurrencyCode(args.product);

  if (code) {
    const matched = currencies.find(
      (currency) => currency.currency_code === code,
    );

    if (matched) return matched;
  }

  return (
    currencies.find((currency) => currency.is_default) ??
    currencies[0] ??
    null
  );
}

async function attachStoreCurrencyToProducts(args: {
  store_id: string;
  products: any[];
}) {
  const products = Array.isArray(args.products) ? args.products : [];
  if (!products.length) return products;

  const currencies = await loadStoreCurrencies(args.store_id);
  if (!currencies.length) return products;

  return products.map((product) => {
    const currency = pickCurrencyForProduct({
      product,
      currencies,
    });

    if (!currency) return product;

    const metadata =
      product?.metadata && typeof product.metadata === "object"
        ? product.metadata
        : {};

    const pricing =
      product?.pricing && typeof product.pricing === "object"
        ? {
            ...product.pricing,
            currency: currency.currency_code,
            currency_code: currency.currency_code,
            currencyCode: currency.currencyCode,
            currency_symbol: currency.symbol,
            currencySymbol: currency.symbol,
            currency_decimals: currency.decimal_digits,
            currencyDecimals: currency.decimalDigits,
            decimal_digits: currency.decimal_digits,
            decimalDigits: currency.decimalDigits,
          }
        : product?.pricing;

    const productPricing =
      product?.product_pricing && typeof product.product_pricing === "object"
        ? {
            ...product.product_pricing,
            currency: currency.currency_code,
            currency_code: currency.currency_code,
            currencyCode: currency.currencyCode,
            currency_symbol: currency.symbol,
            currencySymbol: currency.symbol,
            currency_decimals: currency.decimal_digits,
            currencyDecimals: currency.decimalDigits,
            decimal_digits: currency.decimal_digits,
            decimalDigits: currency.decimalDigits,
          }
        : product?.product_pricing;

    return {
      ...product,

      currency: currency.currency_code,
      currency_code: currency.currency_code,
      currencyCode: currency.currencyCode,
      currency_symbol: currency.symbol,
      currencySymbol: currency.symbol,
      currency_decimals: currency.decimal_digits,
      currencyDecimals: currency.decimalDigits,
      decimal_digits: currency.decimal_digits,
      decimalDigits: currency.decimalDigits,

      store_currency: currency,
      storeCurrency: currency,

      pricing,
      product_pricing: productPricing,

      metadata: {
        ...metadata,
        currency: currency.currency_code,
        currency_code: currency.currency_code,
        currencyCode: currency.currencyCode,
        currency_symbol: currency.symbol,
        currencySymbol: currency.symbol,
        currency_decimals: currency.decimal_digits,
        currencyDecimals: currency.decimalDigits,
        decimal_digits: currency.decimal_digits,
        decimalDigits: currency.decimalDigits,
        store_currency: currency,
        storeCurrency: currency,
      },
    };
  });
}

/* ------------------------- product card options loader ------------------------ */

type ProductCardOptionValueForCategory = {
  id: string;
  name: string;
  label: string;
  value: string;
  color: string | null;
  image: string | null;
  image_url: string | null;
};

type ProductCardOptionForCategory = {
  id: string;
  name: string;
  label: string;
  values: ProductCardOptionValueForCategory[];
};

type ProductCardOptionsMap = Record<string, ProductCardOptionForCategory[]>;

async function loadProductCardOptionsMapRaw(args: {
  store_id: string;
  productIds: string[];
}): Promise<ProductCardOptionsMap> {
  const storeId = s(args.store_id);
  const productIds = uniqueStrings(args.productIds).slice(0, 500);

  if (!storeId || !productIds.length) return {};

  const sb = await getStoreDb(storeId);

  const optionsResult = await sb
    .from("product_options")
    .select("id,product_id,name,display_type,sort_order")
    .in("product_id", productIds)
    .order("sort_order", { ascending: true });

  if (optionsResult.error || !Array.isArray(optionsResult.data)) {
    return {};
  }

  const optionRows = optionsResult.data as any[];
  if (!optionRows.length) return {};

  const optionIds = optionRows.map((option) => s(option?.id)).filter(Boolean);
  if (!optionIds.length) return {};

  const displayTypeByOptionId = new Map<string, string>();

  for (const option of optionRows) {
    const optionId = s(option?.id);
    if (!optionId) continue;

    displayTypeByOptionId.set(optionId, s(option?.display_type).toLowerCase());
  }

  const valuesResult = await sb
    .from("product_option_values")
    .select("id,option_id,name,display_value,image_url,sort_order")
    .in("option_id", optionIds)
    .order("sort_order", { ascending: true });

  if (valuesResult.error || !Array.isArray(valuesResult.data)) {
    return {};
  }

  const valueRows = valuesResult.data as any[];

  const valuesByOptionId = new Map<
    string,
    ProductCardOptionValueForCategory[]
  >();

  for (const value of valueRows) {
    const optionId = s(value?.option_id);
    if (!optionId) continue;

    const rawName = s(value?.name);
    const rawDisplayValue = s(value?.display_value);
    const imageUrl = s(value?.image_url) || null;

    const displayType = displayTypeByOptionId.get(optionId) || "";

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
      value: rawDisplayValue || rawName,
      color,
      image: imageUrl,
      image_url: imageUrl,
    });

    valuesByOptionId.set(optionId, arr);
  }

  const optionsByProductId = new Map<string, ProductCardOptionForCategory[]>();

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

  const out: ProductCardOptionsMap = {};

  for (const [productId, options] of optionsByProductId.entries()) {
    out[productId] = options;
  }

  return out;
}

const productCardOptionsMapCache = new Map<
  string,
  () => Promise<ProductCardOptionsMap>
>();

function loadProductCardOptionsMap(args: {
  store_id: string;
  productIds: string[];
}) {
  const storeId = s(args.store_id);
  const ids = uniqueStrings(args.productIds).sort();

  if (!storeId || !ids.length) return Promise.resolve({} as ProductCardOptionsMap);

  const idsHash = hashText(ids.join(","));
  const key = `${storeId}:${idsHash}`;

  let fn = productCardOptionsMapCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey("category", "product-card-options", storeId, idsHash),
          { ttlSeconds: 180 },
          () =>
            loadProductCardOptionsMapRaw({
              store_id: storeId,
              productIds: ids,
            }),
        ),
      ["category-product-card-options-map", storeId, idsHash],
      {
        revalidate: 120,
      },
    );

    productCardOptionsMapCache.set(key, fn);
  }

  return fn();
}

async function attachProductCardOptions(args: {
  store_id: string;
  products: any[];
}): Promise<any[]> {
  const storeId = s(args.store_id);
  const products = Array.isArray(args.products) ? args.products : [];

  if (!storeId || !products.length) return products;

  const productIds = Array.from(
    new Set(products.map((product) => s(product?.id)).filter(Boolean)),
  );

  if (!productIds.length) return products;

  const optionsMap = await loadProductCardOptionsMap({
    store_id: storeId,
    productIds,
  });

  return products.map((product) => {
    const productId = s(product?.id);
    const options = productId ? optionsMap[productId] : null;

    if (!options?.length) return product;

    const metadata =
      product?.metadata && typeof product.metadata === "object"
        ? product.metadata
        : {};

    return {
      ...product,
      options,
      metadata: {
        ...metadata,
        options,
      },
    };
  });
}

/* ------------------------- products by ids loader ------------------------ */

async function loadCategoryProductsByIdsRaw(args: {
  store_id: string;
  productIds: string[];
  limit: number;
}) {
  const storeId = s(args.store_id);
  const productIds = uniqueStrings(args.productIds).slice(
    0,
    Math.max(1, Math.min(500, Math.floor(Number(args.limit) || 60))),
  );

  if (!storeId || !productIds.length) return [];

  const rawProducts = await getProductsByIds({
    store_id: storeId,
    ids: productIds,
    limit: productIds.length,
  });

  const byId = new Map<string, any>();

  for (const product of Array.isArray(rawProducts) ? rawProducts : []) {
    const productId = s(product?.id);
    if (productId) byId.set(productId, product);
  }

  const orderedProducts = productIds
    .map((productId) => byId.get(productId))
    .filter(Boolean);

  const productsWithCurrency = await attachStoreCurrencyToProducts({
    store_id: storeId,
    products: orderedProducts,
  });

  return await attachProductCardOptions({
    store_id: storeId,
    products: productsWithCurrency,
  });
}

const categoryProductsByIdsCache = new Map<string, () => Promise<any[]>>();

export async function loadCategoryProductsByIds(args: {
  store_id: string;
  productIds: string[];
  limit?: number;
}) {
  const storeId = s(args.store_id);
  const productIds = uniqueStrings(args.productIds);
  const limit = Math.max(1, Math.min(500, Math.floor(Number(args.limit) || 60)));

  if (!storeId || !productIds.length) return [];

  const ids = productIds.slice(0, limit);
  const sortedIds = [...ids].sort();
  const idsHash = hashText(sortedIds.join(","));
  const key = `${storeId}:${limit}:${idsHash}`;

  let fn = categoryProductsByIdsCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey(
            "category",
            "products-by-ids",
            storeId,
            String(limit),
            idsHash,
          ),
          { ttlSeconds: 120 },
          () =>
            loadCategoryProductsByIdsRaw({
              store_id: storeId,
              productIds: sortedIds,
              limit,
            }),
        ),
      ["category-products-by-ids", storeId, String(limit), idsHash],
      {
        revalidate: 60,
      },
    );

    categoryProductsByIdsCache.set(key, fn);
  }

  const products = await fn();

  const byId = new Map<string, any>();

  for (const product of Array.isArray(products) ? products : []) {
    const id = s(product?.id);
    if (id) byId.set(id, product);
  }

  return ids.map((productId) => byId.get(productId)).filter(Boolean);
}

/* ------------------------- raw category loaders ------------------------ */

async function buildCategoryProductsForDisplay(args: {
  store_id: string;
  rawProducts: any[];
}) {
  const productsWithCurrency = await attachStoreCurrencyToProducts({
    store_id: args.store_id,
    products: args.rawProducts,
  });

  return await attachProductCardOptions({
    store_id: args.store_id,
    products: productsWithCurrency,
  });
}

async function loadCategoryPageByPublicNoRaw(args: {
  store_id: string;
  publicNo: number;
}) {
  const category = await getCategoryByPublicNo({
    store_id: args.store_id,
    public_no: args.publicNo,
  });

  if (!category) return null;

  const [rawProducts, options] = await Promise.all([
    getProductsByCategory({
      store_id: args.store_id,
      category_id: category.id,
      limit: 60,
    }),

    loadStoreOptions(args.store_id),
  ]);

  const products = await buildCategoryProductsForDisplay({
    store_id: args.store_id,
    rawProducts,
  });

  return {
    category,
    products,
    options,
  };
}

async function loadCategoryPageByShortCodeRaw(args: {
  store_id: string;
  code: string;
}) {
  const code = s(args.code);

  if (!code) return null;

  let decodedPublicNo: number | null = null;

  if (code.length <= 16) {
    try {
      decodedPublicNo = fromBase62(code);
    } catch {
      decodedPublicNo = null;
    }
  }

  const category =
    (await getCategoryByShortUrl({
      store_id: args.store_id,
      short_url: code,
    })) ||
    (decodedPublicNo
      ? await getCategoryByPublicNo({
          store_id: args.store_id,
          public_no: decodedPublicNo,
        })
      : null);

  if (!category) return null;

  const [rawProducts, options] = await Promise.all([
    getProductsByCategory({
      store_id: args.store_id,
      category_id: category.id,
      limit: 60,
    }),

    loadStoreOptions(args.store_id),
  ]);

  const products = await buildCategoryProductsForDisplay({
    store_id: args.store_id,
    rawProducts,
  });

  return {
    category,
    products,
    options,
  };
}

/* ------------------------- cached public loaders ------------------------ */

const categoryByPublicNoCache = new Map<string, () => Promise<any>>();

export async function loadCategoryPageByPublicNo(args: {
  store_id: string;
  publicNo: number;
}) {
  const storeId = s(args.store_id);
  const publicNo = Number(args.publicNo);

  if (!storeId || !Number.isFinite(publicNo) || publicNo <= 0) {
    return null;
  }

  const key = `${storeId}:public:${publicNo}`;

  let fn = categoryByPublicNoCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey("category", "page-public-no", storeId, String(publicNo)),
          { ttlSeconds: 120 },
          () =>
            loadCategoryPageByPublicNoRaw({
              store_id: storeId,
              publicNo,
            }),
        ),
      ["category-page-public-no", storeId, String(publicNo)],
      {
        revalidate: 60,
      },
    );

    categoryByPublicNoCache.set(key, fn);
  }

  return fn();
}

const categoryByShortCodeCache = new Map<string, () => Promise<any>>();

export async function loadCategoryPageByShortCode(args: {
  store_id: string;
  code: string;
}) {
  const storeId = s(args.store_id);
  const code = s(args.code);

  if (!storeId || !code) return null;

  const normalizedCode = normalizeCacheKey(code);
  const key = `${storeId}:short:${normalizedCode}`;

  let fn = categoryByShortCodeCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey("category", "page-short-code", storeId, normalizedCode),
          { ttlSeconds: 120 },
          () =>
            loadCategoryPageByShortCodeRaw({
              store_id: storeId,
              code,
            }),
        ),
      ["category-page-short-code", storeId, normalizedCode],
      {
        revalidate: 60,
      },
    );

    categoryByShortCodeCache.set(key, fn);
  }

  return fn();
}