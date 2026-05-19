// FILE: apps/storefront/src/data/pages/category.loader.ts
import { unstable_cache } from "next/cache";

import {
  getCategoryByPublicNo,
  getCategoryByShortUrl,
} from "@/data/catalog/category";
import { getProductsByCategory } from "@/data/catalog/products";
import { fromBase62 } from "@/lib/seo/base62";
import { supabaseAdmin } from "@/data/store/supabase.server";

/* ------------------------- helpers ------------------------ */

function s(value: any) {
  return String(value ?? "").trim();
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

/* ------------------------- store options loader ------------------------ */

async function loadStoreOptionsRaw(store_id: string) {
  const sb: any = supabaseAdmin();

  const { data, error } = await sb
    .from("store_settings")
    .select("slug,value")
    .eq("store_id", store_id)
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
  const key = normalizeCacheKey(store_id);

  let fn = storeOptionsCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () => loadStoreOptionsRaw(store_id),
      ["store-options", store_id],
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

  const sb: any = supabaseAdmin();

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
      () => loadStoreCurrenciesRaw(storeId),
      ["store-currencies-product-card", storeId],
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

async function attachProductCardOptions(args: {
  products: any[];
}): Promise<any[]> {
  const products = Array.isArray(args.products) ? args.products : [];

  if (!products.length) return products;

  const productIds = Array.from(
    new Set(products.map((product) => s(product?.id)).filter(Boolean)),
  );

  if (!productIds.length) return products;

  const sb: any = supabaseAdmin();

  const optionsResult = await sb
    .from("product_options")
    .select("id,product_id,name,display_type,sort_order")
    .in("product_id", productIds)
    .order("sort_order", { ascending: true });

  const optionRows = Array.isArray(optionsResult.data)
    ? (optionsResult.data as any[])
    : [];

  if (!optionRows.length) return products;

  const optionIds = optionRows.map((option) => s(option?.id)).filter(Boolean);

  if (!optionIds.length) return products;

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

  const valueRows = Array.isArray(valuesResult.data)
    ? (valuesResult.data as any[])
    : [];

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

  return products.map((product) => {
    const productId = s(product?.id);
    const options = optionsByProductId.get(productId);

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

/* ------------------------- raw category loaders ------------------------ */

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

  const productsWithCurrency = await attachStoreCurrencyToProducts({
    store_id: args.store_id,
    products: rawProducts,
  });

  const products = await attachProductCardOptions({
    products: productsWithCurrency,
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

  const productsWithCurrency = await attachStoreCurrencyToProducts({
    store_id: args.store_id,
    products: rawProducts,
  });

  const products = await attachProductCardOptions({
    products: productsWithCurrency,
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
        loadCategoryPageByPublicNoRaw({
          store_id: storeId,
          publicNo,
        }),
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

  const key = `${storeId}:short:${normalizeCacheKey(code)}`;

  let fn = categoryByShortCodeCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        loadCategoryPageByShortCodeRaw({
          store_id: storeId,
          code,
        }),
      ["category-page-short-code", storeId, normalizeCacheKey(code)],
      {
        revalidate: 60,
      },
    );

    categoryByShortCodeCache.set(key, fn);
  }

  return fn();
}