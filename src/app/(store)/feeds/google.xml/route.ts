// FILE: apps/storefront/src/app/(store)/feeds/google.xml/route.ts

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { controlDb } from "@/data/db/control-db.server";
import { getStoreDb } from "@/data/db/store-db.server";
import { isProductVisibleInWeb } from "@/data/catalog/products";
import { productUrl } from "@/lib/seo/urls";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SeoUrlMode = "short" | "named_ar" | "named_en";

type FeedConfig = {
  feedEnabled: boolean;
  feedLanguage: "ar" | "en";
  targetCountry: string;
  defaultCondition: "new" | "used" | "refurbished";
  defaultBrand: string;
  includeOutOfStock: boolean;
  shippingServiceName: string;
  shippingPrice: number | null;
  taxEnabled: boolean;
};

type ProductBaseRow = {
  id: string;
  store_id: string;
  name: string | null;
  description: string | null;
  status: string | null;
  public_no: number | null;
  created_at: string | null;
  updated_at: string | null;
  brand_id: string | null;
  metadata: Record<string, any> | null;
  product_metadata?: any;
};

type ProductPricingRow = {
  product_id: string;
  currency: string | null;
  price: number | string | null;
  sale_price: number | string | null;
  sale_start?: string | null;
  sale_end?: string | null;
  with_tax?: boolean | null;
};

type ProductStockRow = {
  product_id: string;
  quantity: number | string | null;
  unlimited_quantity: boolean | null;
};

type ProductMediaRow = {
  id: string;
  product_id: string;
  media_kind: string | null;
  original_url: string | null;
  thumbnail_url: string | null;
  alt: string | null;
  is_default: boolean | null;
  sort_order: number | string | null;
};

type ProductVariantRow = {
  id: string;
  product_id: string;
  sku: string | null;
  barcode: string | null;
  mpn: string | null;
  gtin: string | null;
  price: number | string | null;
  sale_price: number | string | null;
  stock_quantity: number | string | null;
  unlimited_quantity: boolean | null;
  is_default: boolean | null;
  created_at: string | null;
};

type BrandRow = {
  id: string;
  name: string | null;
};

type CurrencyRow = {
  currency_code: string | null;
  decimal_digits: number | string | null;
  is_default: boolean | null;
  is_enabled: boolean | null;
};

type BulkMaps = {
  pricingByProductId: Map<string, ProductPricingRow>;
  stockByProductId: Map<string, ProductStockRow>;
  mediaByProductId: Map<string, ProductMediaRow[]>;
  variantsByProductId: Map<string, ProductVariantRow[]>;
  brandById: Map<string, BrandRow>;
  currencyDecimalsByCode: Map<string, number>;
};

const GOOGLE_NS = "http://base.google.com/ns/1.0";
const FEED_PRODUCT_LIMIT = 5000;

const DEFAULT_CONFIG: FeedConfig = {
  feedEnabled: true,
  feedLanguage: "ar",
  targetCountry: "SA",
  defaultCondition: "new",
  defaultBrand: "",
  includeOutOfStock: false,
  shippingServiceName: "",
  shippingPrice: null,
  taxEnabled: false,
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

function safeObject(value: any): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      //
    }
  }

  return {};
}

