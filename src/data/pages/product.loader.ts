// FILE: apps/storefront/src/data/pages/product.loader.ts

import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";

import { cacheKey } from "@/data/cache/cache-keys";
import { redisCached } from "@/data/cache/redis-cache.server";
import {
  getProductByPublicNo,
  getProductByShortUrl,
  getProductsByCategory,
  getProductsByIds,
  getProductsForGrid,
  isProductVisibleInWeb,
} from "@/data/catalog/products";
import { getOrdersDb } from "@/data/db/orders-db.server";
import { getStoreDb } from "@/data/db/store-db.server";
import { fromBase62 } from "@/lib/seo/base62";

/* ------------------------- metadata fallback mappers ------------------------ */

type MetaOptionValue = {
  id: string;
  name: string;
  isDefault?: boolean;
  colorHex?: string | null;
  color?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;
  image?: string | null;
};

type MetaOption = {
  id: string;
  name: string;
  values?: MetaOptionValue[];
  featureType?: string;
  display_type?: string;
  displayType?: string;
};

type MetaVariantSelection = {
  groupId: string;
  valueId: string;
  groupName?: string;
  valueName?: string;
};

type MetaVariant = {
  id: string;
  qty?: number | null;
  price?: number | null;
  discount?: number | null;
  label?: string | null;
  selections?: MetaVariantSelection[];
};

function s(x: any) {
  return String(x ?? "").trim();
}

function hashText(value: string) {
  return createHash("sha1").update(value).digest("hex");
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

function normalizeCurrencyCode(value: any, fallback = "") {
  const code = s(value).toUpperCase();
  return code || fallback;
}

function positiveRate(value: any, fallback = 1) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) && n > 0 ? n : fallback;
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
      const code = normalizeCurrencyCode(jar.get(name)?.value, "");
      if (code) return code;
    }

    return "";
  } catch {
    return "";
  }
}

function normalizeChannelKey(x: any) {
  return s(x).toLowerCase();
}

function getMetadataChannels(meta: any): string[] | null {
  const raw = meta?.channels;
  if (!Array.isArray(raw)) return null;

  const out = raw.map((x: any) => normalizeChannelKey(x)).filter(Boolean);
  return Array.from(new Set(out));
}

function mapMetaOptionsToDbShape(meta: any) {
  const arr = Array.isArray(meta?.options) ? (meta.options as MetaOption[]) : [];

  return arr
    .filter((o) => o && o.id && o.name)
    .map((o, idx) => ({
      id: String(o.id),
      name: String(o.name),
      is_required: true,
      option_field_type: "radio",
      display_type: (o.featureType ?? o.displayType ?? o.display_type ?? "text") as any,
      displayType: (o.featureType ?? o.displayType ?? o.display_type ?? "text") as any,
      featureType: (o.featureType ?? o.displayType ?? o.display_type ?? "text") as any,
      sort_order: idx,
      values: (Array.isArray(o.values) ? o.values : [])
        .filter((v) => v && v.id && v.name)
        .map((v, vIdx) => ({
          id: String(v.id),
          name: String(v.name),
          display_value: null,
          extra_price: 0,
          quantity: null,
          is_default: Boolean((v as any).isDefault ?? false),
          colorHex: (v as any).colorHex ?? null,
          color: (v as any).color ?? (v as any).colorHex ?? null,
          imageUrl:
            (v as any).imageUrl ??
            (v as any).image_url ??
            (v as any).image ??
            null,
          image_url:
            (v as any).image_url ??
            (v as any).imageUrl ??
            (v as any).image ??
            null,
          image:
            (v as any).image ??
            (v as any).imageUrl ??
            (v as any).image_url ??
            null,
          sort_order: vIdx,
        })),
    }));
}

function mapMetaVariantsToDbShape(meta: any) {
  const arr = Array.isArray(meta?.variants)
    ? (meta.variants as MetaVariant[])
    : [];

  return arr
    .filter((v) => v && v.id)
    .map((v, idx) => ({
      id: String(v.id),
      sku: (v as any).sku ?? null,
      barcode: (v as any).barcode ?? null,
      mpn: (v as any).mpn ?? null,
      gtin: (v as any).gtin ?? null,
      price: v.price ?? null,
      sale_price: v.discount ?? null,
      cost_price: (v as any).cost ?? null,
      stock_quantity: Number(v.qty ?? 0),
      unlimited_quantity: false,
      notify_low: (v as any).lowQuantity ?? null,
      weight: (v as any).weightKg ?? null,
      weight_unit: "kg",
      option_value_ids: Array.isArray(v.selections)
        ? v.selections.map((x) => String(x.valueId)).filter(Boolean)
        : [],
      is_default: idx === 0,
      created_at: null,
    }));
}

function applyMetadataFallback(product: any) {
  const meta = (product?.metadata ?? {}) as any;
  const enabled = Boolean(meta?.optionsEnabled);

  const hasDbOptions = Array.isArray(product?.options) && product.options.length;
  const hasDbVariants =
    Array.isArray(product?.variants) && product.variants.length;

  if (!enabled) return product;

  if (!hasDbOptions && Array.isArray(meta?.options) && meta.options.length) {
    product.options = mapMetaOptionsToDbShape(meta);
  }

  if (!hasDbVariants && Array.isArray(meta?.variants) && meta.variants.length) {
    product.variants = mapMetaVariantsToDbShape(meta);
  }

  return product;
}

function readMetaBool(meta: any, keys: string[]) {
  for (const key of keys) {
    if (typeof meta?.[key] === "boolean") return meta[key];
    if (typeof meta?.[key] === "number") return meta[key] === 1;

    if (typeof meta?.[key] === "string") {
      const v = String(meta[key]).trim().toLowerCase();

      if (v === "true" || v === "1") return true;
      if (v === "false" || v === "0") return false;
    }
  }

  return null;
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
          cacheKey("product", "store-options", storeId),
          { ttlSeconds: 300 },
          () => loadStoreOptionsRaw(storeId),
        ),
      ["product-page-store-options", storeId],
      { revalidate: 120 },
    );

    storeOptionsCache.set(key, fn);
  }

  return fn();
}

/* ------------------------- size guides loader ------------------------ */

function safeSizeGuideObject(value: any): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

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

function extractSizeGuideRows(value: any): any[] {
  if (Array.isArray(value)) return value;

  const obj = safeSizeGuideObject(value);

  const candidates = [
    obj.size_guides,
    obj.sizeGuides,
    obj.guides,
    obj.items,
    obj.tables,
    obj.rows,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

async function loadStoreSizeGuidesRaw(store_id: string) {
  const storeId = s(store_id);
  if (!storeId) return [];

  const sb = await getStoreDb(storeId);

  const { data, error } = await sb
    .from("store_settings")
    .select("slug,value")
    .eq("store_id", storeId)
    .in("slug", [
      "options:size_guides",
      "options:product_size_guides",
      "settings:size_guides",
      "store:size_guides",
      "size_guides",
      "size-guides",
    ]);

  if (error || !Array.isArray(data)) return [];

  const out: any[] = [];

  for (const row of data) {
    out.push(...extractSizeGuideRows(row?.value));
  }

  return out;
}

const storeSizeGuidesCache = new Map<string, () => Promise<any[]>>();

function loadStoreSizeGuides(store_id: string) {
  const storeId = s(store_id);
  const key = normalizeCacheKey(storeId);

  let fn = storeSizeGuidesCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey("product", "store-size-guides", storeId),
          { ttlSeconds: 300 },
          () => loadStoreSizeGuidesRaw(storeId),
        ),
      ["product-page-store-size-guides", storeId],
      { revalidate: 120 },
    );

    storeSizeGuidesCache.set(key, fn);
  }

  return fn();
}

