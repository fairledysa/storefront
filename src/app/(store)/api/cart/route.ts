// FILE: apps/storefront/src/app/(store)/api/cart/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/data/store/supabase.server";
import { isProductVisibleInWeb } from "@/data/catalog/products";
import { getSeoUrlMode } from "@/data/store/settings";
import { productUrl } from "@/lib/seo/urls";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { getMalakBootstrap } from "@/themes/malak/bootstrap/get-malak-bootstrap";
import { loadFreeShippingEvaluator } from "../checkout/lib/free-shipping";
import {
  buildLineKey,
  cartSessionCookie,
  getCartSessionId,
  getOrCreateOpenCart,
  getStoreCurrencyInfo,
  getStoreIdOrThrow,
} from "../_cart/cart.server";

export const dynamic = "force-dynamic";

type CurrencyRuntimeRow = {
  code: string;
  symbol: string;
  decimal_digits: number;
  rate: number;
  is_default: boolean;
  enabled: boolean;
  metadata?: any;
  name_ar?: string | null;
  name_en?: string | null;
};

const CART_TAX_CONTEXT_CACHE_TTL_MS = 30_000;

const cartTaxContextCache = new Map<
  string,
  {
    expiresAt: number;
    value: any;
  }
>();

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function s(x: any) {
  return String(x ?? "").trim();
}

function toNumber(x: any): number {
  const n = Number(x ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function round2(x: number) {
  return Math.round(Number(x || 0) * 100) / 100;
}

function cleanCurrencyCode(value: any, fallback = "") {
  const code = String(value ?? "").trim().toUpperCase();
  return code || fallback;
}

function clampDecimals(value: any, fallback = 2) {
  const n = Number(value ?? fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(4, Math.floor(n)));
}

function positiveRate(value: any, fallback = 1) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function firstDefined(...values: any[]) {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }

  return undefined;
}

function readBoolMaybe(value: any): boolean | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const text = value.trim().toLowerCase();

    if (
      text === "true" ||
      text === "1" ||
      text === "yes" ||
      text === "on" ||
      text === "enabled"
    ) {
      return true;
    }

    if (
      text === "false" ||
      text === "0" ||
      text === "no" ||
      text === "off" ||
      text === "disabled"
    ) {
      return false;
    }
  }

  return null;
}

function readBool(value: any, fallback = false) {
  return readBoolMaybe(value) ?? fallback;
}

function readProductUnlimitedFromMetadata(metadata: any) {
  const meta =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? metadata
      : {};

  const stock =
    meta.stock && typeof meta.stock === "object" && !Array.isArray(meta.stock)
      ? meta.stock
      : {};

  return readBool(
    firstDefined(
      stock.unlimited_quantity,
      stock.unlimitedQuantity,

      meta.unlimited_quantity,
      meta.unlimitedQuantity,

      meta.qtyUnlimited,
      meta.quantityUnlimited,
    ),
    false,
  );
}

function clampTaxRate(value: any) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;

  return Math.max(0, Math.min(100, n));
}

async function getCartTaxContext(args: { store_id: string; seoMode: any }) {
  const cacheKey = String(args.store_id || "");
  const now = Date.now();

  if (cacheKey) {
    const cached = cartTaxContextCache.get(cacheKey);

    if (cached && cached.expiresAt > now) {
      return cached.value;
    }
  }

  try {
    const ctx = await resolveStoreContext();
    const store = ctx?.store;

    if (!store?.id) return null;

    const bootstrap = await getMalakBootstrap({
      store: {
        id: store.id,
        slug: store.slug,
        name: store.name,
        logo_url: store.logo_url ?? null,
        favicon_url: store.favicon_url ?? null,
      },
      seoMode: args.seoMode,
      themeOptions: ctx?.theme?.options ?? null,
      version_id: ctx?.theme?.version_id ?? "published",
    });

    const value = (bootstrap as any)?.tax ?? null;

    if (cacheKey) {
      cartTaxContextCache.set(cacheKey, {
        value,
        expiresAt: Date.now() + CART_TAX_CONTEXT_CACHE_TTL_MS,
      });
    }

    return value;
  } catch {
    return null;
  }
}

function normalizeCartLineTax(args: { tax: any; pricingRow: any }) {
  const tax = args.tax ?? null;
  const pricingRow = args.pricingRow ?? null;

  const rate = clampTaxRate(
    firstDefined(
      tax?.effective_rate,
      tax?.effectiveRate,
      tax?.tax_rate,
      tax?.taxRate,
      tax?.vat_rate,
      tax?.vatRate,
      tax?.rate,
      tax?.default_rate,
      tax?.defaultRate,
      tax?.percentage,
      tax?.percent,
    ),
  );

  const enabledExplicit = readBoolMaybe(
    firstDefined(
      tax?.enabled,
      tax?.is_enabled,
      tax?.isEnabled,
      tax?.active,
      tax?.is_active,
      tax?.isActive,
      tax?.vat_enabled,
      tax?.vatEnabled,
    ),
  );

  const enabled = enabledExplicit ?? rate > 0;

  const taxContextPricesIncludeTaxMaybe = readBoolMaybe(
    firstDefined(tax?.prices_include_tax, tax?.pricesIncludeTax),
  );

  const pricesIncludeTax = readBool(
    firstDefined(tax?.prices_include_tax, tax?.pricesIncludeTax),
    false,
  );

  const productPriceIncludesTaxMaybe = readBoolMaybe(
    firstDefined(
      pricingRow?.with_tax,
      pricingRow?.withTax,
      pricingRow?.prices_include_tax,
      pricingRow?.pricesIncludeTax,
    ),
  );

  const inputPricesIncludeTax =
    taxContextPricesIncludeTaxMaybe ??
    productPriceIncludesTaxMaybe ??
    pricesIncludeTax;

  const shouldAddTaxToPrice = Boolean(
    enabled && rate > 0 && !inputPricesIncludeTax,
  );

  return {
    enabled,
    rate,
    pricesIncludeTax,
    inputPricesIncludeTax,
    shouldAddTaxToPrice,
    multiplier: shouldAddTaxToPrice ? 1 + rate / 100 : 1,
  };
}

function applyCartTaxToPrice(
  amount: number | null,
  tax: ReturnType<typeof normalizeCartLineTax>,
) {
  if (amount === null) return null;
  if (!Number.isFinite(amount)) return null;
  if (!tax.shouldAddTaxToPrice) return amount;

  return amount * tax.multiplier;
}