function readBool(value: any, fallback = false) {
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

  return fallback;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function positiveNumber(value: unknown): number | null {
  const n = toNumber(value);
  return n !== null && n > 0 ? n : null;
}

function normalizeCountry(value: unknown) {
  const country = s(value).toUpperCase();
  return /^[A-Z]{2}$/.test(country) ? country : "SA";
}

function normalizeLanguage(value: unknown): "ar" | "en" {
  const lang = s(value).toLowerCase();
  return lang === "en" ? "en" : "ar";
}

function normalizeCondition(value: unknown): "new" | "used" | "refurbished" {
  const condition = s(value).toLowerCase();

  if (
    condition === "new" ||
    condition === "used" ||
    condition === "refurbished"
  ) {
    return condition;
  }

  return "new";
}

function normalizeCurrencyCode(value: unknown, fallback = "SAR") {
  const code = s(value).toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : fallback;
}

function clampDecimals(value: unknown, fallback = 2) {
  const n = Number(value);

  if (!Number.isFinite(n)) return fallback;

  return Math.max(0, Math.min(4, Math.floor(n)));
}

function escapeXml(value: unknown) {
  return s(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripHtml(value: unknown) {
  return s(value)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function limitText(value: unknown, max: number) {
  const text = stripHtml(value);
  if (text.length <= max) return text;
  return text.slice(0, max).trim();
}

function cleanHost(raw: string) {
  return s(raw).toLowerCase().replace(/:\d+$/, "");
}

function getRequestBaseUrl(request: NextRequest) {
  const forwardedHost = cleanHost(request.headers.get("x-forwarded-host") || "");
  const host = forwardedHost || cleanHost(request.headers.get("host") || "");
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (host.includes("localhost") ? "http" : "https");

  if (host) return `${proto}://${host}`.replace(/\/+$/, "");

  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`.replace(/\/+$/, "");
}

function makeAbsUrl(baseUrl: string, value: unknown) {
  const text = s(value);
  if (!text) return "";

  if (/^https?:\/\//i.test(text)) return text;

  const cleanBase = s(baseUrl).replace(/\/+$/, "");
  const cleanPath = text.startsWith("/") ? text : `/${text}`;

  return new URL(cleanPath, `${cleanBase}/`).toString();
}

function responseXml(xml: string, status = 200) {
  return new NextResponse(xml, {
    status,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}

function disabledFeedResponse(message: string, status = 404) {
  return responseXml(
    [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<rss version="2.0" xmlns:g="${GOOGLE_NS}">`,
      `  <channel>`,
      `    <title>Google Merchant Feed</title>`,
      `    <description>${escapeXml(message)}</description>`,
      `  </channel>`,
      `</rss>`,
    ].join("\n"),
    status,
  );
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

async function loadSettingFromClient(
  sb: any,
  storeId: string,
  slugs: string[],
) {
  try {
    const { data, error } = await sb
      .from("store_settings")
      .select("slug,value,updated_at,created_at")
      .eq("store_id", storeId)
      .in("slug", slugs)
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !Array.isArray(data) || !data.length) return null;

    return data[0] as { slug?: string | null; value?: any } | null;
  } catch {
    return null;
  }
}

async function loadStoreSetting(storeId: string, slugs: string[]) {
  try {
    const storeDb = await getStoreDb(storeId);
    const row = await loadSettingFromClient(storeDb, storeId, slugs);

    if (row) return row;
  } catch {
    //
  }

  try {
    const row = await loadSettingFromClient(controlDb(), storeId, slugs);

    if (row) return row;
  } catch {
    //
  }

  return null;
}

async function loadSeoUrlMode(storeId: string): Promise<SeoUrlMode> {
  const row = await loadStoreSetting(storeId, ["seo.url_mode", "seo.meta"]);
  const value = safeObject(row?.value);

  const mode = s(value.mode);

  if (mode === "named_ar" || mode === "named_en" || mode === "short") {
    return mode;
  }

  const urlMode = Number(value.url_mode ?? 0);

  if (urlMode === 1) return "named_ar";
  if (urlMode === 2) return "named_en";

  return "short";
}

function readConfigValue(raw: Record<string, any>, key: string) {
  return raw[key] ?? raw?.public_config?.[key] ?? raw?.metadata?.[key];
}

function normalizeFeedConfig(raw: Record<string, any>): FeedConfig {
  const shippingPrice = positiveNumber(readConfigValue(raw, "shipping_price"));

  return {
    feedEnabled: readBool(
      readConfigValue(raw, "feed_enabled"),
      DEFAULT_CONFIG.feedEnabled,
    ),
    feedLanguage: normalizeLanguage(readConfigValue(raw, "feed_language")),
    targetCountry: normalizeCountry(readConfigValue(raw, "target_country")),
    defaultCondition: normalizeCondition(
      readConfigValue(raw, "default_condition"),
    ),
    defaultBrand: s(readConfigValue(raw, "default_brand")),
    includeOutOfStock: readBool(
      readConfigValue(raw, "include_out_of_stock"),
      DEFAULT_CONFIG.includeOutOfStock,
    ),
    shippingServiceName: s(readConfigValue(raw, "shipping_service_name")),
    shippingPrice,
    taxEnabled: readBool(
      readConfigValue(raw, "tax_enabled"),
      DEFAULT_CONFIG.taxEnabled,
    ),
  };
}

async function loadGoogleMerchantConfigFromClient(
  sb: any,
  storeId: string,
): Promise<FeedConfig | null> {
  try {
    const appR = await sb
      .from("app_catalog")
      .select("id,key")
      .eq("key", "google_merchant_center")
      .limit(1)
      .maybeSingle();

    if (appR.error || !appR.data?.id) return null;

    const appId = String(appR.data.id);

    const installationR = await sb
      .from("store_app_installations")
      .select("id,status,config_status,metadata")
      .eq("store_id", storeId)
      .eq("app_id", appId)
      .limit(1)
      .maybeSingle();

    if (installationR.error || !installationR.data?.id) return null;

    const status = s(installationR.data.status).toLowerCase();

    if (
      status &&
      status !== "active" &&
      status !== "installed" &&
      status !== "enabled"
    ) {
      return {
        ...DEFAULT_CONFIG,
        feedEnabled: false,
      };
    }

    let configData: any = null;

    const configByAppR = await sb
      .from("store_app_configs")
      .select("public_config,private_config,metadata")
      .eq("store_id", storeId)
      .eq("app_id", appId)
      .limit(1)
      .maybeSingle();

    if (!configByAppR.error && configByAppR.data) {
      configData = configByAppR.data;
    }

    if (!configData) {
      const configByInstallationR = await sb
        .from("store_app_configs")
        .select("public_config,private_config,metadata")
        .eq("store_id", storeId)
        .eq("installation_id", installationR.data.id)
        .limit(1)
        .maybeSingle();

      if (!configByInstallationR.error && configByInstallationR.data) {
        configData = configByInstallationR.data;
      }
    }

    const merged = {
      ...DEFAULT_CONFIG,
      ...safeObject(configData?.public_config),
      ...safeObject(configData?.metadata),
      metadata: {
        ...safeObject(installationR.data.metadata),
        ...safeObject(configData?.metadata),
      },
      public_config: safeObject(configData?.public_config),
    };

    return normalizeFeedConfig(merged);
  } catch {
    return null;
  }
}

async function loadGoogleMerchantConfig(storeId: string): Promise<FeedConfig> {
  const fromControlDb = await loadGoogleMerchantConfigFromClient(
    controlDb(),
    storeId,
  );

  if (fromControlDb) return fromControlDb;

  try {
    const storeDb = await getStoreDb(storeId);
    const fromStoreDb = await loadGoogleMerchantConfigFromClient(
      storeDb,
      storeId,
    );

    if (fromStoreDb) return fromStoreDb;
  } catch {
    //
  }

  return {
    ...DEFAULT_CONFIG,
    feedEnabled: false,
  };
}

async function loadCurrencyDecimals(args: {
  sb: any;
  storeId: string;
  fallbackCurrency: string;
}) {
  const map = new Map<string, number>();

  map.set(normalizeCurrencyCode(args.fallbackCurrency, "SAR"), 2);

  try {
    const { data, error } = await args.sb
      .from("store_currencies")
      .select("currency_code,decimal_digits,is_default,is_enabled")
      .eq("store_id", args.storeId)
      .eq("is_enabled", true)
      .limit(50);

    if (!error && Array.isArray(data)) {
      for (const row of data as CurrencyRow[]) {
        const code = normalizeCurrencyCode(row.currency_code, "");
        if (!code) continue;

        map.set(code, clampDecimals(row.decimal_digits, 2));
      }
    }
  } catch {
    //
  }

  return map;
}

async function loadProducts(storeId: string): Promise<ProductBaseRow[]> {
  const sb = await getStoreDb(storeId);

  const { data, error } = await sb
    .from("products")
    .select(
      "id,store_id,name,description,status,public_no,created_at,updated_at,brand_id,metadata,product_metadata(url,title,description)",
    )
    .eq("store_id", storeId)
    .order("updated_at", { ascending: false })
    .limit(FEED_PRODUCT_LIMIT);

  if (error || !Array.isArray(data)) return [];

  return (data as ProductBaseRow[]).filter((row) =>
    isProductVisibleInWeb({
      status: row.status,
      metadata: row.metadata,
    }),
  );
}

async function loadBulkMaps(args: {
  sb: any;
  storeId: string;
  products: ProductBaseRow[];
  fallbackCurrency: string;
}): Promise<BulkMaps> {
  const productIds = args.products.map((product) => s(product.id)).filter(Boolean);
  const brandIds = Array.from(
    new Set(args.products.map((product) => s(product.brand_id)).filter(Boolean)),
  );

  const pricingByProductId = new Map<string, ProductPricingRow>();
  const stockByProductId = new Map<string, ProductStockRow>();
  const mediaByProductId = new Map<string, ProductMediaRow[]>();
  const variantsByProductId = new Map<string, ProductVariantRow[]>();
  const brandById = new Map<string, BrandRow>();

  if (!productIds.length) {
    return {
      pricingByProductId,
      stockByProductId,
      mediaByProductId,
      variantsByProductId,
      brandById,
      currencyDecimalsByCode: new Map([
        [normalizeCurrencyCode(args.fallbackCurrency, "SAR"), 2],
      ]),
    };
  }

  for (const ids of chunkArray(productIds, 400)) {
    const [pricingR, stockR, mediaR, variantsR] = await Promise.all([
      args.sb
        .from("product_pricing")
        .select(
          "product_id,currency,price,sale_price,sale_start,sale_end,with_tax",
        )
        .in("product_id", ids),

      args.sb
        .from("product_stock")
        .select("product_id,quantity,unlimited_quantity")
        .in("product_id", ids),

      args.sb
        .from("product_media")
        .select(
          "id,product_id,media_kind,original_url,thumbnail_url,alt,is_default,sort_order",
        )
        .eq("store_id", args.storeId)
        .in("product_id", ids),

      args.sb
        .from("product_variants")
        .select(
          "id,product_id,sku,barcode,mpn,gtin,price,sale_price,stock_quantity,unlimited_quantity,is_default,created_at",
        )
        .in("product_id", ids)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true }),
    ]);

    for (const row of pricingR.data || []) {
      pricingByProductId.set(String(row.product_id), row as ProductPricingRow);
    }

    for (const row of stockR.data || []) {
      stockByProductId.set(String(row.product_id), row as ProductStockRow);
    }

    for (const row of mediaR.data || []) {
      const productId = String(row.product_id);
      const arr = mediaByProductId.get(productId) || [];
      arr.push(row as ProductMediaRow);
      mediaByProductId.set(productId, arr);
    }

    for (const row of variantsR.data || []) {
      const productId = String(row.product_id);
      const arr = variantsByProductId.get(productId) || [];
      arr.push(row as ProductVariantRow);
      variantsByProductId.set(productId, arr);
    }
  }

  if (brandIds.length) {
    for (const ids of chunkArray(brandIds, 400)) {
      const brandsR = await args.sb
        .from("brands")
        .select("id,name")
        .eq("store_id", args.storeId)
        .in("id", ids);

      for (const row of brandsR.data || []) {
        brandById.set(String(row.id), row as BrandRow);
      }
    }
  }

  for (const [, rows] of mediaByProductId) {
    rows.sort((a, b) => {
      const ad = a.is_default ? 1 : 0;
      const bd = b.is_default ? 1 : 0;
      if (bd !== ad) return bd - ad;

      return Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
    });
  }

  const currencyDecimalsByCode = await loadCurrencyDecimals({
    sb: args.sb,
    storeId: args.storeId,
    fallbackCurrency: args.fallbackCurrency,
  });

  return {
    pricingByProductId,
    stockByProductId,
    mediaByProductId,
    variantsByProductId,
    brandById,
    currencyDecimalsByCode,
  };
}