/* ------------------------- store currency loader ------------------------ */

type StoreCurrencyForProductPage = {
  currency_code: string;
  currencyCode: string;
  symbol: string;
  decimal_digits: number;
  decimalDigits: number;
  is_default: boolean;
  is_enabled: boolean;
  rate: number;
  metadata?: any;
};

function readCurrencyRateFromRow(row: any) {
  const meta =
    row?.metadata && typeof row.metadata === "object" ? row.metadata : {};

  return positiveRate(
    row?.rate ??
      row?.exchange_rate ??
      row?.conversion_rate ??
      row?.rate_to_default ??
      row?.value ??
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

async function loadStoreCurrenciesRaw(
  store_id: string,
): Promise<StoreCurrencyForProductPage[]> {
  const storeId = s(store_id);
  if (!storeId) return [];

  const sb = await getStoreDb(storeId);

  const { data, error } = await sb
    .from("store_currencies")
    .select(
      "currency_code,symbol,decimal_digits,is_default,is_enabled,sort_order,metadata",
    )
    .eq("store_id", storeId)
    .eq("is_enabled", true)
    .order("is_default", { ascending: false })
    .order("sort_order", { ascending: true });

  if (error || !Array.isArray(data)) return [];

  return data
    .map((row: any) => {
      const currencyCode = normalizeCurrencyCode(row?.currency_code, "");
      if (!currencyCode) return null;

      const decimalDigits = toDecimalDigits(row?.decimal_digits);

      return {
        currency_code: currencyCode,
        currencyCode,
        symbol: s(row?.symbol) || currencyCode,
        decimal_digits: decimalDigits,
        decimalDigits,
        is_default: Boolean(row?.is_default ?? false),
        is_enabled: row?.is_enabled !== false,
        rate: readCurrencyRateFromRow(row),
        metadata:
          row?.metadata && typeof row.metadata === "object"
            ? row.metadata
            : null,
      };
    })
    .filter(Boolean) as StoreCurrencyForProductPage[];
}

const storeCurrenciesCache = new Map<
  string,
  () => Promise<StoreCurrencyForProductPage[]>
>();

function loadStoreCurrencies(store_id: string) {
  const storeId = s(store_id);
  const key = normalizeCacheKey(storeId);

  let fn = storeCurrenciesCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey("product", "store-currencies", storeId),
          { ttlSeconds: 300 },
          () => loadStoreCurrenciesRaw(storeId),
        ),
      ["product-page-store-currencies", storeId],
      { revalidate: 120 },
    );

    storeCurrenciesCache.set(key, fn);
  }

  return fn();
}

function createCurrencyRuntime(currencies: StoreCurrencyForProductPage[]) {
  const rows = Array.isArray(currencies) ? currencies : [];

  const defaultCurrency =
    rows.find((currency) => currency.is_default && currency.rate === 1) ??
    rows.find((currency) => currency.is_default) ??
    rows[0] ??
    null;

  const defaultCode = normalizeCurrencyCode(
    defaultCurrency?.currency_code,
    "SAR",
  );

  const map = new Map<string, StoreCurrencyForProductPage>();

  for (const row of rows) {
    const code = normalizeCurrencyCode(row?.currency_code, "");
    if (!code) continue;

    map.set(code, {
      ...row,
      currency_code: code,
      currencyCode: code,
      symbol: s(row.symbol) || code,
      decimal_digits: toDecimalDigits(row.decimal_digits),
      decimalDigits: toDecimalDigits(row.decimalDigits),
      rate: code === defaultCode ? 1 : positiveRate(row.rate, 1),
      is_default: code === defaultCode,
      is_enabled: row.is_enabled !== false,
    });
  }

  if (!map.has(defaultCode)) {
    map.set(defaultCode, {
      currency_code: defaultCode,
      currencyCode: defaultCode,
      symbol: defaultCode,
      decimal_digits: 2,
      decimalDigits: 2,
      is_default: true,
      is_enabled: true,
      rate: 1,
      metadata: null,
    });
  }

  return {
    defaultCode,
    map,
  };
}

type CurrencyRuntimeForProductPage = ReturnType<typeof createCurrencyRuntime>;

function pickCurrencyByCode(args: {
  code: string;
  currencies: StoreCurrencyForProductPage[];
}) {
  const code = normalizeCurrencyCode(args.code, "");
  if (!code) return null;

  return (
    (Array.isArray(args.currencies) ? args.currencies : []).find(
      (currency) =>
        normalizeCurrencyCode(currency.currency_code, "") === code &&
        currency.is_enabled !== false,
    ) ?? null
  );
}