function applyCartTaxToConvertedPrices(
  prices: { price: number | null; sale_price: number | null },
  tax: ReturnType<typeof normalizeCartLineTax>,
) {
  return {
    price: applyCartTaxToPrice(prices.price, tax),
    sale_price: applyCartTaxToPrice(prices.sale_price, tax),
  };
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

async function fetchStoreDefaultCurrencyCode(
  sb: any,
  storeId: string,
  fallback = "SAR",
) {
  const fallbackCode = cleanCurrencyCode(fallback, "SAR");

  try {
    const res = await sb
      .from("stores")
      .select("default_currency")
      .eq("id", storeId)
      .limit(1)
      .maybeSingle();

    if (res.error) return fallbackCode;

    return cleanCurrencyCode(res.data?.default_currency, fallbackCode);
  } catch {
    return fallbackCode;
  }
}

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

async function fetchStoreCurrenciesForRuntime(sb: any, storeId: string) {
  const selects = [
    "currency_code,symbol,decimal_digits,is_default,is_enabled,name_ar,name_en,metadata",
    "currency_code,symbol,decimal_digits,is_default,is_enabled,metadata",
    "currency_code,symbol,decimal_digits,metadata",
  ];

  let lastError: any = null;

  for (const select of selects) {
    const res = await sb
      .from("store_currencies")
      .select(select)
      .eq("store_id", storeId)
      .eq("is_enabled", true);

    if (!res.error) {
      return Array.isArray(res.data) ? res.data : [];
    }

    lastError = res.error;
  }

  if (lastError) throw new Error(lastError.message);

  return [];
}

function buildCurrencyRuntime(rows: any[], fallbackCode: string) {
  const fallback = cleanCurrencyCode(fallbackCode, "SAR");

  const list: CurrencyRuntimeRow[] = (Array.isArray(rows) ? rows : [])
    .map((row: any) => {
      const code = cleanCurrencyCode(row?.currency_code || row?.code);
      if (!code) return null;

      const metadataRate = readCurrencyRateFromMetadata(row?.metadata);

      return {
        code,
        symbol: s(row?.symbol) || code,
        decimal_digits: clampDecimals(row?.decimal_digits),
        rate: positiveRate(
          row?.rate ??
            row?.exchange_rate ??
            row?.conversion_rate ??
            row?.rate_to_default ??
            row?.value ??
            row?.metadata?.rate ??
            row?.metadata?.exchange_rate ??
            row?.metadata?.conversion_rate ??
            row?.metadata?.rate_to_default ??
            row?.metadata?.rateToDefault ??
            row?.metadata?.value ??
            row?.metadata?.amount,
          metadataRate,
        ),
        is_default: Boolean(row?.is_default),
        enabled: row?.is_enabled !== false && row?.enabled !== false,
        metadata: row?.metadata ?? null,
        name_ar: row?.name_ar ?? null,
        name_en: row?.name_en ?? null,
      };
    })
    .filter(Boolean) as CurrencyRuntimeRow[];

  const defaultCode =
    list.find((row) => row.is_default && row.rate === 1)?.code ||
    list.find((row) => row.is_default)?.code ||
    list.find((row) => row.code === fallback)?.code ||
    fallback;

  if (!list.some((row) => row.code === defaultCode)) {
    list.unshift({
      code: defaultCode,
      symbol: defaultCode,
      decimal_digits: 2,
      rate: 1,
      is_default: true,
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
      is_default: row.code === defaultCode,
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
  fallbackCode: string;
  runtime: ReturnType<typeof buildCurrencyRuntime>;
}) {
  const selectedCode = cleanCurrencyCode(args.selectedCode, "");
  const fallbackCode = cleanCurrencyCode(
    args.fallbackCode,
    args.runtime.defaultCode,
  );

  if (selectedCode) {
    const selected = args.runtime.map.get(selectedCode);
    if (selected?.enabled) return selected.code;
  }

  const fallback = args.runtime.map.get(fallbackCode);
  if (fallback?.enabled) return fallback.code;

  return args.runtime.defaultCode;
}

function currencyInfoFromRuntime(args: {
  code: string;
  runtime: ReturnType<typeof buildCurrencyRuntime>;
  fallbackInfo: any;
}) {
  const code = cleanCurrencyCode(args.code, args.runtime.defaultCode);
  const row = args.runtime.map.get(code);

  if (row) {
    return {
      code: row.code,
      symbol: row.symbol || row.code,
      decimal_digits: clampDecimals(row.decimal_digits),
      name_ar: row.name_ar ?? null,
      name_en: row.name_en ?? null,
    };
  }

  const fallbackCode = cleanCurrencyCode(args.fallbackInfo?.code, code || "SAR");

  return {
    code: fallbackCode,
    symbol: s(args.fallbackInfo?.symbol) || fallbackCode,
    decimal_digits: clampDecimals(args.fallbackInfo?.decimal_digits),
    name_ar: args.fallbackInfo?.name_ar ?? null,
    name_en: args.fallbackInfo?.name_en ?? null,
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

function readPricingCurrency(row: any, fallback: string) {
  return cleanCurrencyCode(
    row?.currency_code ??
      row?.currencyCode ??
      row?.currency ??
      row?.currency_id,
    fallback,
  );
}

function convertNullablePrice(args: {
  amount: any;
  sourceCode: any;
  targetCurrency: string;
  currencyRuntime: ReturnType<typeof buildCurrencyRuntime>;
}) {
  const num = Number(args.amount ?? 0);
  if (!Number.isFinite(num) || num <= 0) return null;

  return convertMoney({
    amount: num,
    sourceCode: args.sourceCode,
    targetCode: args.targetCurrency,
    runtime: args.currencyRuntime,
  });
}

function positivePublicNo(value: any) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function readProductPublicNo(product: any) {
  return positivePublicNo(
    product?.public_no ??
      product?.publicNo ??
      product?.metadata?.public_no ??
      product?.metadata?.publicNo ??
      product?.metadata?.seo?.public_no ??
      product?.metadata?.seo?.publicNo,
  );
}

function readProductShortUrl(product: any) {
  return s(
    product?.short_url ??
      product?.shortUrl ??
      product?.metadata?.short_url ??
      product?.metadata?.shortUrl ??
      product?.metadata?.seo?.short_url ??
      product?.metadata?.seo?.shortUrl,
  )
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

async function getSafeSeoMode(storeId: string) {
  try {
    return await getSeoUrlMode(storeId);
  } catch {
    return "named_ar";
  }
}

function buildSafeProductHref(args: {
  mode: any;
  product: any;
  productId: string;
}) {
  const productName = s(args.product?.name) || "المنتج";
  const publicNo = readProductPublicNo(args.product);
  const shortUrl = readProductShortUrl(args.product);

  try {
    return productUrl({
      mode: args.mode,
      name: productName,
      short_url: shortUrl || null,
      public_no: publicNo || null,
      id_fallback: args.productId,
    });
  } catch {
    return args.productId ? `/p/${encodeURIComponent(args.productId)}` : "/";
  }
}

function pickPrimaryImage(rows: any[]): string | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const sorted = [...rows].sort((a, b) => {
    const ad = a?.is_default ? 1 : 0;
    const bd = b?.is_default ? 1 : 0;
    if (bd !== ad) return bd - ad;

    const aso = Number(a?.sort_order ?? 0);
    const bso = Number(b?.sort_order ?? 0);
    if (aso !== bso) return aso - bso;

    return 0;
  });

  const first = sorted[0];
  return (first?.thumbnail_url || first?.original_url || null) as string | null;
}

function coerceOptionsFromMetadata(metadata: any): any[] {
  const raw = Array.isArray(metadata?.options) ? metadata.options : [];
  if (!raw.length) return [];

  return raw
    .map((o: any, idx: number) => {
      const values = Array.isArray(o?.values) ? o.values : [];
      const optId = String(o?.id ?? `meta-opt-${idx}`);

      return {
        id: optId,
        product_id: String(metadata?.product_id ?? ""),
        name: String(o?.name ?? ""),
        is_required: true,
        option_field_type: "radio",
        display_type: String(o?.featureType ?? o?.display_type ?? "text"),
        sort_order: idx,
        values: values
          .map((v: any, vIdx: number) => ({
            id: String(v?.id ?? `meta-val-${idx}-${vIdx}`),
            option_id: optId,
            name: String(v?.name ?? ""),
            display_value: v?.display_value ?? v?.displayValue ?? null,
            extra_price:
              typeof v?.extra_price === "number"
                ? v.extra_price
                : typeof v?.extraPrice === "number"
                  ? v.extraPrice
                  : null,
            image_url: v?.image_url ?? v?.imageUrl ?? null,
            sort_order:
              typeof v?.sort_order === "number"
                ? v.sort_order
                : typeof v?.sortOrder === "number"
                  ? v.sortOrder
                  : vIdx,
            is_default: Boolean(v?.isDefault ?? v?.is_default ?? false),
          }))
          .filter((x: any) => x.id && x.name),
      };
    })
    .filter(
      (x: any) => x.id && x.name && Array.isArray(x.values) && x.values.length,
    );
}

function coerceVariantsFromMetadata(metadata: any): any[] {
  const raw = Array.isArray(metadata?.variants) ? metadata.variants : [];
  if (!raw.length) return [];

  const productUnlimited = readProductUnlimitedFromMetadata(metadata);

  return raw
    .map((v: any) => ({
      id: String(v?.id),
      product_id: String(metadata?.product_id ?? ""),
      stock_quantity:
        typeof v?.qty === "number"
          ? v.qty
          : Number(
              firstDefined(
                v?.stock_quantity,
                v?.stockQuantity,
                v?.quantity,
                v?.qty,
                0,
              ),
            ),
      unlimited_quantity: Boolean(
        productUnlimited ||
          v?.unlimited_quantity ||
          v?.unlimitedQuantity ||
          v?.unlimitedQty ||
          v?.qtyUnlimited ||
          v?.quantityUnlimited,
      ),
      price: firstDefined(v?.price, null),
      sale_price: firstDefined(v?.discount, v?.sale_price, v?.salePrice, null),
      is_default: Boolean(v?.is_default ?? v?.isDefault ?? false),
    }))
    .filter((x: any) => x.id);
}

function coerceVariantLinksFromMetadata(metadata: any): any[] {
  const raw = Array.isArray(metadata?.variants) ? metadata.variants : [];
  if (!raw.length) return [];

  const links: { variant_id: string; option_value_id: string }[] = [];

  for (const v of raw) {
    const variant_id = String(v?.id ?? "");
    const selections = Array.isArray(v?.selections) ? v.selections : [];

    for (const row of selections) {
      const valueId =
        row?.valueId ?? row?.option_value_id ?? row?.optionValueId;

      if (variant_id && valueId) {
        links.push({
          variant_id,
          option_value_id: String(valueId),
        });
      }
    }
  }

  return links;
}

function mapMetaVariantIds(metadata: any) {
  const map = new Map<string, any>();
  const rows = Array.isArray(metadata?.variants) ? metadata.variants : [];

  for (const row of rows) {
    const id = s(row?.id);
    if (!id) continue;
    map.set(id, row);
  }

  return map;
}

function buildDbVariantSelectionMap(links: any[]) {
  const map = new Map<string, Set<string>>();

  for (const row of links || []) {
    const vid = s(row?.variant_id);
    const oid = s(row?.option_value_id);
    if (!vid || !oid) continue;

    if (!map.has(vid)) map.set(vid, new Set<string>());
    map.get(vid)!.add(oid);
  }

  return map;
}

function buildMetaVariantSelectionMap(metadata: any) {
  const map = new Map<string, Set<string>>();
  const rows = Array.isArray(metadata?.variants) ? metadata.variants : [];

  for (const row of rows) {
    const vid = s(row?.id);
    if (!vid) continue;

    const set = new Set<string>();
    const selections = Array.isArray(row?.selections) ? row.selections : [];

    for (const sel of selections) {
      const oid = s(sel?.valueId ?? sel?.option_value_id ?? sel?.optionValueId);
      if (oid) set.add(oid);
    }

    map.set(vid, set);
  }

  return map;
}

function exactSetMatch(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false;

  for (const x of a) {
    if (!b.has(x)) return false;
  }

  return true;
}

function resolveVariantIdFromCurrentSelection(args: {
  metadata: any;
  dbVariants: any[];
  dbLinks: any[];
  selected_option_value_ids: string[];
}) {
  const selected = new Set(
    (Array.isArray(args.selected_option_value_ids)
      ? args.selected_option_value_ids
      : []
    )
      .map(String)
      .filter(Boolean),
  );

  if (selected.size === 0) return null;

  const metaMap = buildMetaVariantSelectionMap(args.metadata);

  for (const [vid, set] of metaMap.entries()) {
    if (exactSetMatch(selected, set)) return vid;
  }

  const dbSetMap = buildDbVariantSelectionMap(args.dbLinks);

  for (const v of args.dbVariants || []) {
    const vid = s(v?.id);
    if (!vid) continue;

    const set = dbSetMap.get(vid) ?? new Set<string>();
    if (exactSetMatch(selected, set)) return vid;
  }

  return null;
}

function resolveDefaultVariantId(args: { metadata: any; dbVariants: any[] }) {
  const metaVariants = Array.isArray(args.metadata?.variants)
    ? args.metadata.variants
    : [];

  const metaDefault =
    metaVariants.find((x: any) => Boolean(x?.is_default ?? x?.isDefault)) ??
    metaVariants[0];

  if (metaDefault?.id) return String(metaDefault.id);

  const dbDefault =
    (args.dbVariants || []).find((x: any) => Boolean(x?.is_default)) ??
    (args.dbVariants || [])[0];

  return dbDefault?.id ? String(dbDefault.id) : null;
}

function hasAnyVariants(args: { metadata: any; dbVariants: any[] }) {
  const metaVariants = Array.isArray(args.metadata?.variants)
    ? args.metadata.variants
    : [];

  return metaVariants.length > 0 || (args.dbVariants || []).length > 0;
}

function getMaxPerOrder(stockRow: any) {
  const v = stockRow?.maximum_quantity_per_order;
  if (v == null) return null;

  const num = Math.floor(toNumber(v));
  return num > 0 ? num : null;
}

function getProductStockInfo(args: { metadata: any; stockRow: any }) {
  const unlimited =
    Boolean(args.metadata?.qtyUnlimited ?? false) ||
    Boolean(args.stockRow?.unlimited_quantity ?? false);

  return {
    unlimited,
    available_qty: unlimited
      ? 999999
      : Math.max(0, Math.floor(toNumber(args.stockRow?.quantity))),
    max_per_order: getMaxPerOrder(args.stockRow),
  };
}

function getVariantStockInfo(args: {
  metadata: any;
  variant_id: string;
  dbVariantById: Map<string, any>;
}) {
  const vid = s(args.variant_id);
  const productUnlimited = readProductUnlimitedFromMetadata(args.metadata);

  const dbv = args.dbVariantById.get(vid);
  if (dbv) {
    const unlimited =
      productUnlimited || Boolean(dbv?.unlimited_quantity ?? false);

    return {
      exists: true,
      unlimited,
      available_qty: unlimited
        ? 999999
        : Math.max(0, Math.floor(toNumber(dbv?.stock_quantity))),
    };
  }

  const metaMap = mapMetaVariantIds(args.metadata);
  const mv = metaMap.get(vid);

  if (mv) {
    const unlimited = Boolean(
      productUnlimited ||
        mv?.unlimited_quantity ||
        mv?.unlimitedQuantity ||
        mv?.unlimitedQty ||
        mv?.qtyUnlimited ||
        mv?.quantityUnlimited,
    );

    return {
      exists: true,
      unlimited,
      available_qty: unlimited
        ? 999999
        : Math.max(
            0,
            Math.floor(
              toNumber(
                firstDefined(
                  mv?.stock_quantity,
                  mv?.stockQuantity,
                  mv?.quantity,
                  mv?.qty,
                  mv?.available_qty,
                  mv?.availableQty,
                ),
              ),
            ),
          ),
    };
  }

  return { exists: false, unlimited: false, available_qty: 0 };
}

function computeHardMax(args: {
  desiredQty: number;
  unlimited: boolean;
  available_qty: number;
  max_per_order: number | null;
}) {
  const desired = Math.max(1, Math.floor(toNumber(args.desiredQty)));
  const maxByStock = args.unlimited ? 999999 : Math.max(0, args.available_qty);
  const maxByOrder =
    args.max_per_order == null ? 999999 : Math.max(1, args.max_per_order);

  const hardMax = Math.max(0, Math.min(maxByStock, maxByOrder));
  const finalQty = hardMax <= 0 ? 0 : Math.max(1, Math.min(desired, hardMax));

  return { hardMax, finalQty };
}

function buildStockLimitForCartItem(args: {
  qty: number;
  metadata: any;
  stockRow: any;
  variant_id: string | null;
  dbVariantById: Map<string, any>;
}) {
  const qty = Math.max(1, Math.floor(toNumber(args.qty)));
  const max_per_order = getMaxPerOrder(args.stockRow);

  let unlimited = false;
  let available_qty = 0;
  let variant_exists = true;

  if (args.variant_id) {
    const vStock = getVariantStockInfo({
      metadata: args.metadata,
      variant_id: args.variant_id,
      dbVariantById: args.dbVariantById,
    });

    variant_exists = Boolean(vStock.exists);
    unlimited = Boolean(vStock.unlimited);
    available_qty = Math.max(0, Math.floor(toNumber(vStock.available_qty)));
  } else {
    const pStock = getProductStockInfo({
      metadata: args.metadata,
      stockRow: args.stockRow,
    });

    unlimited = Boolean(pStock.unlimited);
    available_qty = Math.max(0, Math.floor(toNumber(pStock.available_qty)));
  }

  if (!variant_exists) {
    return {
      unlimited: false,
      available: 0,
      max_per_order,
      max_qty: 0,
      can_increment: false,
      limit_reason: "stock",
    };
  }

  const { hardMax } = computeHardMax({
    desiredQty: qty,
    unlimited,
    available_qty,
    max_per_order,
  });

  const available = unlimited ? null : available_qty;
  const max_qty = Math.max(0, Math.floor(toNumber(hardMax)));

  let limit_reason: "none" | "stock" | "max_per_order" = "none";

  if (max_qty <= 0) {
    limit_reason = "stock";
  } else if (max_per_order !== null && max_qty === max_per_order) {
    limit_reason = "max_per_order";
  } else if (available !== null && max_qty === available) {
    limit_reason = "stock";
  }

  return {
    unlimited,
    available,
    max_per_order,
    max_qty,
    can_increment: qty < max_qty,
    limit_reason,
  };
}

async function normalizeCartLines(args: {
  sb: any;
  cart_id: string;
  store_id: string;
  items: any[];
  productMap: Map<string, any>;
  stockByProduct: Map<string, any>;
  dbVariantsByProduct: Map<string, any[]>;
  dbVariantById: Map<string, any>;
  dbLinksByProduct: Map<string, any[]>;
}) {
  const { sb, cart_id, items, productMap, stockByProduct } = args;

  let changed = false;

  const rows = [...items].sort((a, b) => {
    const ad = new Date(a?.created_at ?? 0).getTime();
    const bd = new Date(b?.created_at ?? 0).getTime();
    return ad - bd;
  });

  const activeByLineKey = new Map<string, { id: string; qty: number }>();
  const removedIds = new Set<string>();

  for (const it of rows) {
    const itemId = s(it?.id);
    if (!itemId || removedIds.has(itemId)) continue;

    const product_id = s(it?.product_id);
    const product = productMap.get(product_id);

    if (!product?.id) {
      const del = await sb
        .from("cart_items")
        .delete()
        .eq("id", itemId)
        .eq("cart_id", cart_id);

      if (del.error) throw new Error(del.error.message);

      removedIds.add(itemId);
      changed = true;
      continue;
    }

    if (
      !isProductVisibleInWeb({
        status: product?.status,
        metadata: product?.metadata,
      })
    ) {
      const del = await sb
        .from("cart_items")
        .delete()
        .eq("id", itemId)
        .eq("cart_id", cart_id);

      if (del.error) throw new Error(del.error.message);

      removedIds.add(itemId);
      changed = true;
      continue;
    }

    const metadata = product?.metadata ?? null;
    const stockRow = stockByProduct.get(product_id) ?? null;
    const dbVariants = args.dbVariantsByProduct.get(product_id) ?? [];
    const dbLinks = args.dbLinksByProduct.get(product_id) ?? [];

    const selected_option_value_ids = Array.isArray(
      it?.selected_option_value_ids,
    )
      ? it.selected_option_value_ids.map(String).filter(Boolean)
      : [];

    const hasVariants = hasAnyVariants({ metadata, dbVariants });
    let variant_id = s(it?.variant_id) || null;

    if (hasVariants) {
      if (variant_id) {
        const vStock = getVariantStockInfo({
          metadata,
          variant_id,
          dbVariantById: args.dbVariantById,
        });

        if (!vStock.exists) {
          variant_id =
            resolveVariantIdFromCurrentSelection({
              metadata,
              dbVariants,
              dbLinks,
              selected_option_value_ids,
            }) ?? resolveDefaultVariantId({ metadata, dbVariants });
        }
      } else {
        variant_id =
          resolveVariantIdFromCurrentSelection({
            metadata,
            dbVariants,
            dbLinks,
            selected_option_value_ids,
          }) ?? resolveDefaultVariantId({ metadata, dbVariants });
      }

      if (!variant_id) {
        const del = await sb
          .from("cart_items")
          .delete()
          .eq("id", itemId)
          .eq("cart_id", cart_id);

        if (del.error) throw new Error(del.error.message);

        removedIds.add(itemId);
        changed = true;
        continue;
      }
    } else {
      variant_id = null;
    }

    const qtyNow = Math.max(1, Math.floor(toNumber(it?.qty)));

    let unlimited = false;
    let available_qty = 0;
    const max_per_order = getMaxPerOrder(stockRow);

    if (variant_id) {
      const vStock = getVariantStockInfo({
        metadata,
        variant_id,
        dbVariantById: args.dbVariantById,
      });

      if (!vStock.exists) {
        const del = await sb
          .from("cart_items")
          .delete()
          .eq("id", itemId)
          .eq("cart_id", cart_id);

        if (del.error) throw new Error(del.error.message);

        removedIds.add(itemId);
        changed = true;
        continue;
      }

      unlimited = vStock.unlimited;
      available_qty = vStock.available_qty;
    } else {
      const pStock = getProductStockInfo({ metadata, stockRow });
      unlimited = pStock.unlimited;
      available_qty = pStock.available_qty;
    }

    const line_key = buildLineKey({
      product_id,
      variant_id,
      selected_option_value_ids,
    });

    const { hardMax, finalQty } = computeHardMax({
      desiredQty: qtyNow,
      unlimited,
      available_qty,
      max_per_order,
    });

    if (hardMax <= 0) {
      const del = await sb
        .from("cart_items")
        .delete()
        .eq("id", itemId)
        .eq("cart_id", cart_id);

      if (del.error) throw new Error(del.error.message);

      removedIds.add(itemId);
      changed = true;
      continue;
    }

    const existing = activeByLineKey.get(line_key);

    if (existing && existing.id !== itemId && !removedIds.has(existing.id)) {
      const mergedDesired = Math.max(1, existing.qty + finalQty);
      const merged = computeHardMax({
        desiredQty: mergedDesired,
        unlimited,
        available_qty,
        max_per_order,
      });

      if (merged.hardMax <= 0) {
        const del = await sb
          .from("cart_items")
          .delete()
          .eq("id", itemId)
          .eq("cart_id", cart_id);

        if (del.error) throw new Error(del.error.message);

        removedIds.add(itemId);
        changed = true;
        continue;
      }

      const upMain = await sb
        .from("cart_items")
        .update({
          qty: merged.finalQty,
          variant_id,
          line_key,
          selected_option_value_ids,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .eq("cart_id", cart_id);

      if (upMain.error) throw new Error(upMain.error.message);

      const delDup = await sb
        .from("cart_items")
        .delete()
        .eq("id", itemId)
        .eq("cart_id", cart_id);

      if (delDup.error) throw new Error(delDup.error.message);

      removedIds.add(itemId);
      activeByLineKey.set(line_key, {
        id: existing.id,
        qty: merged.finalQty,
      });
      changed = true;
      continue;
    }

    const needsUpdate =
      s(it?.variant_id) !== s(variant_id) ||
      s(it?.line_key) !== s(line_key) ||
      Math.max(1, Math.floor(toNumber(it?.qty))) !== finalQty;

    if (needsUpdate) {
      const up = await sb
        .from("cart_items")
        .update({
          qty: finalQty,
          variant_id,
          line_key,
          selected_option_value_ids,
          updated_at: new Date().toISOString(),
        })
        .eq("id", itemId)
        .eq("cart_id", cart_id);

      if (up.error) throw new Error(up.error.message);
      changed = true;
    }

    activeByLineKey.set(line_key, { id: itemId, qty: finalQty });
  }

  if (changed) {
    const countR = await sb
      .from("cart_items")
      .select("qty")
      .eq("cart_id", cart_id);

    if (countR.error) throw new Error(countR.error.message);

    const rows: Array<{ qty?: number | string | null }> = Array.isArray(
      countR.data,
    )
      ? countR.data
      : [];

    const item_count = rows.reduce((sum: number, row) => {
      const qty = Number(row?.qty ?? 0);

      return sum + (Number.isFinite(qty) ? Math.max(0, Math.floor(qty)) : 0);
    }, 0);

    const upCart = await sb
      .from("carts")
      .update({
        item_count,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", cart_id)
      .eq("store_id", args.store_id);

    if (upCart.error) throw new Error(upCart.error.message);
  }

  return { changed, removedIds };
}

function normalizeCurrencyInfo(currency: string, info: any) {
  const code = String(currency || info?.code || "SAR").trim().toUpperCase();
  const symbol = s(info?.symbol) || code;

  const digitsRaw = Number(info?.decimal_digits ?? 2);
  const decimal_digits = Number.isFinite(digitsRaw)
    ? Math.max(0, Math.min(4, Math.floor(digitsRaw)))
    : 2;

  return {
    code,
    symbol,
    decimal_digits,
    name_ar: info?.name_ar ?? null,
    name_en: info?.name_en ?? null,
  };
}

function emptySummary(currency: string, currencyInfo?: any) {
  const meta = normalizeCurrencyInfo(currency, currencyInfo);

  return {
    subtotal: 0,
    discount: 0,
    tax: 0,
    shipping: 0,
    total: 0,

    currency: meta.code,
    currency_code: meta.code,
    currencyCode: meta.code,

    currency_symbol: meta.symbol,
    currencySymbol: meta.symbol,
    symbol: meta.symbol,

    currency_decimals: meta.decimal_digits,
    currencyDecimals: meta.decimal_digits,
    decimal_digits: meta.decimal_digits,
    decimalDigits: meta.decimal_digits,
  };
}

function jsonWithCartCookie(args: {
  sid: string;
  payload: any;
  status?: number;
}) {
  const res = NextResponse.json(args.payload, {
    status: args.status ?? 200,
  });

  const c = cartSessionCookie(args.sid);

  res.cookies.set(c.name, c.value, {
    httpOnly: c.httpOnly,
    sameSite: c.sameSite,
    path: c.path,
    secure: c.secure,
    maxAge: c.maxAge,
  });

  return res;
}

async function fetchCartItems(sb: any, cartId: string) {
  const itemsR = await sb
    .from("cart_items")
    .select(
      "id,product_id,variant_id,qty,selected_option_value_ids,selected_options,line_key,created_at,updated_at",
    )
    .eq("cart_id", cartId)
    .order("created_at", { ascending: true });

  if (itemsR.error) throw new Error(itemsR.error.message);

  return Array.isArray(itemsR.data) ? itemsR.data : [];
}

async function fetchProductsForCart(args: {
  sb: any;
  store_id: string;
  productIds: string[];
}) {
  const { sb, store_id, productIds } = args;

  const attempts = [
    "id,store_id,name,status,metadata,public_no,short_url",
    "id,store_id,name,status,metadata,public_no",
    "id,store_id,name,status,metadata",
  ];

  let lastResult: any = null;

  for (const select of attempts) {
    const result = await sb
      .from("products")
      .select(select)
      .eq("store_id", store_id)
      .in("id", productIds);

    lastResult = result;

    if (!result.error) return result;
  }

  return lastResult;
}

function buildMaps(args: {
  products: any[];
  stockRows: any[];
  variants: any[];
  links: any[];
}) {
  const productMap = new Map<string, any>();
  for (const p of args.products) productMap.set(String(p.id), p);

  const stockByProduct = new Map<string, any>();
  for (const row of args.stockRows) {
    stockByProduct.set(String(row.product_id), row);
  }

  const variantsByProduct = new Map<string, any[]>();
  const variantById = new Map<string, any>();
  const variantToProduct = new Map<string, string>();

  for (const v of args.variants) {
    const pid = String(v.product_id);

    if (!variantsByProduct.has(pid)) variantsByProduct.set(pid, []);
    variantsByProduct.get(pid)!.push(v);

    variantById.set(String(v.id), v);
    variantToProduct.set(String(v.id), pid);
  }

  const linksByProduct = new Map<string, any[]>();

  for (const l of args.links) {
    const pid = variantToProduct.get(String(l.variant_id));
    if (!pid) continue;

    if (!linksByProduct.has(pid)) linksByProduct.set(pid, []);
    linksByProduct.get(pid)!.push(l);
  }

  return {
    productMap,
    stockByProduct,
    variantsByProduct,
    variantById,
    linksByProduct,
  };
}

function resolveConvertedItemPrices(args: {
  pricingRow: any;
  variantRow: any | null;
  selectedOptionValueIds: string[];
  valueById: Map<string, any>;
  targetCurrency: string;
  currencyRuntime: ReturnType<typeof buildCurrencyRuntime>;
}) {
  const sourceCode = readPricingCurrency(
    args.pricingRow,
    args.currencyRuntime.defaultCode,
  );

  if (args.variantRow) {
    const rawVariantPrice = toNumber(args.variantRow?.price);
    const rawVariantSalePrice = toNumber(args.variantRow?.sale_price);

    const variantHasOwnPrice = rawVariantPrice > 0 || rawVariantSalePrice > 0;

    if (variantHasOwnPrice) {
      return {
        price: convertNullablePrice({
          amount: rawVariantPrice,
          sourceCode,
          targetCurrency: args.targetCurrency,
          currencyRuntime: args.currencyRuntime,
        }),
        sale_price: convertNullablePrice({
          amount: rawVariantSalePrice,
          sourceCode,
          targetCurrency: args.targetCurrency,
          currencyRuntime: args.currencyRuntime,
        }),
      };
    }
  }

  const rawBase = toNumber(args.pricingRow?.price);
  const rawSale = toNumber(args.pricingRow?.sale_price);

  let rawExtra = 0;

  for (const id of args.selectedOptionValueIds) {
    const value = args.valueById.get(String(id));
    if (value) rawExtra += toNumber(value.extra_price);
  }

  return {
    price: convertNullablePrice({
      amount: rawBase > 0 ? rawBase + rawExtra : 0,
      sourceCode,
      targetCurrency: args.targetCurrency,
      currencyRuntime: args.currencyRuntime,
    }),
    sale_price: convertNullablePrice({
      amount: rawSale > 0 ? rawSale + rawExtra : 0,
      sourceCode,
      targetCurrency: args.targetCurrency,
      currencyRuntime: args.currencyRuntime,
    }),
  };
}

function pickFinalConvertedUnitPrice(prices: {
  price: number | null;
  sale_price: number | null;
}) {
  const sale = toNumber(prices.sale_price);
  if (sale > 0) return sale;

  const price = toNumber(prices.price);
  return price > 0 ? price : 0;
}

export async function GET() {
  try {
    const store_id = await getStoreIdOrThrow();
    const sid = await getCartSessionId();
    const sb: any = supabaseAdmin();

    const [cart, seoMode, storeCurrencyInfo, storeDefaultCurrency] =
      await Promise.all([
        getOrCreateOpenCart({ store_id, session_id: sid }),
        getSafeSeoMode(store_id),
        getStoreCurrencyInfo(store_id),
        fetchStoreDefaultCurrencyCode(sb, store_id, "SAR"),
      ]);

    const cartTaxContextPromise = getCartTaxContext({
      store_id,
      seoMode,
    });

    const baseCurrency = cleanCurrencyCode(
      storeDefaultCurrency || storeCurrencyInfo?.code || cart?.currency,
      "SAR",
    );

    const [selectedCookieCurrency, currencyRows, cartTaxContext] =
      await Promise.all([
        readSelectedCurrencyCodeFromCookies(),
        fetchStoreCurrenciesForRuntime(sb, store_id),
        cartTaxContextPromise,
      ]);

    const currencyRuntime = buildCurrencyRuntime(currencyRows, baseCurrency);

    const storeBaseCurrencyCode = baseCurrency;

    const targetCurrency = resolveTargetCurrencyCode({
      selectedCode: selectedCookieCurrency,
      fallbackCode: baseCurrency,
      runtime: currencyRuntime,
    });

    const currencyInfo = currencyInfoFromRuntime({
      code: targetCurrency,
      runtime: currencyRuntime,
      fallbackInfo: storeCurrencyInfo,
    });

    const [cartCouponR, initialItems] = await Promise.all([
      sb
        .from("cart_coupons")
        .select("id,code,discount_amount,coupon_id")
        .eq("store_id", store_id)
        .eq("cart_id", cart.id)
        .limit(1)
        .maybeSingle(),

      fetchCartItems(sb, cart.id),
    ]);

    if (cartCouponR.error) throw new Error(cartCouponR.error.message);

    const couponRaw = cartCouponR.data?.id
      ? {
          id: String(cartCouponR.data.id),
          coupon_id: cartCouponR.data.coupon_id
            ? String(cartCouponR.data.coupon_id)
            : "",
          code: String(cartCouponR.data.code ?? ""),
          discount_amount: Number(cartCouponR.data.discount_amount ?? 0),
        }
      : null;

    const empty = emptySummary(currencyInfo.code, currencyInfo);

    if (!initialItems.length) {
      return jsonWithCartCookie({
        sid,
        payload: {
          data: {
            cart,
            items: [],
            summary: empty,
            coupon: couponRaw ? { ...couponRaw, discount_amount: 0 } : null,
            currency_info: currencyInfo,
          },
        },
      });
    }

    const initialProductIds: string[] = Array.from(
      new Set(
        initialItems
          .map((x: any) => String(x?.product_id ?? "").trim())
          .filter((id: string) => Boolean(id)),
      ),
    );

    if (!initialProductIds.length) {
      return jsonWithCartCookie({
        sid,
        payload: {
          data: {
            cart,
            items: [],
            summary: empty,
            coupon: couponRaw ? { ...couponRaw, discount_amount: 0 } : null,
            currency_info: currencyInfo,
          },
        },
      });
    }

    const [productsR, stockR, variantsR, pricingR, mediaR, optionsR] =
      await Promise.all([
        fetchProductsForCart({
          sb,
          store_id,
          productIds: initialProductIds,
        }),

        sb
          .from("product_stock")
          .select(
            "product_id,quantity,unlimited_quantity,maximum_quantity_per_order",
          )
          .in("product_id", initialProductIds),

        sb
          .from("product_variants")
          .select(
            "id,product_id,stock_quantity,unlimited_quantity,price,sale_price,cost_price,is_default,weight,weight_unit",
          )
          .in("product_id", initialProductIds),

        sb
          .from("product_pricing")
          .select("product_id,price,sale_price,currency,with_tax")
          .in("product_id", initialProductIds),

        sb
          .from("product_media")
          .select(
            "product_id,media_kind,original_url,thumbnail_url,is_default,sort_order",
          )
          .eq("store_id", store_id)
          .in("product_id", initialProductIds)
          .eq("media_kind", "image"),

        sb
          .from("product_options")
          .select(
            "id,product_id,name,is_required,option_field_type,display_type,sort_order",
          )
          .in("product_id", initialProductIds)
          .order("sort_order", { ascending: true }),
      ]);

    if (productsR.error) throw new Error(productsR.error.message);
    if (stockR.error) throw new Error(stockR.error.message);
    if (variantsR.error) throw new Error(variantsR.error.message);
    if (pricingR.error) throw new Error(pricingR.error.message);
    if (mediaR.error) throw new Error(mediaR.error.message);
    if (optionsR.error) throw new Error(optionsR.error.message);

    const productsRaw = Array.isArray(productsR.data) ? productsR.data : [];
    const products = productsRaw.filter((p: any) =>
      isProductVisibleInWeb({
        status: p?.status,
        metadata: p?.metadata,
      }),
    );

    const visibleProductIds = new Set(
      products.map((p: any) => String(p.id)).filter(Boolean),
    );

    const stockRows = Array.isArray(stockR.data)
      ? stockR.data.filter((row: any) =>
          visibleProductIds.has(String(row.product_id)),
        )
      : [];

    const variants = Array.isArray(variantsR.data)
      ? variantsR.data.filter((variant: any) =>
          visibleProductIds.has(String(variant.product_id)),
        )
      : [];

    const variantIds = uniq(
      variants.map((variant: any) => String(variant.id)).filter(Boolean),
    );

    const [linksR, valuesR] = await Promise.all([
      variantIds.length
        ? sb
            .from("variant_option_values")
            .select("variant_id,option_value_id")
            .in("variant_id", variantIds)
        : Promise.resolve({ data: [], error: null } as any),

      (() => {
        const options = Array.isArray(optionsR.data) ? optionsR.data : [];
        const optionIds = uniq(
          options.map((option: any) => String(option.id)).filter(Boolean),
        );

        return optionIds.length
          ? sb
              .from("product_option_values")
              .select(
                "id,option_id,name,extra_price,quantity,is_default,display_value,image_url,sort_order",
              )
              .in("option_id", optionIds)
              .order("sort_order", { ascending: true })
          : Promise.resolve({ data: [], error: null } as any);
      })(),
    ]);

    if (linksR.error) throw new Error(linksR.error.message);
    if (valuesR.error) throw new Error(valuesR.error.message);

    const links = Array.isArray(linksR.data) ? linksR.data : [];
    const values = Array.isArray(valuesR.data) ? valuesR.data : [];

    const maps = buildMaps({
      products,
      stockRows,
      variants,
      links,
    });

    const normalized = await normalizeCartLines({
      sb,
      cart_id: cart.id,
      store_id,
      items: initialItems,
      productMap: maps.productMap,
      stockByProduct: maps.stockByProduct,
      dbVariantsByProduct: maps.variantsByProduct,
      dbVariantById: maps.variantById,
      dbLinksByProduct: maps.linksByProduct,
    });

    let items = normalized.changed
      ? await fetchCartItems(sb, cart.id)
      : initialItems;

    items = items.filter((it: any) => {
      const itemId = String(it?.id ?? "");
      const productId = String(it?.product_id ?? "");

      if (!itemId || normalized.removedIds.has(itemId)) return false;
      return visibleProductIds.has(productId);
    });

    const productIds = uniq(
      items.map((x: any) => String(x.product_id)).filter(Boolean),
    );

    if (!productIds.length) {
      return jsonWithCartCookie({
        sid,
        payload: {
          data: {
            cart,
            items: [],
            summary: empty,
            coupon: couponRaw ? { ...couponRaw, discount_amount: 0 } : null,
            currency_info: currencyInfo,
          },
        },
      });
    }

    const pricingRows = Array.isArray(pricingR.data)
      ? pricingR.data.filter((row: any) =>
          visibleProductIds.has(String(row.product_id)),
        )
      : [];

    const pricingMap = new Map<string, any>();
    for (const pricingRow of pricingRows) {
      pricingMap.set(String(pricingRow.product_id), pricingRow);
    }

    const mediaRows = Array.isArray(mediaR.data)
      ? mediaR.data.filter((row: any) =>
          visibleProductIds.has(String(row.product_id)),
        )
      : [];

    const mediaByProduct = new Map<string, any[]>();
    for (const media of mediaRows) {
      const pid = String(media.product_id);
      if (!mediaByProduct.has(pid)) mediaByProduct.set(pid, []);
      mediaByProduct.get(pid)!.push(media);
    }

    const options = Array.isArray(optionsR.data)
      ? optionsR.data.filter((option: any) =>
          visibleProductIds.has(String(option.product_id)),
        )
      : [];

    const valuesByOption = new Map<string, any[]>();
    const valueById = new Map<string, any>();

    for (const value of values) {
      const optionId = String(value.option_id);
      if (!valuesByOption.has(optionId)) valuesByOption.set(optionId, []);
      valuesByOption.get(optionId)!.push(value);
      valueById.set(String(value.id), value);
    }

    const optionsByProduct = new Map<string, any[]>();

    for (const option of options) {
      const pid = String(option.product_id);
      const built = {
        ...option,
        values: valuesByOption.get(String(option.id)) ?? [],
      };

      if (!optionsByProduct.has(pid)) optionsByProduct.set(pid, []);
      optionsByProduct.get(pid)!.push(built);
    }

    let subtotal = 0;
    let taxTotal = 0;

    const enriched = items.map((it: any) => {
      const pid = String(it.product_id);
      const product = maps.productMap.get(pid) ?? null;
      const pricingRow = pricingMap.get(pid) ?? null;
      const imageUrl = pickPrimaryImage(mediaByProduct.get(pid) ?? []);
      const metadata = product?.metadata ?? null;

      const href = buildSafeProductHref({
        mode: seoMode,
        product,
        productId: pid,
      });

      const dbOptions = optionsByProduct.get(pid) ?? [];
      const dbVariants = maps.variantsByProduct.get(pid) ?? [];
      const dbLinks = maps.linksByProduct.get(pid) ?? [];

      const finalOptions =
        dbOptions.length > 0 ? dbOptions : coerceOptionsFromMetadata(metadata);

      const finalVariants =
        dbVariants.length > 0 ? dbVariants : coerceVariantsFromMetadata(metadata);

      const finalLinks =
        dbLinks.length > 0 ? dbLinks : coerceVariantLinksFromMetadata(metadata);

      const qty = Math.max(1, Math.floor(toNumber(it.qty)));
      const variantId = it.variant_id ? String(it.variant_id) : null;

      const selectedOptionValueIds = Array.isArray(it.selected_option_value_ids)
        ? it.selected_option_value_ids.map(String).filter(Boolean)
        : [];

      const finalVariantById = new Map<string, any>();

      for (const variant of finalVariants) {
        const id = s(variant?.id);
        if (id) finalVariantById.set(id, variant);
      }

      const variantRow =
        variantId && maps.variantById.has(variantId)
          ? maps.variantById.get(variantId)
          : variantId
            ? finalVariantById.get(variantId) ?? null
            : null;

      const convertedPricesBeforeTax = resolveConvertedItemPrices({
        pricingRow,
        variantRow,
        selectedOptionValueIds,
        valueById,
        targetCurrency: currencyInfo.code,
        currencyRuntime,
      });

      const lineTax = normalizeCartLineTax({
        tax: cartTaxContext,
        pricingRow,
      });

      const convertedPrices = applyCartTaxToConvertedPrices(
        convertedPricesBeforeTax,
        lineTax,
      );

      const unitPriceBeforeTax = pickFinalConvertedUnitPrice(
        convertedPricesBeforeTax,
      );

      const unitPrice = pickFinalConvertedUnitPrice(convertedPrices);

      const compareAtPrice =
        toNumber(convertedPrices.sale_price) > 0 &&
        toNumber(convertedPrices.price) > toNumber(convertedPrices.sale_price)
          ? toNumber(convertedPrices.price)
          : null;

      const lineSubtotal = unitPriceBeforeTax * qty;
      const lineTaxAmount = Math.max(0, unitPrice - unitPriceBeforeTax) * qty;
      const lineTotal = unitPrice * qty;

      subtotal += lineSubtotal;
      taxTotal += lineTaxAmount;

      const stockLimit = buildStockLimitForCartItem({
        qty,
        metadata,
        stockRow: maps.stockByProduct.get(pid) ?? null,
        variant_id: variantId,
        dbVariantById: maps.variantById,
      });

      return {
        ...it,

        unit_price: unitPrice,
        unitPrice,

        unit_price_before_tax: unitPriceBeforeTax,
        unitPriceBeforeTax: unitPriceBeforeTax,

        compare_at_price: compareAtPrice,
        compareAtPrice,

        total_price: lineTotal,
        totalPrice: lineTotal,

        line_subtotal: lineSubtotal,
        lineSubtotal: lineSubtotal,

        line_total: lineTotal,
        lineTotal,

        currency: currencyInfo.code,
        currency_code: currencyInfo.code,
        currencyCode: currencyInfo.code,

        currency_symbol: currencyInfo.symbol,
        currencySymbol: currencyInfo.symbol,
        symbol: currencyInfo.symbol,

        currency_decimals: currencyInfo.decimal_digits,
        currencyDecimals: currencyInfo.decimal_digits,
        decimal_digits: currencyInfo.decimal_digits,
        decimalDigits: currencyInfo.decimal_digits,

        product: product
          ? {
              id: String(product.id),
              name: product.name ?? null,
              image_url: imageUrl,

              price: convertedPrices.price,
              sale_price: convertedPrices.sale_price,

              currency: currencyInfo.code,
              currency_code: currencyInfo.code,
              currencyCode: currencyInfo.code,

              currency_symbol: currencyInfo.symbol,
              currencySymbol: currencyInfo.symbol,
              symbol: currencyInfo.symbol,

              currency_decimals: currencyInfo.decimal_digits,
              currencyDecimals: currencyInfo.decimal_digits,
              decimal_digits: currencyInfo.decimal_digits,
              decimalDigits: currencyInfo.decimal_digits,

              href,
            }
          : {
              id: pid,
              name: null,
              image_url: imageUrl,

              price: convertedPrices.price,
              sale_price: convertedPrices.sale_price,

              currency: currencyInfo.code,
              currency_code: currencyInfo.code,
              currencyCode: currencyInfo.code,

              currency_symbol: currencyInfo.symbol,
              currencySymbol: currencyInfo.symbol,
              symbol: currencyInfo.symbol,

              currency_decimals: currencyInfo.decimal_digits,
              currencyDecimals: currencyInfo.decimal_digits,
              decimal_digits: currencyInfo.decimal_digits,
              decimalDigits: currencyInfo.decimal_digits,

              href,
            },

        options: finalOptions,
        variants: finalVariants,
        variant_links: finalLinks,
        stock_limit: stockLimit,
      };
    });

    let discountFromCoupon = 0;
    let coupon: any = null;
    let couponFreeShipping = false;

    if (couponRaw?.coupon_id) {
      const couponR = await sb
        .from("coupons")
        .select(
          "id,store_id,code,discount_type,amount,maximum_amount,start_at,end_at,status,minimum_amount,exclude_sale_products,free_shipping",
        )
        .eq("id", String(couponRaw.coupon_id))
        .eq("store_id", store_id)
        .limit(1)
        .maybeSingle();

      if (!couponR.error && couponR.data?.id) {
        const couponRow = couponR.data;
        const now = Date.now();

        const minimumAmountRaw =
          couponRow.minimum_amount == null
            ? null
            : Math.max(0, toNumber(couponRow.minimum_amount));

        const minimumAmount =
          minimumAmountRaw != null && minimumAmountRaw > 0
            ? convertMoney({
                amount: minimumAmountRaw,
                sourceCode: storeBaseCurrencyCode,
                targetCode: currencyInfo.code,
                runtime: currencyRuntime,
              })
            : null;

        const couponIsValid =
          String(couponRow.status) === "active" &&
          (!couponRow.start_at ||
            Date.parse(String(couponRow.start_at)) <= now) &&
          (!couponRow.end_at || Date.parse(String(couponRow.end_at)) >= now) &&
          (minimumAmount == null || subtotal >= minimumAmount);

        if (couponIsValid) {
          let eligibleSubtotal = subtotal;

          if (couponRow.exclude_sale_products === true) {
            eligibleSubtotal = enriched.reduce((sum: number, item: any) => {
              const qty = Math.max(1, Math.floor(toNumber(item?.qty)));

              const unitBeforeTax = toNumber(
                item?.unit_price_before_tax ?? item?.unitPriceBeforeTax,
              );

              const lineBeforeTax =
                toNumber(item?.line_subtotal ?? item?.lineSubtotal) ||
                unitBeforeTax * qty;

              const compareAt = toNumber(
                item?.compare_at_price ?? item?.compareAtPrice,
              );

              const unitPrice = toNumber(item?.unit_price ?? item?.unitPrice);

              const isSaleLine =
                compareAt > 0 && unitPrice > 0 && compareAt > unitPrice;

              if (isSaleLine) return sum;

              return sum + Math.max(0, lineBeforeTax);
            }, 0);
          }

          if (eligibleSubtotal > 0) {
            if (String(couponRow.discount_type) === "P") {
              const pct = Math.max(0, toNumber(couponRow.amount));
              discountFromCoupon = eligibleSubtotal * (pct / 100);

              const maxRaw =
                couponRow.maximum_amount == null
                  ? null
                  : Math.max(0, toNumber(couponRow.maximum_amount));

              const maxAmount =
                maxRaw != null && maxRaw > 0
                  ? convertMoney({
                      amount: maxRaw,
                      sourceCode: storeBaseCurrencyCode,
                      targetCode: currencyInfo.code,
                      runtime: currencyRuntime,
                    })
                  : null;

              if (maxAmount != null && maxAmount > 0) {
                discountFromCoupon = Math.min(discountFromCoupon, maxAmount);
              }
            } else {
              discountFromCoupon = convertMoney({
                amount: Math.max(0, toNumber(couponRow.amount)),
                sourceCode: storeBaseCurrencyCode,
                targetCode: currencyInfo.code,
                runtime: currencyRuntime,
              });
            }
          }

          discountFromCoupon = Math.max(
            0,
            Math.min(discountFromCoupon, eligibleSubtotal),
          );

          discountFromCoupon = round2(discountFromCoupon);

          couponFreeShipping = couponRow.free_shipping === true;

          coupon = {
            id: String(couponRaw.id),
            coupon_id: String(couponRow.id),
            code: String(couponRaw.code || couponRow.code || ""),
            discount_amount: discountFromCoupon,

            discount_type: couponRow.discount_type,
            discountType: couponRow.discount_type,
            amount: toNumber(couponRow.amount),
            maximum_amount:
              couponRow.maximum_amount == null
                ? null
                : toNumber(couponRow.maximum_amount),
            maximumAmount:
              couponRow.maximum_amount == null
                ? null
                : toNumber(couponRow.maximum_amount),
            exclude_sale_products: couponRow.exclude_sale_products === true,
            excludeSaleProducts: couponRow.exclude_sale_products === true,
            free_shipping: couponRow.free_shipping === true,
            freeShipping: couponRow.free_shipping === true,
          };
        }
      }
    }

    const storedDiscountInBase = discountFromCoupon
      ? round2(
          convertMoney({
            amount: discountFromCoupon,
            sourceCode: currencyInfo.code,
            targetCode: storeBaseCurrencyCode,
            runtime: currencyRuntime,
          }),
        )
      : 0;

    if (
      couponRaw?.id &&
      Math.abs(toNumber(couponRaw.discount_amount) - storedDiscountInBase) > 0.01
    ) {
      void Promise.all([
        sb
          .from("cart_coupons")
          .update({
            discount_amount: storedDiscountInBase,
            updated_at: new Date().toISOString(),
          })
          .eq("store_id", store_id)
          .eq("cart_id", cart.id),

        sb
          .from("carts")
          .update({
            coupon_discount: storedDiscountInBase,
            last_activity_at: new Date().toISOString(),
          })
          .eq("id", cart.id)
          .eq("store_id", store_id),
      ]).catch(() => undefined);
    }

    const freeShippingProductIds: string[] = Array.from(
      new Set<string>(
        enriched
          .map((item: any) =>
            String(item?.product_id ?? item?.product?.id ?? "").trim(),
          )
          .filter((id: string) => id.length > 0),
      ),
    );

    const freeShippingEvaluator = await loadFreeShippingEvaluator({
      sb,
      storeId: store_id,
      subtotal,
      productIds: freeShippingProductIds,
      minimumSubtotalToCartCurrency: (amount) =>
        convertMoney({
          amount,
          sourceCode: storeBaseCurrencyCode,
          targetCode: currencyInfo.code,
          runtime: currencyRuntime,
        }),
    });

    const freeShippingRule = freeShippingEvaluator.evaluate();

    const freeShippingThreshold = Number(freeShippingRule.minimumSubtotal ?? 0);
    const freeShippingRemaining = Number(freeShippingRule.remaining ?? 0);
    const freeShippingAvailable = Boolean(freeShippingRule.available);
    const freeShippingApplied = Boolean(
      couponFreeShipping || freeShippingRule.applied,
    );

    const summary = {
      subtotal,
      discount: discountFromCoupon,
      tax: taxTotal,
      shipping: 0,
      total: Math.max(0, subtotal + taxTotal - discountFromCoupon),

      free_shipping: freeShippingApplied,
      freeShipping: freeShippingApplied,

      free_shipping_available: freeShippingAvailable,
      freeShippingAvailable: freeShippingAvailable,

      free_shipping_threshold: freeShippingThreshold,
      freeShippingThreshold: freeShippingThreshold,

      free_shipping_remaining: couponFreeShipping ? 0 : freeShippingRemaining,
      freeShippingRemaining: couponFreeShipping ? 0 : freeShippingRemaining,

      free_shipping_source: couponFreeShipping
        ? "coupon"
        : freeShippingRule.applied
          ? "rule"
          : null,
      freeShippingSource: couponFreeShipping
        ? "coupon"
        : freeShippingRule.applied
          ? "rule"
          : null,

      free_shipping_rule_id: freeShippingRule.ruleId,
      freeShippingRuleId: freeShippingRule.ruleId,

      free_shipping_rule_name: freeShippingRule.ruleName,
      freeShippingRuleName: freeShippingRule.ruleName,

      currency: currencyInfo.code,
      currency_code: currencyInfo.code,
      currencyCode: currencyInfo.code,

      currency_symbol: currencyInfo.symbol,
      currencySymbol: currencyInfo.symbol,
      symbol: currencyInfo.symbol,

      currency_decimals: currencyInfo.decimal_digits,
      currencyDecimals: currencyInfo.decimal_digits,
      decimal_digits: currencyInfo.decimal_digits,
      decimalDigits: currencyInfo.decimal_digits,
    };

    return jsonWithCartCookie({
      sid,
      payload: {
        data: {
          cart,
          items: enriched,
          summary,
          coupon,
          currency_info: currencyInfo,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}