function readProductMetadata(row: ProductBaseRow) {
  const value = row.product_metadata;

  if (Array.isArray(value)) return value[0] ?? null;

  return value ?? null;
}

function resolveProductTitle(product: ProductBaseRow) {
  const meta = readProductMetadata(product);

  return limitText(meta?.title || product.name || "منتج", 150);
}

function resolveProductDescription(product: ProductBaseRow) {
  const meta = readProductMetadata(product);

  const description = limitText(
    meta?.description || product.description || product.name || "منتج",
    5000,
  );

  return description || resolveProductTitle(product);
}

function resolveProductPath(args: {
  mode: SeoUrlMode;
  product: ProductBaseRow;
}) {
  const meta = readProductMetadata(args.product);

  return productUrl({
    mode: args.mode,
    name: s(args.product.name) || "product",
    short_url: meta?.url ?? null,
    public_no: args.product.public_no ?? null,
    id_fallback: args.product.id,
  });
}

function resolveImageUrl(args: {
  baseUrl: string;
  product: ProductBaseRow;
  maps: BulkMaps;
}) {
  const rows = args.maps.mediaByProductId.get(String(args.product.id)) || [];

  const image =
    rows.find((row) => s(row.media_kind).toLowerCase() === "image") ||
    rows[0] ||
    null;

  return makeAbsUrl(args.baseUrl, image?.original_url || image?.thumbnail_url);
}