function pickDefaultCurrency(currencies: StoreCurrencyForProductPage[]) {
  const rows = Array.isArray(currencies) ? currencies : [];

  return (
    rows.find(
      (currency) => currency.is_default && currency.is_enabled !== false,
    ) ??
    rows.find((currency) => currency.is_enabled !== false) ??
    null
  );
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

function pickTargetCurrency(args: {
  product: any;
  currencies: StoreCurrencyForProductPage[];
  selectedCurrencyCode?: string | null;
}) {
  const selected = pickCurrencyByCode({
    code: args.selectedCurrencyCode || "",
    currencies: args.currencies,
  });

  if (selected) return selected;

  const productCurrency = pickCurrencyByCode({
    code: readProductCurrencyCode(args.product),
    currencies: args.currencies,
  });

  if (productCurrency) return productCurrency;

  return pickDefaultCurrency(args.currencies);
}

function convertMoney(args: {
  amount: any;
  sourceCode: any;
  targetCode: any;
  currencies: StoreCurrencyForProductPage[];
  runtime?: CurrencyRuntimeForProductPage;
}) {
  const amount = Number(args.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;

  const runtime = args.runtime ?? createCurrencyRuntime(args.currencies);

  const sourceCode = normalizeCurrencyCode(args.sourceCode, runtime.defaultCode);
  const targetCode = normalizeCurrencyCode(args.targetCode, runtime.defaultCode);

  const source =
    runtime.map.get(sourceCode) || runtime.map.get(runtime.defaultCode);

  const target =
    runtime.map.get(targetCode) || runtime.map.get(runtime.defaultCode);

  if (!source || !target) return amount;

  const sourceRate =
    source.currency_code === runtime.defaultCode
      ? 1
      : positiveRate(source.rate, 1);

  const targetRate =
    target.currency_code === runtime.defaultCode
      ? 1
      : positiveRate(target.rate, 1);

  const amountInDefault =
    source.currency_code === runtime.defaultCode ? amount : amount * sourceRate;

  return target.currency_code === runtime.defaultCode
    ? amountInDefault
    : amountInDefault / targetRate;
}

function convertNumberField(
  value: any,
  args: {
    sourceCode: string;
    targetCode: string;
    currencies: StoreCurrencyForProductPage[];
    runtime?: CurrencyRuntimeForProductPage;
  },
) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  if (n <= 0) return n;

  return convertMoney({
    amount: n,
    sourceCode: args.sourceCode,
    targetCode: args.targetCode,
    currencies: args.currencies,
    runtime: args.runtime,
  });
}

function convertMoneyObject<T extends Record<string, any> | null | undefined>(
  obj: T,
  args: {
    sourceCode: string;
    targetCode: string;
    currencies: StoreCurrencyForProductPage[];
    runtime?: CurrencyRuntimeForProductPage;
  },
): T {
  if (!obj || typeof obj !== "object") return obj;

  return {
    ...obj,
    price: convertNumberField(obj.price, args),
    sale_price: convertNumberField(obj.sale_price, args),
    salePrice: convertNumberField(obj.salePrice, args),
    regular_price: convertNumberField(obj.regular_price, args),
    regularPrice: convertNumberField(obj.regularPrice, args),
    base_price: convertNumberField(obj.base_price, args),
    basePrice: convertNumberField(obj.basePrice, args),
    compare_at_price: convertNumberField(obj.compare_at_price, args),
    compareAtPrice: convertNumberField(obj.compareAtPrice, args),
    cost_price: convertNumberField(obj.cost_price, args),
    costPrice: convertNumberField(obj.costPrice, args),
  } as T;
}

function convertOptionsMoney(
  options: any,
  args: {
    sourceCode: string;
    targetCode: string;
    currencies: StoreCurrencyForProductPage[];
    runtime?: CurrencyRuntimeForProductPage;
  },
) {
  if (!Array.isArray(options)) return options;

  return options.map((option) => ({
    ...option,
    values: Array.isArray(option?.values)
      ? option.values.map((value: any) => ({
          ...value,
          extra_price: convertNumberField(value?.extra_price, args),
          extraPrice: convertNumberField(value?.extraPrice, args),
        }))
      : option?.values,
  }));
}

function convertVariantsMoney(
  variants: any,
  args: {
    sourceCode: string;
    targetCode: string;
    currencies: StoreCurrencyForProductPage[];
    runtime?: CurrencyRuntimeForProductPage;
  },
) {
  if (!Array.isArray(variants)) return variants;

  return variants.map((variant) => convertMoneyObject(variant, args));
}

function attachCurrencyToProduct(args: {
  product: any;
  currencies: StoreCurrencyForProductPage[];
  selectedCurrencyCode?: string | null;
}) {
  const product = args.product;
  if (!product) return product;

  const currencies = Array.isArray(args.currencies) ? args.currencies : [];
  if (!currencies.length) return product;

  const targetCurrency = pickTargetCurrency({
    product,
    currencies,
    selectedCurrencyCode: args.selectedCurrencyCode,
  });

  if (!targetCurrency) return product;

  const runtime = createCurrencyRuntime(currencies);
  const sourceCode = normalizeCurrencyCode(
    readProductCurrencyCode(product),
    runtime.defaultCode,
  );
  const targetCode = normalizeCurrencyCode(
    targetCurrency.currency_code,
    runtime.defaultCode,
  );

  const moneyArgs = {
    sourceCode,
    targetCode,
    currencies,
    runtime,
  };

  const metadata =
    product?.metadata && typeof product.metadata === "object"
      ? product.metadata
      : {};

  const pricing =
    product?.pricing && typeof product.pricing === "object"
      ? {
          ...convertMoneyObject(product.pricing, moneyArgs),
          currency: targetCode,
          currency_code: targetCode,
          currencyCode: targetCode,
          currency_symbol: targetCurrency.symbol,
          currencySymbol: targetCurrency.symbol,
          currency_decimals: targetCurrency.decimal_digits,
          currencyDecimals: targetCurrency.decimalDigits,
          decimal_digits: targetCurrency.decimal_digits,
          decimalDigits: targetCurrency.decimalDigits,
        }
      : product?.pricing;

  const productPricing =
    product?.product_pricing && typeof product.product_pricing === "object"
      ? {
          ...convertMoneyObject(product.product_pricing, moneyArgs),
          currency: targetCode,
          currency_code: targetCode,
          currencyCode: targetCode,
          currency_symbol: targetCurrency.symbol,
          currencySymbol: targetCurrency.symbol,
          currency_decimals: targetCurrency.decimal_digits,
          currencyDecimals: targetCurrency.decimalDigits,
          decimal_digits: targetCurrency.decimal_digits,
          decimalDigits: targetCurrency.decimalDigits,
        }
      : product?.product_pricing;

  const storeCurrency = {
    ...targetCurrency,
    code: targetCode,
    currency_code: targetCode,
    currencyCode: targetCode,
    symbol: targetCurrency.symbol,
    decimal_digits: targetCurrency.decimal_digits,
    decimalDigits: targetCurrency.decimalDigits,
  };

  return {
    ...product,

    price: convertNumberField(product?.price, moneyArgs),
    sale_price: convertNumberField(product?.sale_price, moneyArgs),
    salePrice: convertNumberField(product?.salePrice, moneyArgs),
    regular_price: convertNumberField(product?.regular_price, moneyArgs),
    regularPrice: convertNumberField(product?.regularPrice, moneyArgs),
    base_price: convertNumberField(product?.base_price, moneyArgs),
    basePrice: convertNumberField(product?.basePrice, moneyArgs),
    compare_at_price: convertNumberField(product?.compare_at_price, moneyArgs),
    compareAtPrice: convertNumberField(product?.compareAtPrice, moneyArgs),

    currency: targetCode,
    currency_code: targetCode,
    currencyCode: targetCode,
    currency_symbol: targetCurrency.symbol,
    currencySymbol: targetCurrency.symbol,
    currency_decimals: targetCurrency.decimal_digits,
    currencyDecimals: targetCurrency.decimalDigits,
    decimal_digits: targetCurrency.decimal_digits,
    decimalDigits: targetCurrency.decimalDigits,

    store_currency: storeCurrency,
    storeCurrency,

    pricing,
    product_pricing: productPricing,

    options: convertOptionsMoney(product?.options, moneyArgs),
    variants: convertVariantsMoney(product?.variants, moneyArgs),

    metadata: {
      ...metadata,
      currency: targetCode,
      currency_code: targetCode,
      currencyCode: targetCode,
      currency_symbol: targetCurrency.symbol,
      currencySymbol: targetCurrency.symbol,
      currency_decimals: targetCurrency.decimal_digits,
      currencyDecimals: targetCurrency.decimalDigits,
      decimal_digits: targetCurrency.decimal_digits,
      decimalDigits: targetCurrency.decimalDigits,
      store_currency: storeCurrency,
      storeCurrency,
    },
  };
}

async function attachStoreCurrencyToProducts(args: {
  store_id: string;
  products: any[];
  selectedCurrencyCode?: string | null;
}) {
  const products = Array.isArray(args.products) ? args.products : [];
  if (!products.length) return products;

  const currencies = await loadStoreCurrencies(args.store_id);
  if (!currencies.length) return products;

  return products.map((product) =>
    attachCurrencyToProduct({
      product,
      currencies,
      selectedCurrencyCode: args.selectedCurrencyCode,
    }),
  );
}

/* ------------------------- purchase count loader ------------------------ */

async function loadProductPurchaseCountRaw(store_id: string, product_id: string) {
  const storeId = s(store_id);
  const productId = s(product_id);

  if (!storeId || !productId) return 0;

  const sb = await getOrdersDb(storeId);

  const { data, error } = await sb
    .from("order_items")
    .select("qty, orders!inner(status)")
    .eq("store_id", storeId)
    .eq("product_id", productId)
    .in("orders.status", ["pending", "paid", "completed", "shipped"]);

  if (error || !Array.isArray(data)) {
    return 0;
  }

  let total = 0;

  for (const row of data as any[]) {
    total += Number(row?.qty ?? 0);
  }

  return total;
}

const purchaseCountCache = new Map<string, () => Promise<number>>();

function loadProductPurchaseCount(store_id: string, product_id: string) {
  const storeId = s(store_id);
  const productId = s(product_id);
  const key = `${storeId}:${productId}`;

  let fn = purchaseCountCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey("product", "purchase-count", storeId, productId),
          { ttlSeconds: 180 },
          () => loadProductPurchaseCountRaw(storeId, productId),
        ),
      ["product-purchase-count", storeId, productId],
      { revalidate: 120 },
    );

    purchaseCountCache.set(key, fn);
  }

  return fn();
}

