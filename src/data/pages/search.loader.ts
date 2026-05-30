// FILE: apps/storefront/src/data/pages/search.loader.ts

import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";

import { cacheKey } from "@/data/cache/cache-keys";
import { redisCached } from "@/data/cache/redis-cache.server";
import { getProductsBySearch } from "@/data/catalog/products";
import { getStoreDb } from "@/data/db/store-db.server";

/* ------------------------- helpers ------------------------ */

function s(value: any) {
  return String(value ?? "").trim();
}

function hashText(value: string) {
  return createHash("sha1").update(value).digest("hex");
}

function normalizeSearchQuery(value: any) {
  return s(value)
    .replace(/[%_]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 90);
}

function normalizeSort(value: any) {
  const sort = s(value);

  if (sort === "price_asc") return "price_asc";
  if (sort === "price_desc") return "price_desc";
  if (sort === "popular") return "popular";

  return "newest";
}

function normalizeCacheKey(value: any) {
  return s(value).toLowerCase();
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

function toNumber(value: any) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function clampDecimals(value: any) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;

  return Math.max(0, Math.min(4, Math.floor(n)));
}

function cleanCurrencyCode(value: any, fallback = "") {
  const code = s(value).toUpperCase();
  return code || fallback;
}

function positiveRate(value: any, fallback = 1) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function firstFiniteNumber(...values: any[]) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }

  return null;
}

function firstObject(value: any) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.find((item) => item && typeof item === "object") ?? null;
  }

  return null;
}

/* ------------------------- currency runtime ------------------------ */

type CurrencyRuntimeRow = {
  code: string;
  symbol: string;
  decimalDigits: number;
  rate: number;
  isDefault: boolean;
  enabled: boolean;
  metadata?: any;
  name_ar?: string | null;
  name_en?: string | null;
};

type StoreCurrencyForSearch = {
  code: string;
  symbol: string;
  decimalDigits: number;
};

function readCurrencyRateFromMetadata(metadata: any) {
  const meta = metadata && typeof metadata === "object" ? metadata : {};

  return positiveRate(
    meta?.rate ??
      meta?.exchange_rate ??
      meta?.conversion_rate ??
      meta?.rate_to_default ??
      meta?.rateToDefault ??
      meta?.value ??
      meta?.amount,
    1,
  );
}

async function readSelectedCurrencyCodeFromCookies() {
  try {
    const jar = await cookies();

    const names = [
      "mk_selected_currency",
      "mk_currency",
      "malak_currency",
      "currency",
      "store_currency",
      "selected_currency",
    ];

    for (const name of names) {
      const code = cleanCurrencyCode(jar.get(name)?.value, "");
      if (code) return code;
    }

    return "";
  } catch {
    return "";
  }
}

async function loadStoreCurrencyRowsRaw(store_id: string) {
  const storeId = s(store_id);
  if (!storeId) return [];

  const sb = await getStoreDb(storeId);

  const { data, error } = await sb
    .from("store_currencies")
    .select(
      "currency_code,symbol,decimal_digits,is_default,is_enabled,sort_order,metadata,name_ar,name_en",
    )
    .eq("store_id", storeId)
    .eq("is_enabled", true)
    .order("is_default", { ascending: false })
    .order("sort_order", { ascending: true });

  if (error || !Array.isArray(data)) return [];

  return data;
}

const storeCurrencyRowsCache = new Map<string, () => Promise<any[]>>();

function loadStoreCurrencyRows(store_id: string) {
  const storeId = s(store_id);
  const key = normalizeCacheKey(storeId);

  let fn = storeCurrencyRowsCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey("search", "store-currency-rows", storeId),
          { ttlSeconds: 300 },
          () => loadStoreCurrencyRowsRaw(storeId),
        ),
      ["search-page-store-currency-rows", storeId],
      { revalidate: 120 },
    );

    storeCurrencyRowsCache.set(key, fn);
  }

  return fn();
}