function variantIsSellable(variant: ProductVariantRow) {
  if (variant.unlimited_quantity) return true;

  const qty = Number(variant.stock_quantity ?? 0);
  return Number.isFinite(qty) && qty > 0;
}

function productIsInStock(args: {
  product: ProductBaseRow;
  maps: BulkMaps;
}) {
  const variants = args.maps.variantsByProductId.get(String(args.product.id)) || [];

  if (variants.length) {
    return variants.some(variantIsSellable);
  }

  const stock = args.maps.stockByProductId.get(String(args.product.id));

  if (!stock) return false;
  if (stock.unlimited_quantity) return true;

  const qty = Number(stock.quantity ?? 0);
  return Number.isFinite(qty) && qty > 0;
}

function resolveVariantForFeed(args: {
  product: ProductBaseRow;
  maps: BulkMaps;
}) {
  const variants = args.maps.variantsByProductId.get(String(args.product.id)) || [];

  if (!variants.length) return null;

  const sellable = variants.filter(variantIsSellable);
  const source = sellable.length ? sellable : variants;

  const sorted = [...source].sort((a, b) => {
    const ap = positiveNumber(a.sale_price) ?? positiveNumber(a.price) ?? 0;
    const bp = positiveNumber(b.sale_price) ?? positiveNumber(b.price) ?? 0;

    if (ap !== bp) return ap - bp;

    const ad = a.is_default ? 1 : 0;
    const bd = b.is_default ? 1 : 0;

    return bd - ad;
  });

  return sorted[0] ?? null;
}