/* ------------------------- recommendations helpers ------------------------ */

function readRecommendationsSettings(rawOptions: Record<string, any>) {
  const raw = rawOptions?.["options:product_recommendations"];

  return {
    enabled: Boolean(raw?.enabled ?? true),
    type: String(raw?.type ?? "category").trim() as
      | "random"
      | "category"
      | "brand"
      | "tag",
  };
}

function uniqueProducts(rows: any[], currentProductId: string, limit = 8) {
  const out: any[] = [];
  const seen = new Set<string>();

  for (const row of Array.isArray(rows) ? rows : []) {
    const id = s(row?.id);

    if (!id) continue;
    if (id === currentProductId) continue;
    if (seen.has(id)) continue;

    seen.add(id);
    out.push(row);

    if (out.length >= limit) break;
  }

  return out;
}

async function loadRecommendedByCategoryRaw(args: {
  store_id: string;
  currentProductId: string;
  categoryIds: string[];
  limit: number;
}) {
  const categoryIds = Array.from(
    new Set(args.categoryIds.map(s).filter(Boolean)),
  );

  if (!categoryIds.length) return [];

  const rowsByCategory = await Promise.all(
    categoryIds.map((categoryId) =>
      getProductsByCategory({
        store_id: args.store_id,
        category_id: categoryId,
        limit: args.limit * 3,
      }),
    ),
  );

  const out: any[] = [];
  const seen = new Set<string>();

  for (const rows of rowsByCategory) {
    for (const row of Array.isArray(rows) ? rows : []) {
      const id = s(row?.id);

      if (!id) continue;
      if (id === args.currentProductId) continue;
      if (seen.has(id)) continue;

      seen.add(id);
      out.push(row);

      if (out.length >= args.limit) return out;
    }
  }

  return out;
}

const recommendedByCategoryCache = new Map<string, () => Promise<any[]>>();

function loadRecommendedByCategory(args: {
  store_id: string;
  currentProductId: string;
  categoryIds: string[];
  limit: number;
}) {
  const ids = Array.from(
    new Set(args.categoryIds.map(s).filter(Boolean)),
  ).sort();

  if (!ids.length) return Promise.resolve([]);

  const storeId = s(args.store_id);
  const currentProductId = s(args.currentProductId);
  const limit = Math.min(Math.max(Number(args.limit ?? 8), 1), 12);
  const idsHash = hashText(ids.join(","));

  const key = `${storeId}:${currentProductId}:${limit}:${idsHash}`;

  let fn = recommendedByCategoryCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey(
            "product",
            "recommended-by-category",
            storeId,
            currentProductId,
            String(limit),
            idsHash,
          ),
          { ttlSeconds: 180 },
          () =>
            loadRecommendedByCategoryRaw({
              store_id: storeId,
              currentProductId,
              categoryIds: ids,
              limit,
            }),
        ),
      [
        "recommended-by-category",
        storeId,
        currentProductId,
        String(limit),
        idsHash,
      ],
      { revalidate: 120 },
    );

    recommendedByCategoryCache.set(key, fn);
  }

  return fn();
}

async function loadRecommendedByBrandRaw(args: {
  store_id: string;
  currentProductId: string;
  brandId: string;
  limit: number;
}) {
  const storeId = s(args.store_id);
  const currentProductId = s(args.currentProductId);
  const brandId = s(args.brandId);

  if (!storeId || !brandId) return [];

  const sb = await getStoreDb(storeId);

  const r = await sb
    .from("products")
    .select("id")
    .eq("store_id", storeId)
    .eq("brand_id", brandId)
    .limit(args.limit * 4);

  const rawIds = (Array.isArray(r.data) ? r.data : [])
    .map((x: any) => s(x?.id))
    .filter((id: string) => Boolean(id))
    .filter((id: string) => id !== currentProductId);

  const ids: string[] = Array.from(new Set<string>(rawIds)).slice(
    0,
    args.limit * 3,
  );

  if (!ids.length) return [];

  const products = await getProductsByIds({
    store_id: storeId,
    ids,
    limit: ids.length,
  });

  const byId = new Map<string, any>();

  for (const product of Array.isArray(products) ? products : []) {
    const id = s(product?.id);
    if (id) byId.set(id, product);
  }

  return ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .filter((product: any) => s(product?.id) !== currentProductId)
    .slice(0, args.limit);
}

const recommendedByBrandCache = new Map<string, () => Promise<any[]>>();

function loadRecommendedByBrand(args: {
  store_id: string;
  currentProductId: string;
  brandId: string;
  limit: number;
}) {
  const storeId = s(args.store_id);
  const currentProductId = s(args.currentProductId);
  const brandId = s(args.brandId);
  const limit = Math.min(Math.max(Number(args.limit ?? 8), 1), 12);

  if (!brandId) return Promise.resolve([]);

  const key = `${storeId}:${currentProductId}:${brandId}:${limit}`;

  let fn = recommendedByBrandCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey(
            "product",
            "recommended-by-brand",
            storeId,
            currentProductId,
            brandId,
            String(limit),
          ),
          { ttlSeconds: 180 },
          () =>
            loadRecommendedByBrandRaw({
              store_id: storeId,
              currentProductId,
              brandId,
              limit,
            }),
        ),
      [
        "recommended-by-brand",
        storeId,
        currentProductId,
        brandId,
        String(limit),
      ],
      { revalidate: 120 },
    );

    recommendedByBrandCache.set(key, fn);
  }

  return fn();
}

async function loadRecommendedByTagRaw(args: {
  store_id: string;
  currentProductId: string;
  tagIds: string[];
  limit: number;
}) {
  const storeId = s(args.store_id);
  const currentProductId = s(args.currentProductId);
  const tagIds = Array.from(new Set(args.tagIds.map(s).filter(Boolean)));

  if (!storeId || !tagIds.length) return [];

  const sb = await getStoreDb(storeId);

  const tagResults = await Promise.all(
    tagIds.map((tagId) =>
      sb
        .from("product_tag_links")
        .select("product_id")
        .eq("tag_id", tagId)
        .limit(args.limit * 4),
    ),
  );

  const collectedIds: string[] = [];
  const seen = new Set<string>();

  for (const result of tagResults) {
    const rows = Array.isArray(result?.data) ? result.data : [];

    for (const row of rows) {
      const id = s(row?.product_id);

      if (!id) continue;
      if (id === currentProductId) continue;
      if (seen.has(id)) continue;

      seen.add(id);
      collectedIds.push(id);

      if (collectedIds.length >= args.limit * 3) break;
    }

    if (collectedIds.length >= args.limit * 3) break;
  }

  if (!collectedIds.length) return [];

  const products = await getProductsByIds({
    store_id: storeId,
    ids: collectedIds,
    limit: collectedIds.length,
  });

  const byId = new Map<string, any>();

  for (const product of Array.isArray(products) ? products : []) {
    const id = s(product?.id);
    if (id) byId.set(id, product);
  }

  return collectedIds
    .map((id) => byId.get(id))
    .filter(Boolean)
    .filter((product: any) => s(product?.id) !== currentProductId)
    .slice(0, args.limit);
}

