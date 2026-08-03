// FILE: apps/storefront/src/app/(store)/api/account/favorites/route.ts

import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

import { getStoreDb } from "@/data/db/store-db.server";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { verifySession } from "@/lib/auth/session";
import { isProductVisibleInWeb } from "@/data/catalog/products";
import { getSeoUrlMode, type SeoUrlMode } from "@/data/store/settings";
import { buildProductHrefFromRecord } from "@/lib/seo/build-store-href";

const AUTH_COOKIE = "elyaia_session";
const FAVORITES_SESSION_COOKIE = "elyaia_favorites_session";
const FAVORITES_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

type Owner = {
  customerId: string | null;
  sessionId: string;
  shouldSetSessionCookie: boolean;
};

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

function s(value: any) {
  return String(value ?? "").trim();
}

function toNumber(value: any): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
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

async function fetchStoreCurrenciesForRuntime(sb: any, storeId: string) {
  const res = await sb
    .from("store_currencies")
    .select(
      "currency_code,name_ar,name_en,symbol,decimal_digits,is_enabled,is_default,sort_order,metadata",
    )
    .eq("store_id", storeId)
    .eq("is_enabled", true)
    .order("is_default", { ascending: false })
    .order("sort_order", { ascending: true });

  if (res.error) throw new Error(res.error.message);

  return Array.isArray(res.data) ? res.data : [];
}