function buildCurrencyRuntime(rows: any[], fallbackCode = "SAR") {
  const list: CurrencyRuntimeRow[] = (Array.isArray(rows) ? rows : [])
    .map((row: any) => {
      const code = cleanCurrencyCode(row?.currency_code || row?.code);
      if (!code) return null;

      return {
        code,
        symbol: s(row?.symbol) || code,
        decimalDigits: clampDecimals(row?.decimal_digits),
        rate: readCurrencyRateFromMetadata(row?.metadata),
        isDefault: Boolean(row?.is_default),
        enabled: row?.is_enabled !== false && row?.enabled !== false,
        metadata: row?.metadata ?? null,
        name_ar: row?.name_ar ?? null,
        name_en: row?.name_en ?? null,
      };
    })
    .filter(Boolean) as CurrencyRuntimeRow[];

  const fallback = cleanCurrencyCode(fallbackCode, "SAR");

  const defaultCode =
    list.find((row) => row.isDefault && row.rate === 1)?.code ||
    list.find((row) => row.isDefault)?.code ||
    list.find((row) => row.code === fallback)?.code ||
    fallback;

  if (!list.some((row) => row.code === defaultCode)) {
    list.unshift({
      code: defaultCode,
      symbol: defaultCode,
      decimalDigits: 2,
      rate: 1,
      isDefault: true,
      enabled: true,
      metadata: null,
      name_ar: null,
      name_en: null,
    });
  }

  const map = new Map<string, CurrencyRuntimeRow>();

  for (const row of list) {
    map.set(row.code, {
      ...row,
      rate: row.code === defaultCode ? 1 : positiveRate(row.rate, 1),
      isDefault: row.code === defaultCode,
      enabled: row.code === defaultCode ? true : row.enabled,
    });
  }

  return {
    defaultCode,
    map,
  };
}

function resolveTargetCurrencyCode(args: {
  selectedCode: string;
  runtime: ReturnType<typeof buildCurrencyRuntime>;
}) {
  const selectedCode = cleanCurrencyCode(args.selectedCode, "");

  if (selectedCode) {
    const selected = args.runtime.map.get(selectedCode);
    if (selected?.enabled) return selected.code;
  }

  return args.runtime.defaultCode;
}

function currencyInfoFromRuntime(args: {
  code: string;
  runtime: ReturnType<typeof buildCurrencyRuntime>;
}): StoreCurrencyForSearch | null {
  const code = cleanCurrencyCode(args.code, args.runtime.defaultCode);
  const row = args.runtime.map.get(code);

  if (!row) return null;

  return {
    code: row.code,
    symbol: row.symbol || row.code,
    decimalDigits: clampDecimals(row.decimalDigits),
  };
}

function convertMoney(args: {
  amount: any;
  sourceCode: any;
  targetCode: any;
  runtime: ReturnType<typeof buildCurrencyRuntime>;
}) {
  const amount = toNumber(args.amount);
  if (!(amount > 0)) return 0;

  const defaultCode = args.runtime.defaultCode;
  const sourceCode = cleanCurrencyCode(args.sourceCode, defaultCode);
  const targetCode = cleanCurrencyCode(args.targetCode, defaultCode);

  const source =
    args.runtime.map.get(sourceCode) || args.runtime.map.get(defaultCode);

  const target =
    args.runtime.map.get(targetCode) || args.runtime.map.get(defaultCode);

  if (!source || !target) return amount;

  const sourceRate =
    source.code === defaultCode ? 1 : positiveRate(source.rate, 1);

  const targetRate =
    target.code === defaultCode ? 1 : positiveRate(target.rate, 1);

  const amountInDefault =
    source.code === defaultCode ? amount : amount * sourceRate;

  return target.code === defaultCode
    ? amountInDefault
    : amountInDefault / targetRate;
}