const recommendedByTagCache = new Map<string, () => Promise<any[]>>();

function loadRecommendedByTag(args: {
  store_id: string;
  currentProductId: string;
  tagIds: string[];
  limit: number;
}) {
  const ids = Array.from(new Set(args.tagIds.map(s).filter(Boolean))).sort();

  if (!ids.length) return Promise.resolve([]);

  const storeId = s(args.store_id);
  const currentProductId = s(args.currentProductId);
  const limit = Math.min(Math.max(Number(args.limit ?? 8), 1), 12);
  const idsHash = hashText(ids.join(","));

  const key = `${storeId}:${currentProductId}:${limit}:${idsHash}`;

  let fn = recommendedByTagCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey(
            "product",
            "recommended-by-tag",
            storeId,
            currentProductId,
            String(limit),
            idsHash,
          ),
          { ttlSeconds: 180 },
          () =>
            loadRecommendedByTagRaw({
              store_id: storeId,
              currentProductId,
              tagIds: ids,
              limit,
            }),
        ),
      ["recommended-by-tag", storeId, currentProductId, String(limit), idsHash],
      { revalidate: 120 },
    );

    recommendedByTagCache.set(key, fn);
  }

  return fn();
}

async function loadRecommendedProductsRaw(args: {
  store_id: string;
  product: any;
  rawOptions: Record<string, any>;
  limit?: number;
}) {
  const limit = Math.min(Math.max(Number(args.limit ?? 8), 1), 12);
  const currentProductId = s(args.product?.id);

  if (!currentProductId) return [];

  const settings = readRecommendationsSettings(args.rawOptions);
  if (!settings.enabled) return [];

  const categoryIds = Array.isArray(args.product?.seo?.categories)
    ? args.product.seo.categories.map((x: any) => s(x?.id)).filter(Boolean)
    : [];

  const brandId = s(args.product?.brand?.id);

  const tagIds = Array.isArray(args.product?.tags)
    ? args.product.tags.map((x: any) => s(x?.id)).filter(Boolean)
    : [];

  let rows: any[] = [];

  if (settings.type === "category") {
    if (!categoryIds.length) return [];

    rows = await loadRecommendedByCategory({
      store_id: args.store_id,
      currentProductId,
      categoryIds,
      limit,
    });

    return uniqueProducts(rows, currentProductId, limit);
  }

  if (settings.type === "brand") {
    if (!brandId) return [];

    rows = await loadRecommendedByBrand({
      store_id: args.store_id,
      currentProductId,
      brandId,
      limit,
    });

    return uniqueProducts(rows, currentProductId, limit);
  }

  if (settings.type === "tag") {
    if (!tagIds.length) return [];

    rows = await loadRecommendedByTag({
      store_id: args.store_id,
      currentProductId,
      tagIds,
      limit,
    });

    return uniqueProducts(rows, currentProductId, limit);
  }

  rows = await getProductsForGrid({
    store_id: args.store_id,
    limit: limit + 4,
  });

  return uniqueProducts(rows, currentProductId, limit);
}

const recommendedProductsCache = new Map<string, () => Promise<any[]>>();

function loadRecommendedProducts(args: {
  store_id: string;
  product: any;
  rawOptions: Record<string, any>;
  limit?: number;
}) {
  const storeId = s(args.store_id);
  const limit = Math.min(Math.max(Number(args.limit ?? 8), 1), 12);
  const currentProductId = s(args.product?.id);

  if (!currentProductId) return Promise.resolve([]);

  const settings = readRecommendationsSettings(args.rawOptions);

  const categoryIds = Array.isArray(args.product?.seo?.categories)
    ? args.product.seo.categories
        .map((x: any) => s(x?.id))
        .filter(Boolean)
        .sort()
    : [];

  const tagIds = Array.isArray(args.product?.tags)
    ? args.product.tags
        .map((x: any) => s(x?.id))
        .filter(Boolean)
        .sort()
    : [];

  const brandId = s(args.product?.brand?.id);
  const categoryHash = hashText(categoryIds.join(","));
  const tagHash = hashText(tagIds.join(","));

  const key = [
    storeId,
    currentProductId,
    String(limit),
    String(settings.enabled),
    settings.type,
    brandId,
    categoryHash,
    tagHash,
  ].join(":");

  let fn = recommendedProductsCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey(
            "product",
            "recommendations",
            storeId,
            currentProductId,
            String(limit),
            String(settings.enabled),
            settings.type,
            brandId || "none",
            categoryHash,
            tagHash,
          ),
          { ttlSeconds: 180 },
          () =>
            loadRecommendedProductsRaw({
              store_id: storeId,
              product: args.product,
              rawOptions: args.rawOptions,
              limit,
            }),
        ),
      [
        "product-recommendations",
        storeId,
        currentProductId,
        String(limit),
        String(settings.enabled),
        settings.type,
        brandId,
        categoryHash,
        tagHash,
      ],
      { revalidate: 120 },
    );

    recommendedProductsCache.set(key, fn);
  }

  return fn();
}

/* ------------------------- enrich full product ------------------------ */