function buildCurrencyRuntime(rows: any[], fallbackCode: string) {
  const fallback = cleanCurrencyCode(fallbackCode, "SAR");

  const list: CurrencyRuntimeRow[] = (Array.isArray(rows) ? rows : [])
    .map((row: any) => {
      const code = cleanCurrencyCode(row?.currency_code || row?.code);
      if (!code) return null;

      return {
        code,
        symbol: s(row?.symbol) || code,
        decimal_digits: clampDecimals(row?.decimal_digits),
        rate: readCurrencyRateFromMetadata(row?.metadata),
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
  fallbackInfo?: any;
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

function buildCurrencyPayload(currencyInfo: {
  code: string;
  symbol: string;
  decimal_digits: number;
  name_ar?: string | null;
  name_en?: string | null;
}) {
  const code = cleanCurrencyCode(currencyInfo?.code, "SAR");
  const symbol = s(currencyInfo?.symbol) || code;
  const decimalDigits = clampDecimals(currencyInfo?.decimal_digits);

  const storeCurrency = {
    code,
    currency_code: code,
    symbol,
    decimal_digits: decimalDigits,
    decimalDigits,
    name_ar: currencyInfo?.name_ar ?? null,
    name_en: currencyInfo?.name_en ?? null,
  };

  return {
    currency: code,
    currency_code: code,
    currencyCode: code,

    currency_symbol: symbol,
    currencySymbol: symbol,
    symbol,

    currency_decimals: decimalDigits,
    currencyDecimals: decimalDigits,
    decimal_digits: decimalDigits,
    decimalDigits,

    store_currency: storeCurrency,
    storeCurrency,
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
  const n = Number(args.amount ?? 0);
  if (!Number.isFinite(n) || n <= 0) return null;

  return convertMoney({
    amount: n,
    sourceCode: args.sourceCode,
    targetCode: args.targetCurrency,
    runtime: args.currencyRuntime,
  });
}

function noStoreJson(data: any, status = 200, owner?: Owner) {
  const res = NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });

  if (owner?.shouldSetSessionCookie && owner.sessionId) {
    res.cookies.set(FAVORITES_SESSION_COOKIE, owner.sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: FAVORITES_COOKIE_MAX_AGE,
    });
  }

  return res;
}

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function readJson(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

async function resolveOwner(): Promise<Owner> {
  const cookieStore = await cookies();

  const existingSessionId = s(cookieStore.get(FAVORITES_SESSION_COOKIE)?.value);

  const sessionId = existingSessionId || createSessionId();

  const token = cookieStore.get(AUTH_COOKIE)?.value;
  let customerId: string | null = null;

  if (token) {
    try {
      const payload: any = await verifySession(token);
      customerId = s(payload?.customer_id) || null;
    } catch {
      customerId = null;
    }
  }

  return {
    customerId,
    sessionId,
    shouldSetSessionCookie: !existingSessionId,
  };
}

function applyOwnerFilter(query: any, owner: Owner) {
  if (owner.customerId) {
    return query.eq("customer_id", owner.customerId);
  }

  return query.is("customer_id", null).eq("session_id", owner.sessionId);
}

async function mergeSessionFavorites(args: {
  sb: any;
  storeId: string;
  owner: Owner;
}) {
  const { sb, storeId, owner } = args;

  if (!owner.customerId || !owner.sessionId) return;

  const sessionR = await sb
    .from("customer_favorites")
    .select("product_id")
    .eq("store_id", storeId)
    .is("customer_id", null)
    .eq("session_id", owner.sessionId);

  const sessionRows = Array.isArray(sessionR.data) ? sessionR.data : [];
  if (!sessionRows.length) return;

  for (const row of sessionRows) {
    const productId = s(row?.product_id);
    if (!productId) continue;

    const insertR = await sb.from("customer_favorites").insert({
      store_id: storeId,
      customer_id: owner.customerId,
      session_id: null,
      product_id: productId,
    });

    if (insertR.error && insertR.error.code !== "23505") {
      continue;
    }
  }

  await sb
    .from("customer_favorites")
    .delete()
    .eq("store_id", storeId)
    .is("customer_id", null)
    .eq("session_id", owner.sessionId);
}

async function loadFavoriteRows(args: {
  sb: any;
  storeId: string;
  owner: Owner;
}) {
  const base = args.sb
    .from("customer_favorites")
    .select("id,product_id,created_at")
    .eq("store_id", args.storeId)
    .order("created_at", { ascending: false });

  const r = await applyOwnerFilter(base, args.owner);

  if (r.error || !Array.isArray(r.data)) return [];

  return r.data;
}

function productHref(product: any, seoMode: SeoUrlMode) {
  return buildProductHrefFromRecord({
    mode: seoMode,
    product,
    fallbackHref: "#",
  });
}

async function hydrateFavorites(args: {
  sb: any;
  storeId: string;
  ctx: any;
  seoMode: SeoUrlMode;
  favorites: any[];
}) {
  const { sb, storeId, ctx, seoMode, favorites } = args;

  const productIds = Array.from(
    new Set(favorites.map((row) => s(row?.product_id)).filter(Boolean)),
  );

  if (!productIds.length) return [];

  const [selectedCookieCurrency, currencyRows] = await Promise.all([
    readSelectedCurrencyCodeFromCookies(),
    fetchStoreCurrenciesForRuntime(sb, storeId),
  ]);

  const ctxDefaultCurrency =
    cleanCurrencyCode(
      ctx?.store?.default_currency ??
        ctx?.store?.currency ??
        ctx?.store?.currency_code,
      "",
    ) || "SAR";

  const currencyRuntime = buildCurrencyRuntime(currencyRows, ctxDefaultCurrency);

  const targetCurrency = resolveTargetCurrencyCode({
    selectedCode: selectedCookieCurrency,
    fallbackCode: currencyRuntime.defaultCode,
    runtime: currencyRuntime,
  });

  const currencyInfo = currencyInfoFromRuntime({
    code: targetCurrency,
    runtime: currencyRuntime,
  });

  const currencyPayload = buildCurrencyPayload(currencyInfo);

  const [productsR, mediaR, pricingR, stockR, optionsR, variantsR] =
    await Promise.all([
      sb
        .from("products")
        .select(
          "id,store_id,product_type,name,description,status,brand_id,require_shipping,metadata,created_at,updated_at,public_no",
        )
        .eq("store_id", storeId)
        .in("id", productIds),

      sb
        .from("product_media")
        .select(
          "id,product_id,media_kind,original_url,thumbnail_url,alt,video_url,is_default,sort_order,created_at",
        )
        .eq("store_id", storeId)
        .in("product_id", productIds)
        .order("is_default", { ascending: false })
        .order("sort_order", { ascending: true }),

      sb
        .from("product_pricing")
        .select(
          "product_id,currency,price,sale_price,cost_price,sale_start,sale_end,with_tax,tax_reason_code",
        )
        .in("product_id", productIds),

      sb
        .from("product_stock")
        .select(
          "product_id,quantity,unlimited_quantity,hide_quantity,maximum_quantity_per_order,notify_low",
        )
        .in("product_id", productIds),

      sb
        .from("product_options")
        .select(
          "id,product_id,name,is_required,option_field_type,display_type,sort_order",
        )
        .in("product_id", productIds)
        .order("sort_order", { ascending: true }),

      sb
        .from("product_variants")
        .select(
          "id,product_id,sku,barcode,mpn,gtin,price,sale_price,cost_price,stock_quantity,unlimited_quantity,notify_low,weight,weight_unit,is_default,created_at",
        )
        .in("product_id", productIds)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true }),
    ]);

  const products = Array.isArray(productsR.data) ? productsR.data : [];
  const media = Array.isArray(mediaR.data) ? mediaR.data : [];
  const pricing = Array.isArray(pricingR.data) ? pricingR.data : [];
  const stock = Array.isArray(stockR.data) ? stockR.data : [];
  const options = Array.isArray(optionsR.data) ? optionsR.data : [];
  const variants = Array.isArray(variantsR.data) ? variantsR.data : [];

  const optionIds = options.map((row: any) => s(row?.id)).filter(Boolean);
  const variantIds = variants.map((row: any) => s(row?.id)).filter(Boolean);

  const [optionValuesR, variantLinksR] = await Promise.all([
    optionIds.length
      ? sb
          .from("product_option_values")
          .select(
            "id,option_id,name,extra_price,quantity,is_default,display_value,image_url,sort_order",
          )
          .in("option_id", optionIds)
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: [] }),

    variantIds.length
      ? sb
          .from("variant_option_values")
          .select("variant_id,option_value_id")
          .in("variant_id", variantIds)
      : Promise.resolve({ data: [] }),
  ]);

  const optionValues = Array.isArray(optionValuesR.data)
    ? optionValuesR.data
    : [];

  const variantLinks = Array.isArray(variantLinksR.data)
    ? variantLinksR.data
    : [];

  const brandIds = Array.from(
    new Set(products.map((row: any) => s(row?.brand_id)).filter(Boolean)),
  );

  const brandsR = brandIds.length
    ? await sb
        .from("brands")
        .select("id,name,logo_url,banner_url,description,metadata")
        .eq("store_id", storeId)
        .in("id", brandIds)
    : { data: [] };

  const brands = Array.isArray(brandsR.data) ? brandsR.data : [];

  const mediaByProduct = new Map<string, any[]>();
  for (const row of media) {
    const key = s(row?.product_id);
    if (!key) continue;

    if (!mediaByProduct.has(key)) mediaByProduct.set(key, []);
    mediaByProduct.get(key)!.push(row);
  }

  const pricingByProduct = new Map<string, any>();
  for (const row of pricing) {
    const key = s(row?.product_id);
    if (key) pricingByProduct.set(key, row);
  }

  const stockByProduct = new Map<string, any>();
  for (const row of stock) {
    const key = s(row?.product_id);
    if (key) stockByProduct.set(key, row);
  }

  const optionsByProduct = new Map<string, any[]>();
  for (const row of options) {
    const key = s(row?.product_id);
    if (!key) continue;

    if (!optionsByProduct.has(key)) optionsByProduct.set(key, []);
    optionsByProduct.get(key)!.push(row);
  }

  const valuesByOption = new Map<string, any[]>();
  const optionValueById = new Map<string, any>();

  for (const row of optionValues) {
    const key = s(row?.option_id);
    const id = s(row?.id);

    if (id) optionValueById.set(id, row);
    if (!key) continue;

    if (!valuesByOption.has(key)) valuesByOption.set(key, []);
    valuesByOption.get(key)!.push(row);
  }

  const variantsByProduct = new Map<string, any[]>();
  for (const row of variants) {
    const key = s(row?.product_id);
    if (!key) continue;

    if (!variantsByProduct.has(key)) variantsByProduct.set(key, []);
    variantsByProduct.get(key)!.push(row);
  }

  const linksByVariant = new Map<string, any[]>();
  for (const row of variantLinks) {
    const key = s(row?.variant_id);
    if (!key) continue;

    if (!linksByVariant.has(key)) linksByVariant.set(key, []);
    linksByVariant.get(key)!.push(row);
  }

  const brandById = new Map<string, any>();
  for (const row of brands) {
    const id = s(row?.id);
    if (id) brandById.set(id, row);
  }

  const productById = new Map<string, any>();

  for (const product of products) {
    const productId = s(product?.id);
    if (!productId) continue;

    const visible = isProductVisibleInWeb({
      status: product?.status,
      metadata: product?.metadata ?? {},
    });

    if (!visible) continue;

    const pricingRow = pricingByProduct.get(productId) || null;
    const pricingSourceCode = readPricingCurrency(
      pricingRow,
      currencyRuntime.defaultCode,
    );

    const convertedPricing = pricingRow
      ? {
          ...pricingRow,

          price: convertNullablePrice({
            amount: pricingRow?.price,
            sourceCode: pricingSourceCode,
            targetCurrency: currencyInfo.code,
            currencyRuntime,
          }),

          sale_price: convertNullablePrice({
            amount: pricingRow?.sale_price,
            sourceCode: pricingSourceCode,
            targetCurrency: currencyInfo.code,
            currencyRuntime,
          }),

          cost_price: convertNullablePrice({
            amount: pricingRow?.cost_price,
            sourceCode: pricingSourceCode,
            targetCurrency: currencyInfo.code,
            currencyRuntime,
          }),

          ...currencyPayload,
        }
      : null;

    const productOptions = (optionsByProduct.get(productId) || []).map(
      (option) => ({
        ...option,
        values: (valuesByOption.get(s(option?.id)) || []).map((value) => ({
          ...value,
          extra_price: convertNullablePrice({
            amount: value?.extra_price,
            sourceCode: pricingSourceCode,
            targetCurrency: currencyInfo.code,
            currencyRuntime,
          }),
          ...currencyPayload,
        })),
      }),
    );

    const productVariants = (variantsByProduct.get(productId) || []).map(
      (variant) => {
        const links = linksByVariant.get(s(variant?.id)) || [];
        const option_value_ids = links
          .map((link) => s(link?.option_value_id))
          .filter(Boolean);

        return {
          ...variant,

          price: convertNullablePrice({
            amount: variant?.price,
            sourceCode: pricingSourceCode,
            targetCurrency: currencyInfo.code,
            currencyRuntime,
          }),

          sale_price: convertNullablePrice({
            amount: variant?.sale_price,
            sourceCode: pricingSourceCode,
            targetCurrency: currencyInfo.code,
            currencyRuntime,
          }),

          cost_price: convertNullablePrice({
            amount: variant?.cost_price,
            sourceCode: pricingSourceCode,
            targetCurrency: currencyInfo.code,
            currencyRuntime,
          }),

          ...currencyPayload,

          option_value_ids,
          option_values: option_value_ids
            .map((id) => optionValueById.get(id))
            .filter(Boolean),
        };
      },
    );

    const productMeta =
      product?.metadata && typeof product.metadata === "object"
        ? product.metadata
        : {};

    const fullProduct = {
      ...product,

      ...currencyPayload,

      price: convertedPricing?.price ?? null,
      sale_price: convertedPricing?.sale_price ?? null,

      href: productHref(product, seoMode),
      media: mediaByProduct.get(productId) || [],
      pricing: convertedPricing,
      product_pricing: convertedPricing,
      stock: stockByProduct.get(productId) || null,
      brand: brandById.get(s(product?.brand_id)) || null,
      options: productOptions,
      variants: productVariants,

      metadata: {
        ...productMeta,
        ...currencyPayload,
      },
    };

    productById.set(productId, fullProduct);
  }

  return favorites
    .map((favorite) => {
      const productId = s(favorite?.product_id);
      const product = productById.get(productId);

      if (!product) return null;

      return {
        id: favorite.id,
        favorite_id: favorite.id,
        product_id: productId,
        created_at: favorite.created_at,
        href: product.href,
        product,
      };
    })
    .filter(Boolean);
}