function resolvePrice(args: {
  product: ProductBaseRow;
  maps: BulkMaps;
  fallbackCurrency: string;
}) {
  const pricing = args.maps.pricingByProductId.get(String(args.product.id));
  const variant = resolveVariantForFeed({
    product: args.product,
    maps: args.maps,
  });

  const productRegular = positiveNumber(pricing?.price);
  const productSale = positiveNumber(pricing?.sale_price);

  const variantRegular = positiveNumber(variant?.price);
  const variantSale = positiveNumber(variant?.sale_price);

  const regularPrice = variantRegular ?? productRegular;
  const salePrice = variantSale ?? productSale;

  if (!regularPrice || regularPrice <= 0) return null;

  const hasSale =
    typeof salePrice === "number" && salePrice > 0 && salePrice < regularPrice;

  const currency = normalizeCurrencyCode(pricing?.currency, args.fallbackCurrency);

  return {
    regularPrice,
    salePrice: hasSale ? salePrice : null,
    finalPrice: hasSale ? salePrice : regularPrice,
    currency,
    saleStart: pricing?.sale_start ?? null,
    saleEnd: pricing?.sale_end ?? null,
  };
}

function formatMoney(args: {
  amount: number;
  currency: string;
  maps: BulkMaps;
}) {
  const code = normalizeCurrencyCode(args.currency, "SAR");
  const decimals = args.maps.currencyDecimalsByCode.get(code) ?? 2;

  return `${Number(args.amount).toFixed(decimals)} ${code}`;
}

function resolveBrand(args: {
  product: ProductBaseRow;
  maps: BulkMaps;
  config: FeedConfig;
}) {
  const brand = args.product.brand_id
    ? args.maps.brandById.get(String(args.product.brand_id))
    : null;

  return s(brand?.name) || args.config.defaultBrand;
}

function resolveIdentifier(args: {
  product: ProductBaseRow;
  maps: BulkMaps;
}) {
  const variant = resolveVariantForFeed({
    product: args.product,
    maps: args.maps,
  });

  const meta = safeObject(args.product.metadata);

  const gtin = s(
    variant?.gtin ||
      variant?.barcode ||
      meta.gtin ||
      meta.barcode ||
      meta.ean ||
      meta.upc,
  );

  const mpn = s(variant?.mpn || variant?.sku || meta.mpn || meta.sku);

  return {
    gtin,
    mpn,
  };
}