function convertNullablePrice(args: {
  amount: any;
  sourceCode: any;
  targetCurrency: string;
  currencyRuntime: ReturnType<typeof buildCurrencyRuntime>;
}) {
  const n = Number(args.amount ?? 0);
  if (!Number.isFinite(n) || n <= 0) return null;

  return convertMoney({
    amount: n,
    sourceCode: args.sourceCode,
    targetCode: args.targetCurrency,
    runtime: args.currencyRuntime,
  });
}

function readPricingCurrency(row: any, fallback: string) {
  return cleanCurrencyCode(
    row?.currency_code ??
      row?.currencyCode ??
      row?.currency ??
      row?.currency_id,
    fallback,
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

function loadStoreOptions(store_id: string) {
  const storeId = s(store_id);
  const key = normalizeCacheKey(storeId);

  let fn = storeOptionsCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey("search", "store-options", storeId),
          { ttlSeconds: 300 },
          () => loadStoreOptionsRaw(storeId),
        ),
      ["search-page-store-options", storeId],
      { revalidate: 120 },
    );

    storeOptionsCache.set(key, fn);
  }

  return fn();
}

/* ------------------------- attach currency + converted prices ------------------------ */

function buildStoreCurrencyPayload(currency: StoreCurrencyForSearch) {
  return {
    code: currency.code,
    currency_code: currency.code,
    symbol: currency.symbol,
    decimal_digits: currency.decimalDigits,
    decimalDigits: currency.decimalDigits,
  };
}

function convertPricingObject(args: {
  pricing: any;
  sourceCode: string;
  targetCurrency: string;
  currency: StoreCurrencyForSearch;
  currencyRuntime: ReturnType<typeof buildCurrencyRuntime>;
}) {
  const pricing =
    args.pricing &&
    typeof args.pricing === "object" &&
    !Array.isArray(args.pricing)
      ? args.pricing
      : {};

  const storeCurrency = buildStoreCurrencyPayload(args.currency);

  const rawPrice = firstFiniteNumber(
    pricing?.price,
    pricing?.regular_price,
    pricing?.amount,
  );

  const rawSalePrice = firstFiniteNumber(
    pricing?.sale_price,
    pricing?.salePrice,
    pricing?.discount,
    pricing?.discount_price,
  );

  return {
    ...pricing,

    price:
      rawPrice !== null
        ? convertNullablePrice({
            amount: rawPrice,
            sourceCode: args.sourceCode,
            targetCurrency: args.targetCurrency,
            currencyRuntime: args.currencyRuntime,
          })
        : pricing?.price,

    sale_price:
      rawSalePrice !== null
        ? convertNullablePrice({
            amount: rawSalePrice,
            sourceCode: args.sourceCode,
            targetCurrency: args.targetCurrency,
            currencyRuntime: args.currencyRuntime,
          })
        : pricing?.sale_price,

    currency: args.currency.code,
    currency_code: args.currency.code,
    currencyCode: args.currency.code,

    currencySymbol: args.currency.symbol,
    currency_symbol: args.currency.symbol,
    symbol: args.currency.symbol,

    currencyDecimals: args.currency.decimalDigits,
    currency_decimals: args.currency.decimalDigits,
    decimalDigits: args.currency.decimalDigits,
    decimal_digits: args.currency.decimalDigits,

    store_currency: storeCurrency,
    storeCurrency,
  };
}