async function enrichProductFullRaw(args: {
  store_id: string;
  product: any;
  selectedCurrencyCode?: string | null;
}) {
  const { store_id, product } = args;
  const storeId = s(store_id);

  if (!storeId || !product?.id) return product;

  const sb = await getStoreDb(storeId);
  const product_id = product.id as string;
  const brandId = s(product?.brand_id);
  const meta = (product?.metadata ?? {}) as any;

  const [
    mediaR,
    pricingR,
    stockR,
    shippingR,
    optionsR,
    variantsR,
    tagLinksR,
    brandR,
    purchaseCountR,
    storeCurrencies,
  ] = await Promise.all([
    sb
      .from("product_media")
      .select(
        "id,media_kind,original_url,thumbnail_url,alt,video_url,is_default,sort_order,created_at",
      )
      .eq("store_id", storeId)
      .eq("product_id", product_id)
      .order("is_default", { ascending: false })
      .order("sort_order", { ascending: true }),

    sb
      .from("product_pricing")
      .select(
        "currency,price,sale_price,cost_price,sale_start,sale_end,with_tax,tax_reason_code",
      )
      .eq("product_id", product_id)
      .maybeSingle(),

    sb
      .from("product_stock")
      .select(
        "quantity,unlimited_quantity,hide_quantity,maximum_quantity_per_order,notify_low",
      )
      .eq("product_id", product_id)
      .maybeSingle(),

    sb
      .from("product_shipping")
      .select("weight,weight_unit")
      .eq("product_id", product_id)
      .maybeSingle(),

    sb
      .from("product_options")
      .select("id,name,is_required,option_field_type,display_type,sort_order")
      .eq("product_id", product_id)
      .order("sort_order", { ascending: true }),

    sb
      .from("product_variants")
      .select(
        "id,sku,barcode,mpn,gtin,price,sale_price,cost_price,stock_quantity,unlimited_quantity,notify_low,weight,weight_unit,is_default,created_at",
      )
      .eq("product_id", product_id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true }),

    sb.from("product_tag_links").select("tag_id").eq("product_id", product_id),

    brandId
      ? sb
          .from("brands")
          .select("id,name,logo_url,banner_url,description,metadata")
          .eq("store_id", storeId)
          .eq("id", brandId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as any),

    loadProductPurchaseCount(storeId, product_id),

    loadStoreCurrencies(storeId),
  ]);

  const media = (mediaR.data || []) as any[];
  const pricing = pricingR.data || null;
  const stock = stockR.data || null;
  const shipping = shippingR.data || null;
  const options = (optionsR.data || []) as any[];
  const variants = (variantsR.data || []) as any[];
  const tagLinks = (tagLinksR.data || []) as any[];
  const brand = brandR.data || null;
  const purchaseCount = purchaseCountR || 0;

  const optionIds = options.map((o) => o.id).filter(Boolean);
  const variantIds = variants.map((v) => v.id).filter(Boolean);
  const tagIds = tagLinks.map((x) => x.tag_id).filter(Boolean);

  const [optionValuesR, variantOptionLinksR, tagsR] = await Promise.all([
    optionIds.length
      ? sb
          .from("product_option_values")
          .select(
            "id,option_id,name,extra_price,quantity,is_default,display_value,image_url,sort_order",
          )
          .in("option_id", optionIds)
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: [], error: null }),

    variantIds.length
      ? sb
          .from("variant_option_values")
          .select("variant_id,option_value_id")
          .in("variant_id", variantIds)
      : Promise.resolve({ data: [], error: null }),

    tagIds.length
      ? sb
          .from("product_tags")
          .select("id,name")
          .eq("store_id", storeId)
          .in("id", tagIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const optionValues = Array.isArray(optionValuesR.data)
    ? optionValuesR.data
    : [];

  const variantOptionLinks = Array.isArray(variantOptionLinksR.data)
    ? variantOptionLinksR.data
    : [];

  const tags = Array.isArray(tagsR.data) ? tagsR.data : [];

  const valuesByOption = new Map<string, any[]>();

  for (const v of optionValues) {
    const k = String(v.option_id);

    if (!valuesByOption.has(k)) valuesByOption.set(k, []);
    valuesByOption.get(k)!.push(v);
  }

  const optionsWithValues = options.map((o) => ({
    ...o,
    values: valuesByOption.get(String(o.id)) || [],
  }));

  const optionValueById = new Map<string, any>();

  for (const v of optionValues) {
    optionValueById.set(String(v.id), v);
  }

  const linksByVariant = new Map<string, any[]>();

  for (const l of variantOptionLinks) {
    const k = String(l.variant_id);

    if (!linksByVariant.has(k)) linksByVariant.set(k, []);
    linksByVariant.get(k)!.push(l);
  }

  const variantsWithOptions = variants.map((v) => {
    const links = linksByVariant.get(String(v.id)) || [];

    const resolved = links
      .map((x) => optionValueById.get(String(x.option_value_id)))
      .filter(Boolean);

    return {
      ...v,
      option_value_ids: links.map((x) => x.option_value_id),
      option_values: resolved,
    };
  });

  const hiddenMeta = readMetaBool(meta, [
    "is_hidden",
    "hidden",
    "hide_product",
    "product_hidden",
  ]);

  const allowFileMeta = readMetaBool(meta, [
    "enableUploadImage",
    "allow_file_upload",
    "enable_file_upload",
    "attach_file_enabled",
    "attachment_enabled",
    "allow_attachment",
  ]);

  const allowNoteMeta = readMetaBool(meta, [
    "enableNote",
    "allow_note",
    "enable_note",
    "note_enabled",
    "allow_customer_note",
  ]);

  const channels = getMetadataChannels(meta);

  const visibleInWeb = isProductVisibleInWeb({
    status: product?.status,
    metadata: meta,
  });

  const full = {
    ...product,
    media,
    pricing,
    stock,
    shipping: {
      requires_shipping: product?.require_shipping ?? true,
      weight: shipping?.weight ?? null,
      weight_unit: shipping?.weight_unit ?? "kg",
    },
    identifiers: {
      sku: variants[0]?.sku ?? null,
      mpn: variants[0]?.mpn ?? null,
      gtin: variants[0]?.gtin ?? null,
    },
    purchase_count: purchaseCount,
    brand: brand
      ? {
          id: brand.id,
          name: brand.name ?? null,
          logo_url: brand.logo_url ?? null,
          banner_url: brand.banner_url ?? null,
          description: brand.description ?? null,
          metadata:
            brand?.metadata && typeof brand.metadata === "object"
              ? brand.metadata
              : null,
        }
      : null,
    ui: {
      is_hidden: hiddenMeta === true ? true : !visibleInWeb,
      channels: channels ?? [],
      allow_file_upload: allowFileMeta === true,
      allow_note: allowNoteMeta === true,
    },
    options: optionsWithValues,
    variants: variantsWithOptions,
    tags,
  };

  return attachCurrencyToProduct({
    product: applyMetadataFallback(full),
    currencies: storeCurrencies,
    selectedCurrencyCode: args.selectedCurrencyCode,
  });
}

const enrichProductFullCache = new Map<string, () => Promise<any>>();

function enrichProductFull(args: {
  store_id: string;
  product: any;
  selectedCurrencyCode?: string | null;
}) {
  const storeId = s(args.store_id);
  const productId = s(args.product?.id);
  const selectedCurrencyCode = normalizeCurrencyCode(
    args.selectedCurrencyCode,
    "auto",
  );

  if (!productId) return Promise.resolve(args.product);

  const updatedKey =
    s(args.product?.updated_at) || s(args.product?.created_at) || "v1";

  const key = `${storeId}:${productId}:${updatedKey}:${selectedCurrencyCode}`;

  let fn = enrichProductFullCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey(
            "product",
            "full",
            storeId,
            productId,
            updatedKey,
            selectedCurrencyCode,
          ),
          { ttlSeconds: 180 },
          () =>
            enrichProductFullRaw({
              store_id: storeId,
              product: args.product,
              selectedCurrencyCode: args.selectedCurrencyCode,
            }),
        ),
      ["product-full", storeId, productId, updatedKey, selectedCurrencyCode],
      { revalidate: 120 },
    );

    enrichProductFullCache.set(key, fn);
  }

  return fn();
}


/* ------------------------- special offers loader ------------------------ */

type ProductSpecialOfferRow = {
  id: string;
  title: string | null;
  description: string | null;
  status: string | null;
  offer_type: string | null;
  starts_at: string | null;
  ends_at: string | null;
  channels: any;
  targets: any;
  conditions: any;
  rewards: any;
  apply_with_coupon: boolean | null;
  message: string | null;
  priority: number | null;
};

function safeObject(value: any) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function readIdArray(value: any): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(new Set(value.map((item) => s(item)).filter(Boolean)));
}

function intersects(a: string[], b: string[]) {
  if (!a.length || !b.length) return false;
  const set = new Set(a);
  return b.some((item) => set.has(item));
}