function buildItemXml(args: {
  baseUrl: string;
  storeName: string;
  mode: SeoUrlMode;
  product: ProductBaseRow;
  maps: BulkMaps;
  config: FeedConfig;
  fallbackCurrency: string;
}) {
  const title = resolveProductTitle(args.product);
  const description = resolveProductDescription(args.product);
  const path = resolveProductPath({
    mode: args.mode,
    product: args.product,
  });

  const link = makeAbsUrl(args.baseUrl, path);
  const imageLink = resolveImageUrl({
    baseUrl: args.baseUrl,
    product: args.product,
    maps: args.maps,
  });

  const price = resolvePrice({
    product: args.product,
    maps: args.maps,
    fallbackCurrency: args.fallbackCurrency,
  });

  if (!title || !link || !imageLink || !price) return "";

  const inStock = productIsInStock({
    product: args.product,
    maps: args.maps,
  });

  if (!inStock && !args.config.includeOutOfStock) return "";

  const brand = resolveBrand({
    product: args.product,
    maps: args.maps,
    config: args.config,
  });

  const identifiers = resolveIdentifier({
    product: args.product,
    maps: args.maps,
  });

  const id = s(args.product.id);
  const availability = inStock ? "in_stock" : "out_of_stock";

  const rows = [
    "    <item>",
    `      <g:id>${escapeXml(id)}</g:id>`,
    `      <title>${escapeXml(title)}</title>`,
    `      <description>${escapeXml(description)}</description>`,
    `      <link>${escapeXml(link)}</link>`,
    `      <g:image_link>${escapeXml(imageLink)}</g:image_link>`,
    `      <g:availability>${escapeXml(availability)}</g:availability>`,
    `      <g:price>${escapeXml(
      formatMoney({
        amount: price.regularPrice,
        currency: price.currency,
        maps: args.maps,
      }),
    )}</g:price>`,
    price.salePrice
      ? `      <g:sale_price>${escapeXml(
          formatMoney({
            amount: price.salePrice,
            currency: price.currency,
            maps: args.maps,
          }),
        )}</g:sale_price>`
      : "",
    `      <g:condition>${escapeXml(args.config.defaultCondition)}</g:condition>`,
    brand ? `      <g:brand>${escapeXml(brand)}</g:brand>` : "",
    identifiers.gtin ? `      <g:gtin>${escapeXml(identifiers.gtin)}</g:gtin>` : "",
    identifiers.mpn ? `      <g:mpn>${escapeXml(identifiers.mpn)}</g:mpn>` : "",
    !identifiers.gtin && !identifiers.mpn && !brand
      ? `      <g:identifier_exists>false</g:identifier_exists>`
      : "",
    args.config.shippingPrice !== null
      ? [
          "      <g:shipping>",
          `        <g:country>${escapeXml(args.config.targetCountry)}</g:country>`,
          args.config.shippingServiceName
            ? `        <g:service>${escapeXml(args.config.shippingServiceName)}</g:service>`
            : "",
          `        <g:price>${escapeXml(
            formatMoney({
              amount: args.config.shippingPrice,
              currency: price.currency,
              maps: args.maps,
            }),
          )}</g:price>`,
          "      </g:shipping>",
        ]
          .filter(Boolean)
          .join("\n")
      : "",
    "    </item>",
  ];

  return rows.filter(Boolean).join("\n");
}

function buildFeedXml(args: {
  baseUrl: string;
  storeName: string;
  items: string[];
}) {
  const cleanBase = args.baseUrl.replace(/\/+$/, "");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:g="${GOOGLE_NS}">`,
    `  <channel>`,
    `    <title>${escapeXml(args.storeName)} - Google Merchant Feed</title>`,
    `    <link>${escapeXml(cleanBase)}</link>`,
    `    <description>${escapeXml(
      `فيد منتجات ${args.storeName} لـ Google Merchant Center`,
    )}</description>`,
    ...args.items,
    `  </channel>`,
    `</rss>`,
  ].join("\n");
}

export async function GET(request: NextRequest) {
  const ctx = await resolveStoreContext();

  if (!ctx.store?.id) {
    return disabledFeedResponse("Store not found", 404);
  }

  const storeId = String(ctx.store.id);
  const baseUrl = getRequestBaseUrl(request);
  const storeName = s(ctx.store.name) || "Store";
  const fallbackCurrency = normalizeCurrencyCode(
    ctx.store.default_currency,
    "SAR",
  );

  const config = await loadGoogleMerchantConfig(storeId);

  if (!config.feedEnabled) {
    return disabledFeedResponse("Google Merchant feed is disabled", 404);
  }

  const [mode, products] = await Promise.all([
    loadSeoUrlMode(storeId),
    loadProducts(storeId),
  ]);

  if (!products.length) {
    return responseXml(
      buildFeedXml({
        baseUrl,
        storeName,
        items: [],
      }),
    );
  }

  const sb = await getStoreDb(storeId);

  const maps = await loadBulkMaps({
    sb,
    storeId,
    products,
    fallbackCurrency,
  });

  const items = products
    .map((product) =>
      buildItemXml({
        baseUrl,
        storeName,
        mode,
        product,
        maps,
        config,
        fallbackCurrency,
      }),
    )
    .filter(Boolean);

  return responseXml(
    buildFeedXml({
      baseUrl,
      storeName,
      items,
    }),
  );
}