function attachStoreCurrencyToProducts(args: {
  products: any[];
  currency: StoreCurrencyForSearch | null;
  currencyRuntime: ReturnType<typeof buildCurrencyRuntime>;
}) {
  const products = Array.isArray(args.products) ? args.products : [];
  const currency = args.currency;

  if (!products.length || !currency?.code) return products;

  const storeCurrency = buildStoreCurrencyPayload(currency);

  return products.map((product) => {
    const metadata =
      product?.metadata && typeof product.metadata === "object"
        ? product.metadata
        : {};

    const pricingObject =
      firstObject(product?.pricing) ?? firstObject(product?.product_pricing);

    const productPricingObject = firstObject(product?.product_pricing);

    const sourceCode = readPricingCurrency(
      pricingObject ?? productPricingObject ?? product ?? metadata,
      args.currencyRuntime.defaultCode,
    );

    const rawPrice = firstFiniteNumber(
      product?.price,
      product?.regular_price,
      pricingObject?.price,
      pricingObject?.regular_price,
      productPricingObject?.price,
      productPricingObject?.regular_price,
      metadata?.price,
    );

    const rawSalePrice = firstFiniteNumber(
      product?.sale_price,
      product?.salePrice,
      product?.discount,
      pricingObject?.sale_price,
      pricingObject?.salePrice,
      pricingObject?.discount,
      productPricingObject?.sale_price,
      productPricingObject?.salePrice,
      productPricingObject?.discount,
      metadata?.sale_price,
      metadata?.salePrice,
      metadata?.discount,
    );

    const convertedPrice =
      rawPrice !== null
        ? convertNullablePrice({
            amount: rawPrice,
            sourceCode,
            targetCurrency: currency.code,
            currencyRuntime: args.currencyRuntime,
          })
        : null;

    const convertedSalePrice =
      rawSalePrice !== null
        ? convertNullablePrice({
            amount: rawSalePrice,
            sourceCode,
            targetCurrency: currency.code,
            currencyRuntime: args.currencyRuntime,
          })
        : null;

    const nextPricing = pricingObject
      ? convertPricingObject({
          pricing: pricingObject,
          sourceCode,
          targetCurrency: currency.code,
          currency,
          currencyRuntime: args.currencyRuntime,
        })
      : product?.pricing;

    const nextProductPricing = productPricingObject
      ? convertPricingObject({
          pricing: productPricingObject,
          sourceCode,
          targetCurrency: currency.code,
          currency,
          currencyRuntime: args.currencyRuntime,
        })
      : product?.product_pricing;

    return {
      ...product,

      price: convertedPrice,
      sale_price: convertedSalePrice,

      currency: currency.code,
      currency_code: currency.code,
      currencyCode: currency.code,

      currencySymbol: currency.symbol,
      currency_symbol: currency.symbol,
      symbol: currency.symbol,

      currencyDecimals: currency.decimalDigits,
      currency_decimals: currency.decimalDigits,
      decimalDigits: currency.decimalDigits,
      decimal_digits: currency.decimalDigits,

      store_currency: storeCurrency,
      storeCurrency,

      pricing: nextPricing,
      product_pricing: nextProductPricing,

      metadata: {
        ...metadata,

        price: convertedPrice,
        sale_price: convertedSalePrice,

        currency: currency.code,
        currency_code: currency.code,
        currencyCode: currency.code,

        currencySymbol: currency.symbol,
        currency_symbol: currency.symbol,
        symbol: currency.symbol,

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

/* ------------------------- product card options loader ------------------------ */

type ProductCardOptionValueForSearch = {
  id: string;
  name: string;
  label: string;
  value: string;
  color: string | null;
  image: string | null;
  image_url: string | null;
};

type ProductCardOptionForSearch = {
  id: string;
  name: string;
  label: string;
  values: ProductCardOptionValueForSearch[];
};

type ProductCardOptionsMap = Record<string, ProductCardOptionForSearch[]>;

async function loadProductCardOptionsMapRaw(args: {
  store_id: string;
  productIds: string[];
}): Promise<ProductCardOptionsMap> {
  const storeId = s(args.store_id);
  const productIds = Array.from(
    new Set(args.productIds.map(s).filter(Boolean)),
  ).slice(0, 500);

  if (!storeId || !productIds.length) return {};

  const sb = await getStoreDb(storeId);

  const optionsResult = await sb
    .from("product_options")
    .select("id,product_id,name,display_type,sort_order")
    .in("product_id", productIds)
    .order("sort_order", { ascending: true });

  const optionRows = Array.isArray(optionsResult.data)
    ? (optionsResult.data as any[])
    : [];

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

  const valueRows = Array.isArray(valuesResult.data)
    ? (valuesResult.data as any[])
    : [];

  const valuesByOptionId = new Map<string, ProductCardOptionValueForSearch[]>();

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

  const optionsByProductId = new Map<string, ProductCardOptionForSearch[]>();

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
}): Promise<ProductCardOptionsMap> {
  const storeId = s(args.store_id);
  const ids = Array.from(new Set(args.productIds.map(s).filter(Boolean))).sort();

  if (!storeId || !ids.length) {
    return Promise.resolve({} as ProductCardOptionsMap);
  }

  const idsHash = hashText(ids.join(","));
  const key = `${storeId}:${idsHash}`;

  let fn = productCardOptionsMapCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey("search", "product-card-options", storeId, idsHash),
          { ttlSeconds: 180 },
          () =>
            loadProductCardOptionsMapRaw({
              store_id: storeId,
              productIds: ids,
            }),
        ),
      ["search-product-card-options-map", storeId, idsHash],
      { revalidate: 120 },
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

/* ------------------------- search page loader ------------------------ */

async function loadSearchPageRaw(args: {
  store_id: string;
  query: string;
  sort: string;
  limit: number;
  selectedCurrency: string;
}) {
  const storeId = s(args.store_id);
  const query = normalizeSearchQuery(args.query);
  const sort = normalizeSort(args.sort);
  const limit = Math.min(Math.max(Number(args.limit ?? 60), 1), 80);

  const [rawProducts, options, currencyRows] = await Promise.all([
    query.length >= 2
      ? getProductsBySearch({
          store_id: storeId,
          q: query,
          limit,
        })
      : Promise.resolve([]),

    loadStoreOptions(storeId),

    loadStoreCurrencyRows(storeId),
  ]);

  const currencyRuntime = buildCurrencyRuntime(currencyRows, "SAR");

  const targetCurrency = resolveTargetCurrencyCode({
    selectedCode: args.selectedCurrency,
    runtime: currencyRuntime,
  });

  const currency = currencyInfoFromRuntime({
    code: targetCurrency,
    runtime: currencyRuntime,
  });

  const productsWithOptions = await attachProductCardOptions({
    store_id: storeId,
    products: rawProducts,
  });

  const products = attachStoreCurrencyToProducts({
    products: productsWithOptions,
    currency,
    currencyRuntime,
  });

  return {
    route: "search",
    query,
    sort,
    products,
    total: products.length,
    options,
    currency,
  };
}

const searchPageCache = new Map<string, () => Promise<any>>();

export async function loadSearchPage(args: {
  store_id: string;
  q?: string | null;
  sort?: string | null;
  limit?: number;
}) {
  const storeId = s(args.store_id);
  const query = normalizeSearchQuery(args.q);
  const sort = normalizeSort(args.sort);
  const limit = Math.min(Math.max(Number(args.limit ?? 60), 1), 80);
  const selectedCurrency = cleanCurrencyCode(
    await readSelectedCurrencyCodeFromCookies(),
    "auto",
  );

  const queryHash = hashText(query);
  const key = `${storeId}:${queryHash}:${sort}:${limit}:${selectedCurrency}`;

  let fn = searchPageCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey(
            "search",
            "page",
            storeId,
            queryHash,
            sort,
            String(limit),
            selectedCurrency,
          ),
          { ttlSeconds: 90 },
          () =>
            loadSearchPageRaw({
              store_id: storeId,
              query,
              sort,
              limit,
              selectedCurrency,
            }),
        ),
      ["search-page", storeId, queryHash, sort, String(limit), selectedCurrency],
      { revalidate: 60 },
    );

    searchPageCache.set(key, fn);
  }

  return fn();
}