function isOfferCurrentlyActive(offer: ProductSpecialOfferRow) {
  if (s(offer.status).toLowerCase() !== "active") return false;

  const now = Date.now();
  const startsAt = offer.starts_at ? new Date(offer.starts_at).getTime() : null;
  const endsAt = offer.ends_at ? new Date(offer.ends_at).getTime() : null;

  if (startsAt !== null && Number.isFinite(startsAt) && startsAt > now) {
    return false;
  }

  if (endsAt !== null && Number.isFinite(endsAt) && endsAt < now) {
    return false;
  }

  return true;
}

function offerChannelAllowsStorefront(channelsValue: any) {
  if (!Array.isArray(channelsValue) || channelsValue.length === 0) return true;

  const channels = channelsValue.map((item) => s(item).toLowerCase()).filter(Boolean);
  if (!channels.length) return true;

  return channels.some((channel) =>
    ["all", "both", "web", "website", "store", "storefront"].includes(channel),
  );
}

function productOfferContext(product: any) {
  const categoryIds = Array.isArray(product?.seo?.categories)
    ? product.seo.categories.map((item: any) => s(item?.id)).filter(Boolean)
    : Array.isArray(product?.categories)
      ? product.categories.map((item: any) => s(item?.id ?? item)).filter(Boolean)
      : [];

  const tagIds = Array.isArray(product?.tags)
    ? product.tags.map((item: any) => s(item?.id ?? item)).filter(Boolean)
    : [];

  return {
    productId: s(product?.id),
    brandId: s(product?.brand?.id ?? product?.brand_id),
    categoryIds,
    tagIds,
  };
}

function scopeMatchesProduct(args: {
  product: ReturnType<typeof productOfferContext>;
  source: any;
  modeKey?: string;
  productIdsKey?: string;
  categoryIdsKey?: string;
  brandIdsKey?: string;
  tagIdsKey?: string;
}) {
  const source = safeObject(args.source);
  const product = args.product;
  const mode = s(args.modeKey ? source[args.modeKey] : "").toLowerCase();

  const productIds = readIdArray(source[args.productIdsKey || "productIds"]);
  const categoryIds = readIdArray(source[args.categoryIdsKey || "categoryIds"]);
  const brandIds = readIdArray(source[args.brandIdsKey || "brandIds"]);
  const tagIds = readIdArray(source[args.tagIdsKey || "tagIds"]);

  const hasExplicitScope =
    productIds.length > 0 || categoryIds.length > 0 || brandIds.length > 0 || tagIds.length > 0;

  if (!hasExplicitScope) {
    return !mode || mode === "all" || mode === "targets" || mode === "same";
  }

  if (productIds.length && product.productId && productIds.includes(product.productId)) {
    return true;
  }

  if (categoryIds.length && intersects(categoryIds, product.categoryIds)) {
    return true;
  }

  if (brandIds.length && product.brandId && brandIds.includes(product.brandId)) {
    return true;
  }

  if (tagIds.length && intersects(tagIds, product.tagIds)) {
    return true;
  }

  return false;
}

function targetsMatchProduct(targetsValue: any, product: ReturnType<typeof productOfferContext>) {
  const targets = safeObject(targetsValue);

  const productIds = readIdArray(targets.productIds);
  const categoryIds = readIdArray(targets.categoryIds);
  const brandIds = readIdArray(targets.brandIds);
  const tagIds = readIdArray(targets.tagIds);

  const productMode = s(targets.productsMode).toLowerCase();
  const categoryMode = s(targets.categoriesMode).toLowerCase();
  const brandMode = s(targets.brandsMode).toLowerCase();
  const tagMode = s(targets.tagsMode).toLowerCase();

  const hasSelectedScope =
    productMode === "selected" ||
    categoryMode === "selected" ||
    brandMode === "selected" ||
    tagMode === "selected" ||
    productIds.length > 0 ||
    categoryIds.length > 0 ||
    brandIds.length > 0 ||
    tagIds.length > 0;

  if (!hasSelectedScope) return true;

  if (productIds.length && product.productId && productIds.includes(product.productId)) {
    return true;
  }

  if (categoryIds.length && intersects(categoryIds, product.categoryIds)) {
    return true;
  }

  if (brandIds.length && product.brandId && brandIds.includes(product.brandId)) {
    return true;
  }

  if (tagIds.length && intersects(tagIds, product.tagIds)) {
    return true;
  }

  return false;
}

function specialOfferMatchesProduct(offer: ProductSpecialOfferRow, product: any) {
  if (!isOfferCurrentlyActive(offer)) return false;
  if (!offerChannelAllowsStorefront(offer.channels)) return false;

  const ctx = productOfferContext(product);
  if (!ctx.productId) return false;

  const targets = safeObject(offer.targets);
  const conditions = safeObject(offer.conditions);
  const rewards = safeObject(offer.rewards);

  if (targetsMatchProduct(targets, ctx)) return true;

  if (s(offer.offer_type) === "buy_x_get_y") {
    const buyScope = s(conditions.buyScope).toLowerCase();
    const getScope = s(rewards.getScope).toLowerCase();

    if (buyScope === "targets" && targetsMatchProduct(targets, ctx)) return true;

    if (
      scopeMatchesProduct({
        product: ctx,
        source: conditions,
        modeKey: "buyScope",
        productIdsKey: "buyProductIds",
        categoryIdsKey: "buyCategoryIds",
        brandIdsKey: "buyBrandIds",
        tagIdsKey: "buyTagIds",
      })
    ) {
      return true;
    }

    if (getScope === "same" && targetsMatchProduct(targets, ctx)) return true;

    if (
      scopeMatchesProduct({
        product: ctx,
        source: rewards,
        modeKey: "getScope",
        productIdsKey: "getProductIds",
        categoryIdsKey: "getCategoryIds",
        brandIdsKey: "getBrandIds",
        tagIdsKey: "getTagIds",
      })
    ) {
      return true;
    }
  }

  return false;
}

function formatSpecialOfferSummary(offer: ProductSpecialOfferRow) {
  const message = firstText(offer.message);
  if (message) return message;

  const conditions = safeObject(offer.conditions);
  const rewards = safeObject(offer.rewards);
  const type = s(offer.offer_type);

  if (type === "buy_x_get_y") {
    const buyQuantity = Math.max(1, Math.floor(Number(conditions.buyQuantity ?? 1) || 1));
    const getQuantity = Math.max(1, Math.floor(Number(rewards.getQuantity ?? 1) || 1));
    const rewardType = s(rewards.rewardType).toLowerCase();
    const discountType = s(rewards.discountType).toLowerCase();
    const discountValue = Number(rewards.discountValue ?? 0);

    if (rewardType === "free" || discountValue >= 100) {
      return `اشترِ ${buyQuantity} واحصل على ${getQuantity} مجانًا`;
    }

    if (discountType === "percentage" && discountValue > 0) {
      return `اشترِ ${buyQuantity} واحصل على ${getQuantity} بخصم ${discountValue}%`;
    }

    if (discountValue > 0) {
      return `اشترِ ${buyQuantity} واحصل على ${getQuantity} بخصم ${discountValue}`;
    }

    return `اشترِ ${buyQuantity} واحصل على ${getQuantity}`;
  }

  if (type === "percentage") {
    const discountValue = Number(rewards.discountValue ?? 0);
    return discountValue > 0 ? `خصم ${discountValue}% على هذا المنتج` : "خصم خاص على هذا المنتج";
  }

  if (type === "fixed_amount") {
    const discountValue = Number(rewards.discountValue ?? 0);
    return discountValue > 0 ? `خصم ${discountValue} على هذا المنتج` : "خصم بقيمة ثابتة";
  }

  if (type === "fixed_price") {
    const fixedPrice = Number(rewards.fixedPrice ?? 0);
    return fixedPrice > 0 ? `سعر خاص ${fixedPrice}` : "سعر خاص لهذا المنتج";
  }

  if (type === "discount_table") return "خصومات متدرجة حسب الكمية";
  if (type === "category_offer") return "عرض خاص على التصنيف";

  return firstText(offer.title, "عرض خاص");
}