async function findFavorite(args: {
  sb: any;
  storeId: string;
  owner: Owner;
  productId: string;
}) {
  const base = args.sb
    .from("customer_favorites")
    .select("id,product_id,created_at")
    .eq("store_id", args.storeId)
    .eq("product_id", args.productId)
    .limit(1);

  const r = await applyOwnerFilter(base, args.owner);

  if (r.error || !Array.isArray(r.data) || !r.data.length) return null;

  return r.data[0];
}

async function productExists(args: {
  sb: any;
  storeId: string;
  productId: string;
}) {
  const r = await args.sb
    .from("products")
    .select("id,status,metadata")
    .eq("store_id", args.storeId)
    .eq("id", args.productId)
    .maybeSingle();

  if (r.error || !r.data) return false;

  return isProductVisibleInWeb({
    status: r.data.status,
    metadata: r.data.metadata ?? {},
  });
}

export async function GET() {
  const ctx = await resolveStoreContext();

  if (!ctx.store) {
    return noStoreJson({ ok: false, items: [], ids: [] }, 404);
  }

  const storeId = ctx.store.id;
  const sb: any = await getStoreDb(storeId);
  const owner = await resolveOwner();
  const seoMode = await getSeoUrlMode(storeId).catch(
    () => "named_ar" as SeoUrlMode,
  );

  await mergeSessionFavorites({
    sb,
    storeId,
    owner,
  });

  const favorites = await loadFavoriteRows({
    sb,
    storeId,
    owner,
  });

  const items = await hydrateFavorites({
    sb,
    storeId,
    ctx,
    seoMode,
    favorites,
  });

  return noStoreJson(
    {
      ok: true,
      authed: Boolean(owner.customerId),
      items,
      ids: items.map((item: any) => item.product_id).filter(Boolean),
      product_ids: items.map((item: any) => item.product_id).filter(Boolean),
    },
    200,
    owner,
  );
}