async function loadProductSpecialOffers(args: { store_id: string; product: any }) {
  const storeId = s(args.store_id);
  const product = args.product;

  if (!storeId || !s(product?.id)) return [];

  try {
    const sb = await getStoreDb(storeId);

    const { data, error } = await sb
      .from("store_special_offers")
      .select(
        "id,title,description,status,offer_type,starts_at,ends_at,channels,targets,conditions,rewards,apply_with_coupon,message,priority,created_at",
      )
      .eq("store_id", storeId)
      .eq("status", "active")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(20);

    if (error || !Array.isArray(data)) return [];

    return (data as ProductSpecialOfferRow[])
      .filter((offer) => specialOfferMatchesProduct(offer, product))
      .slice(0, 4)
      .map((offer) => ({
        id: s(offer.id),
        title: firstText(offer.title, "عرض خاص"),
        description: firstText(offer.description) || null,
        offerType: s(offer.offer_type),
        offer_type: s(offer.offer_type),
        message: firstText(offer.message) || null,
        summary: formatSpecialOfferSummary(offer),
        startsAt: firstText(offer.starts_at) || null,
        starts_at: firstText(offer.starts_at) || null,
        endsAt: firstText(offer.ends_at) || null,
        ends_at: firstText(offer.ends_at) || null,
        priority: Number.isFinite(Number(offer.priority)) ? Number(offer.priority) : 100,
        applyWithCoupon: Boolean(offer.apply_with_coupon),
        apply_with_coupon: Boolean(offer.apply_with_coupon),
      }));
  } catch {
    return [];
  }
}

/* ------------------------- loaders ------------------------ */

async function loadProductPageByPublicNoRaw(args: {
  store_id: string;
  publicNo: number;
  selectedCurrencyCode?: string | null;
}) {
  const product = await getProductByPublicNo({
    store_id: args.store_id,
    public_no: args.publicNo,
  });

  if (!product) return null;

  const [fullProduct, options, sizeGuides] = await Promise.all([
    enrichProductFull({
      store_id: args.store_id,
      product,
      selectedCurrencyCode: args.selectedCurrencyCode,
    }),

    loadStoreOptions(args.store_id),

    loadStoreSizeGuides(args.store_id),
  ]);

  const specialOffers = await loadProductSpecialOffers({
    store_id: args.store_id,
    product: fullProduct,
  });

  const productWithSpecialOffers = {
    ...fullProduct,
    specialOffers,
    special_offers: specialOffers,
  };

  const recommendations = await loadRecommendedProducts({
    store_id: args.store_id,
    product: productWithSpecialOffers,
    rawOptions: options,
    limit: 8,
  });

  const recommendationsWithCurrency = await attachStoreCurrencyToProducts({
    store_id: args.store_id,
    products: recommendations,
    selectedCurrencyCode: args.selectedCurrencyCode,
  });

  return {
    product: productWithSpecialOffers,
    options,
    recommendations: recommendationsWithCurrency,
    sizeGuides,
    size_guides: sizeGuides,
  };
}

const productPageByPublicNoCache = new Map<string, () => Promise<any>>();

export async function loadProductPageByPublicNo(args: {
  store_id: string;
  publicNo: number;
}) {
  const storeId = s(args.store_id);
  const publicNo = Number(args.publicNo);
  const selectedCurrencyCode = await readSelectedCurrencyCodeFromCookies();
  const selectedKey = normalizeCurrencyCode(selectedCurrencyCode, "auto");

  if (!storeId || !Number.isFinite(publicNo) || publicNo <= 0) {
    return null;
  }

  const key = `${storeId}:public:${publicNo}:${selectedKey}`;

  let fn = productPageByPublicNoCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey(
            "product",
            "page-public-no",
            storeId,
            String(publicNo),
            selectedKey,
          ),
          { ttlSeconds: 120 },
          () =>
            loadProductPageByPublicNoRaw({
              store_id: storeId,
              publicNo,
              selectedCurrencyCode,
            }),
        ),
      ["product-page-public-no", storeId, String(publicNo), selectedKey],
      { revalidate: 60 },
    );

    productPageByPublicNoCache.set(key, fn);
  }

  return fn();
}

async function loadProductPageByShortCodeRaw(args: {
  store_id: string;
  code: string;
  selectedCurrencyCode?: string | null;
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

  const product =
    (await getProductByShortUrl({
      store_id: args.store_id,
      short_url: code,
    })) ||
    (decodedPublicNo
      ? await getProductByPublicNo({
          store_id: args.store_id,
          public_no: decodedPublicNo,
        })
      : null);

  if (!product) return null;

  const [fullProduct, options, sizeGuides] = await Promise.all([
    enrichProductFull({
      store_id: args.store_id,
      product,
      selectedCurrencyCode: args.selectedCurrencyCode,
    }),

    loadStoreOptions(args.store_id),

    loadStoreSizeGuides(args.store_id),
  ]);

  const specialOffers = await loadProductSpecialOffers({
    store_id: args.store_id,
    product: fullProduct,
  });

  const productWithSpecialOffers = {
    ...fullProduct,
    specialOffers,
    special_offers: specialOffers,
  };

  const recommendations = await loadRecommendedProducts({
    store_id: args.store_id,
    product: productWithSpecialOffers,
    rawOptions: options,
    limit: 8,
  });

  const recommendationsWithCurrency = await attachStoreCurrencyToProducts({
    store_id: args.store_id,
    products: recommendations,
    selectedCurrencyCode: args.selectedCurrencyCode,
  });

  return {
    product: productWithSpecialOffers,
    options,
    recommendations: recommendationsWithCurrency,
    sizeGuides,
    size_guides: sizeGuides,
  };
}

const productPageByShortCodeCache = new Map<string, () => Promise<any>>();

export async function loadProductPageByShortCode(args: {
  store_id: string;
  code: string;
}) {
  const storeId = s(args.store_id);
  const code = s(args.code);
  const normalizedCode = normalizeCacheKey(code);
  const selectedCurrencyCode = await readSelectedCurrencyCodeFromCookies();
  const selectedKey = normalizeCurrencyCode(selectedCurrencyCode, "auto");

  if (!storeId || !code) return null;

  const key = `${storeId}:short:${normalizedCode}:${selectedKey}`;

  let fn = productPageByShortCodeCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        redisCached(
          cacheKey("product", "page-short-code", storeId, normalizedCode, selectedKey),
          { ttlSeconds: 120 },
          () =>
            loadProductPageByShortCodeRaw({
              store_id: storeId,
              code,
              selectedCurrencyCode,
            }),
        ),
      ["product-page-short-code", storeId, normalizedCode, selectedKey],
      { revalidate: 60 },
    );

    productPageByShortCodeCache.set(key, fn);
  }

  return fn();
}