export async function POST(req: NextRequest) {
  const ctx = await resolveStoreContext();

  if (!ctx.store) {
    return noStoreJson({ ok: false, error: "STORE_NOT_FOUND" }, 404);
  }

  const storeId = ctx.store.id;
  const body = await readJson(req);
  const productId =
    s(body?.product_id) ||
    s(body?.productId) ||
    s(body?.id) ||
    s(req.nextUrl.searchParams.get("product_id"));

  if (!productId) {
    return noStoreJson({ ok: false, error: "PRODUCT_ID_REQUIRED" }, 400);
  }

  const sb: any = await getStoreDb(storeId);
  const owner = await resolveOwner();

  await mergeSessionFavorites({
    sb,
    storeId,
    owner,
  });

  const exists = await productExists({
    sb,
    storeId,
    productId,
  });

  if (!exists) {
    return noStoreJson({ ok: false, error: "PRODUCT_NOT_FOUND" }, 404, owner);
  }

  const current = await findFavorite({
    sb,
    storeId,
    owner,
    productId,
  });

  if (current?.id) {
    return noStoreJson(
      {
        ok: true,
        favorited: true,
        product_id: productId,
        favorite_id: current.id,
      },
      200,
      owner,
    );
  }

  const payload = owner.customerId
    ? {
        store_id: storeId,
        customer_id: owner.customerId,
        session_id: null,
        product_id: productId,
      }
    : {
        store_id: storeId,
        customer_id: null,
        session_id: owner.sessionId,
        product_id: productId,
      };

  const insertR = await sb
    .from("customer_favorites")
    .insert(payload)
    .select("id")
    .maybeSingle();

  if (insertR.error && insertR.error.code !== "23505") {
    return noStoreJson(
      { ok: false, error: "FAVORITE_CREATE_FAILED" },
      500,
      owner,
    );
  }

  const favoriteId =
    s(insertR.data?.id) ||
    s(
      (
        await findFavorite({
          sb,
          storeId,
          owner,
          productId,
        })
      )?.id,
    ) ||
    null;

  return noStoreJson(
    {
      ok: true,
      favorited: true,
      product_id: productId,
      favorite_id: favoriteId,
    },
    200,
    owner,
  );
}

export async function DELETE(req: NextRequest) {
  const ctx = await resolveStoreContext();

  if (!ctx.store) {
    return noStoreJson({ ok: false, error: "STORE_NOT_FOUND" }, 404);
  }

  const storeId = ctx.store.id;
  const body = await readJson(req);
  const productId =
    s(req.nextUrl.searchParams.get("product_id")) ||
    s(body?.product_id) ||
    s(body?.productId) ||
    s(body?.id);

  if (!productId) {
    return noStoreJson({ ok: false, error: "PRODUCT_ID_REQUIRED" }, 400);
  }

  const sb: any = await getStoreDb(storeId);
  const owner = await resolveOwner();

  const base = sb
    .from("customer_favorites")
    .delete()
    .eq("store_id", storeId)
    .eq("product_id", productId);

  const r = await applyOwnerFilter(base, owner);

  if (r.error) {
    return noStoreJson(
      { ok: false, error: "FAVORITE_DELETE_FAILED" },
      500,
      owner,
    );
  }

  return noStoreJson(
    {
      ok: true,
      favorited: false,
      product_id: productId,
    },
    200,
    owner,
  );
}
