// FILE: apps/storefront/src/app/(store)/api/checkout/shipping/options/route.ts

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { controlDb } from "@/data/db/control-db.server";
import { getOrdersDb } from "@/data/db/orders-db.server";
import { getStoreDb } from "@/data/db/store-db.server";
import { verifySession } from "@/lib/auth/session";
import {
  cartSessionCookie,
  getCartSessionId,
  getStoreIdOrThrow,
} from "../../../_cart/cart.server";

export const dynamic = "force-dynamic";

const SESSION_COOKIE = "elyaia_session";

function s(value: unknown) {
  return String(value ?? "").trim();
}

function n(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function round2(value: number) {
  return Math.round(Number(value || 0) * 100) / 100;
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

function cleanCurrencyCode(value: any, fallback = "") {
  const code = String(value ?? "").trim().toUpperCase();
  return code || fallback;
}

function clampDecimals(value: any, fallback = 2) {
  const num = Number(value ?? fallback);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(4, Math.floor(num)));
}

function positiveRate(value: any, fallback = 1) {
  const num = Number(value ?? fallback);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

function uniqStrings(values: any[]) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => s(value))
        .filter(Boolean),
    ),
  );
}

function hasIntersection(a: string[], b: string[]) {
  if (!a.length || !b.length) return false;

  const set = new Set(a.map(String));
  return b.some((value) => set.has(String(value)));
}

function jsonError(error: string, status = 400, extra?: any) {
  return NextResponse.json(
    {
      ok: false,
      error,
      ...(extra ? { extra } : {}),
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function setCartCookie(response: NextResponse, sessionId: string) {
  const sid = s(sessionId);
  if (!sid) return response;

  const c = cartSessionCookie(sid);

  response.cookies.set(c.name, c.value, {
    httpOnly: c.httpOnly,
    sameSite: c.sameSite,
    path: c.path,
    secure: c.secure,
    maxAge: c.maxAge,
  });

  return response;
}

function jsonOk(payload: Record<string, any>, sessionId: string) {
  const response = NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });

  return setCartCookie(response, sessionId);
}

type CurrencyRuntimeRow = {
  code: string;
  symbol: string;
  decimal_digits: number;
  rate: number;
  is_default: boolean;
  enabled: boolean;
};

type ShippingOption = {
  id: string;
  name: string;
  eta: string;
  price: string;
  recommended?: boolean;
  cod?: boolean;
  cod_fee?: string | null;

  price_amount?: number;
  original_price?: string | null;
  original_price_amount?: number | null;

  free_shipping_applied?: boolean;
  free_shipping_source?: "coupon" | "rule" | null;
  free_shipping_rule_id?: string | null;
  free_shipping_rule_name?: string | null;
  price_label?: string | null;

  shipping_kind?: "rate" | "pickup_point";
  carrier_type?: "platform" | "courier" | "pickup" | string;
  store_shipping_carrier_id?: string | null;

  pickup_point_id?: string | null;
  pickup_point_title?: string | null;
  pickup_point_address?: string | null;
  pickup_point_city_id?: string | null;
  pickup_point_city_name?: string | null;
  pickup_point_map_url?: string | null;
  pickup_point_phone?: string | null;
  pickup_point_notes?: string | null;
};

type FreeShippingRule = {
  id: string;
  name: string;
  enabled: boolean;
  minimum_subtotal: number;

  countries_mode: "all" | "include";
  cities_mode: "all" | "include";
  products_mode: "all" | "include";
  categories_mode: "all" | "include";
  carriers_mode: "all" | "include";
  customer_groups_mode: "all" | "include";

  starts_at: string | null;
  ends_at: string | null;
  priority: number;
};

type FreeShippingContext = {
  rules: FreeShippingRule[];

  countryLinks: Map<string, string[]>;
  cityLinks: Map<string, string[]>;
  productLinks: Map<string, string[]>;
  categoryLinks: Map<string, string[]>;
  carrierLinks: Map<string, string[]>;
  groupLinks: Map<string, string[]>;

  customerGroupIds: string[];
};

type FreeShippingMatch = {
  applied: boolean;
  source: "coupon" | "rule" | null;
  ruleId: string | null;
  ruleName: string | null;
};

async function getCheckoutCustomerId(args: { sb: any; store_id: string }) {
  try {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value || "";

    if (!token) {
      return {
        ok: false as const,
        status: 401,
        error: "LOGIN_REQUIRED",
      };
    }

    const payload: any = await Promise.resolve(verifySession(token) as any);
    const customerId = payload?.customer_id ? String(payload.customer_id) : "";

    if (!customerId) {
      return {
        ok: false as const,
        status: 401,
        error: "LOGIN_REQUIRED",
      };
    }

    const linkR: any = await args.sb
      .from("store_customers")
      .select("store_id,customer_id")
      .eq("store_id", args.store_id)
      .eq("customer_id", customerId)
      .limit(1)
      .maybeSingle();

    if (linkR.error) {
      return {
        ok: false as const,
        status: 500,
        error: linkR.error.message,
      };
    }

    if (!linkR.data?.customer_id) {
      return {
        ok: false as const,
        status: 401,
        error: "LOGIN_REQUIRED",
      };
    }

    return {
      ok: true as const,
      customer_id: customerId,
    };
  } catch {
    return {
      ok: false as const,
      status: 401,
      error: "LOGIN_REQUIRED",
    };
  }
}

async function getCheckoutCart(args: {
  sb: any;
  store_id: string;
  customer_id: string;
}) {
  return await args.sb
    .from("carts")
    .select("id,address_id,currency,user_id,status")
    .eq("store_id", args.store_id)
    .eq("user_id", args.customer_id)
    .eq("status", "open")
    .order("last_activity_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
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
  const selects = [
    "currency_code,symbol,decimal_digits,is_default,is_enabled,metadata",
    "currency_code,symbol,decimal_digits,is_default,is_enabled",
    "currency_code,symbol,decimal_digits,metadata",
  ];

  let lastError: any = null;

  for (const select of selects) {
    const res: any = await sb
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

function readCurrencyRateFromMetadata(metadata: any) {
  const meta = safeObject(metadata);

  return positiveRate(
    meta?.rate ??
      meta?.exchange_rate ??
      meta?.exchangeRate ??
      meta?.conversion_rate ??
      meta?.conversionRate ??
      meta?.rate_to_default ??
      meta?.rateToDefault ??
      meta?.value ??
      meta?.amount,
    1,
  );
}

function buildCurrencyRuntime(rows: any[], fallbackCode: string) {
  const fallback = cleanCurrencyCode(fallbackCode, "SAR");

  const list: CurrencyRuntimeRow[] = (Array.isArray(rows) ? rows : [])
    .map((row: any) => {
      const code = cleanCurrencyCode(row?.currency_code || row?.code);
      if (!code) return null;

      const metadata = safeObject(row?.metadata);

      return {
        code,
        symbol: s(row?.symbol) || code,
        decimal_digits: clampDecimals(row?.decimal_digits, 2),
        rate: positiveRate(
          row?.rate ??
            row?.exchange_rate ??
            row?.exchangeRate ??
            row?.conversion_rate ??
            row?.conversionRate ??
            row?.rate_to_default ??
            row?.rateToDefault ??
            row?.value ??
            metadata.rate ??
            metadata.exchange_rate ??
            metadata.exchangeRate ??
            metadata.conversion_rate ??
            metadata.conversionRate ??
            metadata.rate_to_default ??
            metadata.rateToDefault ??
            metadata.value ??
            metadata.amount,
          readCurrencyRateFromMetadata(metadata),
        ),
        is_default: Boolean(row?.is_default),
        enabled: row?.is_enabled !== false && row?.enabled !== false,
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
}) {
  const code = cleanCurrencyCode(args.code, args.runtime.defaultCode);
  const row = args.runtime.map.get(code);

  if (row) {
    return {
      code: row.code,
      symbol: row.symbol || row.code,
      decimal_digits: clampDecimals(row.decimal_digits, 2),
    };
  }

  return {
    code,
    symbol: code,
    decimal_digits: 2,
  };
}

function convertMoney(args: {
  amount: any;
  sourceCode: any;
  targetCode: any;
  runtime: ReturnType<typeof buildCurrencyRuntime>;
}) {
  const amount = n(args.amount);
  if (!(amount > 0)) return 0;

  const defaultCode = args.runtime.defaultCode;
  const sourceCode = cleanCurrencyCode(args.sourceCode, defaultCode);
  const targetCode = cleanCurrencyCode(args.targetCode, defaultCode);

  const source =
    args.runtime.map.get(sourceCode) || args.runtime.map.get(defaultCode);

  const target =
    args.runtime.map.get(targetCode) || args.runtime.map.get(defaultCode);

  if (!source || !target) return amount;
  if (source.code === target.code) return amount;

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

function formatMoney(args: {
  amount: number;
  code: string;
  symbol: string;
  decimals: number;
}) {
  const value = round2(Math.max(0, n(args.amount)));
  const decimals = clampDecimals(args.decimals, 2);

  const formatted =
    decimals === 0
      ? String(Math.round(value))
      : value.toLocaleString("en-US", {
          minimumFractionDigits: 0,
          maximumFractionDigits: decimals,
        });

  return `${args.symbol || args.code} ${formatted}`;
}

function pickByCityScope(rate: any, cityId: string) {
  const scope = s(rate?.scope);

  const included: string[] = Array.isArray(rate?.included_city_ids)
    ? rate.included_city_ids.map((x: any) => String(x))
    : [];

  const excluded: string[] = Array.isArray(rate?.excluded_city_ids)
    ? rate.excluded_city_ids.map((x: any) => String(x))
    : [];

  if (cityId && excluded.includes(cityId)) return false;
  if (scope === "include_cities") return cityId ? included.includes(cityId) : false;

  return true;
}

async function loadCartProducts(args: {
  sb: any;
  store_id: string;
  cart_id: string;
  targetCurrency: string;
  currencyRuntime: ReturnType<typeof buildCurrencyRuntime>;
}) {
  const itemsR: any = await args.sb
    .from("cart_items")
    .select("product_id,qty,unit_price,currency")
    .eq("store_id", args.store_id)
    .eq("cart_id", args.cart_id);

  if (itemsR.error) {
    return {
      subtotal: 0,
      productIds: [] as string[],
    };
  }

  const rows: any[] = Array.isArray(itemsR.data) ? itemsR.data : [];
  const productIds = uniqStrings(rows.map((row) => row?.product_id));

  const subtotal = round2(
    rows.reduce((sum: number, row: any) => {
      const qty = Math.max(1, Math.floor(n(row?.qty) || 1));
      const sourceCurrency = cleanCurrencyCode(
        row?.currency,
        args.targetCurrency,
      );

      const unit = convertMoney({
        amount: Math.max(0, n(row?.unit_price)),
        sourceCode: sourceCurrency,
        targetCode: args.targetCurrency,
        runtime: args.currencyRuntime,
      });

      return sum + unit * qty;
    }, 0),
  );

  return {
    subtotal,
    productIds,
  };
}

async function loadCategoryIdsForProducts(args: {
  sb: any;
  productIds: string[];
}) {
  if (!args.productIds.length) return [] as string[];

  const [directR, fallbackR]: any[] = await Promise.all([
    args.sb
      .from("product_categories")
      .select("category_id")
      .in("product_id", args.productIds),

    args.sb
      .from("category_products")
      .select("category_id")
      .in("product_id", args.productIds),
  ]);

  return uniqStrings([
    ...(!directR.error && Array.isArray(directR.data)
      ? directR.data.map((row: any) => row?.category_id)
      : []),
    ...(!fallbackR.error && Array.isArray(fallbackR.data)
      ? fallbackR.data.map((row: any) => row?.category_id)
      : []),
  ]);
}

async function hasActiveFreeShippingCoupon(args: {
  ordersDb: any;
  storeDb: any;
  store_id: string;
  cart_id: string;
  subtotal: number;
  targetCurrency: string;
  currencyRuntime: ReturnType<typeof buildCurrencyRuntime>;
}) {
  const ccR: any = await args.ordersDb
    .from("cart_coupons")
    .select("coupon_id")
    .eq("store_id", args.store_id)
    .eq("cart_id", args.cart_id)
    .limit(1)
    .maybeSingle();

  if (ccR.error || !ccR.data?.coupon_id) return false;

  const couponR: any = await args.storeDb
    .from("coupons")
    .select("id,status,start_at,end_at,free_shipping,minimum_amount")
    .eq("id", String(ccR.data.coupon_id))
    .eq("store_id", args.store_id)
    .limit(1)
    .maybeSingle();

  if (couponR.error || !couponR.data?.id) return false;

  const coupon = couponR.data;
  const now = Date.now();

  const active =
    s(coupon.status) === "active" &&
    (!coupon.start_at || Date.parse(String(coupon.start_at)) <= now) &&
    (!coupon.end_at || Date.parse(String(coupon.end_at)) >= now);

  if (!active || coupon.free_shipping !== true) return false;

  const minimumRaw =
    coupon.minimum_amount == null ? null : Math.max(0, n(coupon.minimum_amount));

  if (minimumRaw != null && minimumRaw > 0) {
    const minimum = convertMoney({
      amount: minimumRaw,
      sourceCode: args.currencyRuntime.defaultCode,
      targetCode: args.targetCurrency,
      runtime: args.currencyRuntime,
    });

    if (args.subtotal < minimum) return false;
  }

  return true;
}

async function loadRuleLinks(args: {
  sb: any;
  table: string;
  column: string;
  ruleIds: string[];
}) {
  const out = new Map<string, string[]>();

  if (!args.ruleIds.length) return out;

  const res: any = await args.sb
    .from(args.table)
    .select(`rule_id,${args.column}`)
    .in("rule_id", args.ruleIds);

  if (res.error || !Array.isArray(res.data)) {
    return out;
  }

  for (const row of res.data) {
    const ruleId = s(row?.rule_id);
    const value = s(row?.[args.column]);

    if (!ruleId || !value) continue;

    const list = out.get(ruleId) ?? [];
    list.push(value);
    out.set(ruleId, list);
  }

  return out;
}

async function loadCustomerGroupIds(args: {
  sb: any;
  store_id: string;
  customer_id: string;
}) {
  if (!args.customer_id) return [] as string[];

  const res: any = await args.sb
    .from("customer_group_members")
    .select("group_id,store_id")
    .eq("customer_id", args.customer_id);

  if (res.error || !Array.isArray(res.data)) {
    return [] as string[];
  }

  return uniqStrings(
    res.data
      .filter((row: any) => {
        const rowStoreId = s(row?.store_id);
        return !rowStoreId || rowStoreId === args.store_id;
      })
      .map((row: any) => row?.group_id),
  );
}

function normalizeRule(row: any): FreeShippingRule {
  return {
    id: s(row?.id),
    name: s(row?.name) || "شحن مجاني",
    enabled: row?.enabled !== false,
    minimum_subtotal: Math.max(0, n(row?.minimum_subtotal)),

    countries_mode: s(row?.countries_mode) === "include" ? "include" : "all",
    cities_mode: s(row?.cities_mode) === "include" ? "include" : "all",
    products_mode: s(row?.products_mode) === "include" ? "include" : "all",
    categories_mode: s(row?.categories_mode) === "include" ? "include" : "all",
    carriers_mode: s(row?.carriers_mode) === "include" ? "include" : "all",
    customer_groups_mode:
      s(row?.customer_groups_mode) === "include" ? "include" : "all",

    starts_at: row?.starts_at ?? null,
    ends_at: row?.ends_at ?? null,
    priority: Math.floor(n(row?.priority)),
  };
}

async function loadFreeShippingContext(args: {
  sb: any;
  store_id: string;
  customer_id: string;
}): Promise<FreeShippingContext | null> {
  const rulesR: any = await args.sb
    .from("store_free_shipping_rules")
    .select(
      [
        "id",
        "name",
        "enabled",
        "minimum_subtotal",
        "countries_mode",
        "cities_mode",
        "products_mode",
        "categories_mode",
        "carriers_mode",
        "customer_groups_mode",
        "starts_at",
        "ends_at",
        "priority",
        "created_at",
      ].join(","),
    )
    .eq("store_id", args.store_id)
    .eq("enabled", true)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });

  if (rulesR.error || !Array.isArray(rulesR.data) || !rulesR.data.length) {
    return null;
  }

  const rules = (rulesR.data as any[])
    .map((row) => normalizeRule(row))
    .filter((rule) => Boolean(rule.id && rule.enabled));

  if (!rules.length) return null;

  const ruleIds = rules.map((rule) => rule.id);

  const [
    countryLinks,
    cityLinks,
    productLinks,
    categoryLinks,
    carrierLinks,
    groupLinks,
    customerGroupIds,
  ] = await Promise.all([
    loadRuleLinks({
      sb: args.sb,
      table: "store_free_shipping_rule_countries",
      column: "country_id",
      ruleIds,
    }),

    loadRuleLinks({
      sb: args.sb,
      table: "store_free_shipping_rule_cities",
      column: "city_id",
      ruleIds,
    }),

    loadRuleLinks({
      sb: args.sb,
      table: "store_free_shipping_rule_products",
      column: "product_id",
      ruleIds,
    }),

    loadRuleLinks({
      sb: args.sb,
      table: "store_free_shipping_rule_categories",
      column: "category_id",
      ruleIds,
    }),

    loadRuleLinks({
      sb: args.sb,
      table: "store_free_shipping_rule_carriers",
      column: "store_shipping_carrier_id",
      ruleIds,
    }),

    loadRuleLinks({
      sb: args.sb,
      table: "store_free_shipping_rule_customer_groups",
      column: "customer_group_id",
      ruleIds,
    }),

    loadCustomerGroupIds({
      sb: args.sb,
      store_id: args.store_id,
      customer_id: args.customer_id,
    }),
  ]);

  return {
    rules,
    countryLinks,
    cityLinks,
    productLinks,
    categoryLinks,
    carrierLinks,
    groupLinks,
    customerGroupIds,
  };
}

function dateIsActive(rule: FreeShippingRule) {
  const now = Date.now();

  const start = rule.starts_at ? Date.parse(String(rule.starts_at)) : null;
  const end = rule.ends_at ? Date.parse(String(rule.ends_at)) : null;

  if (start && Number.isFinite(start) && start > now) return false;
  if (end && Number.isFinite(end) && end < now) return false;

  return true;
}

function ruleLinkValues(map: Map<string, string[]>, ruleId: string): string[] {
  return map.get(ruleId) ?? [];
}

function matchModeBySingleValue(args: {
  mode: "all" | "include";
  map: Map<string, string[]>;
  ruleId: string;
  value: string;
}) {
  if (args.mode === "all") return true;

  const values = ruleLinkValues(args.map, args.ruleId);
  if (!values.length) return false;

  return Boolean(args.value && values.includes(args.value));
}

function matchModeByAnyList(args: {
  mode: "all" | "include";
  map: Map<string, string[]>;
  ruleId: string;
  values: string[];
}) {
  if (args.mode === "all") return true;

  const selected = ruleLinkValues(args.map, args.ruleId);
  if (!selected.length) return false;
  if (!args.values.length) return false;

  return hasIntersection(selected, args.values);
}

function evaluateRuleFreeShipping(args: {
  context: FreeShippingContext | null;
  subtotal: number;
  countryId: string;
  cityId: string;
  productIds: string[];
  categoryIds: string[];
  carrierId: string;
  minimumSubtotalToCartCurrency: (amount: number) => number;
}): FreeShippingMatch {
  const context = args.context;

  if (!context?.rules?.length) {
    return {
      applied: false,
      source: null,
      ruleId: null,
      ruleName: null,
    };
  }

  for (const rule of context.rules) {
    if (!rule.enabled) continue;
    if (!dateIsActive(rule)) continue;

    const minimum = round2(
      Math.max(0, args.minimumSubtotalToCartCurrency(rule.minimum_subtotal)),
    );

    if (minimum > 0 && args.subtotal < minimum) continue;

    const countryOk = matchModeBySingleValue({
      mode: rule.countries_mode,
      map: context.countryLinks,
      ruleId: rule.id,
      value: args.countryId,
    });

    if (!countryOk) continue;

    const cityOk = matchModeBySingleValue({
      mode: rule.cities_mode,
      map: context.cityLinks,
      ruleId: rule.id,
      value: args.cityId,
    });

    if (!cityOk) continue;

    const productsOk = matchModeByAnyList({
      mode: rule.products_mode,
      map: context.productLinks,
      ruleId: rule.id,
      values: args.productIds,
    });

    if (!productsOk) continue;

    const categoriesOk = matchModeByAnyList({
      mode: rule.categories_mode,
      map: context.categoryLinks,
      ruleId: rule.id,
      values: args.categoryIds,
    });

    if (!categoriesOk) continue;

    const carrierOk = matchModeBySingleValue({
      mode: rule.carriers_mode,
      map: context.carrierLinks,
      ruleId: rule.id,
      value: args.carrierId,
    });

    if (!carrierOk) continue;

    const customerGroupsOk = matchModeByAnyList({
      mode: rule.customer_groups_mode,
      map: context.groupLinks,
      ruleId: rule.id,
      values: context.customerGroupIds,
    });

    if (!customerGroupsOk) continue;

    return {
      applied: true,
      source: "rule",
      ruleId: rule.id,
      ruleName: rule.name,
    };
  }

  return {
    applied: false,
    source: null,
    ruleId: null,
    ruleName: null,
  };
}

function buildEmptyContext(args: {
  cart_id: string;
  address_id: string;
  country_id?: string | null;
  city_id?: string | null;
  customer_id?: string | null;
  currency?: string | null;
  subtotal?: number;
  product_ids?: string[];
  category_ids?: string[];
  free_shipping_coupon_applied?: boolean;
  free_shipping_rule_available?: boolean;
}) {
  return {
    cart_id: args.cart_id,
    address_id: args.address_id,
    country_id: args.country_id || null,
    city_id: args.city_id || null,
    customer_id: args.customer_id || null,
    currency: args.currency || null,
    subtotal: round2(Math.max(0, n(args.subtotal))),
    product_ids: args.product_ids ?? [],
    category_ids: args.category_ids ?? [],
    free_shipping_applied: Boolean(args.free_shipping_coupon_applied),
    free_shipping_coupon_applied: Boolean(args.free_shipping_coupon_applied),
    free_shipping_rule_available: Boolean(args.free_shipping_rule_available),
  };
}

function carrierIsEnabled(carrier: any) {
  return (
    carrier?.enabled === true ||
    carrier?.is_enabled === true ||
    carrier?.enabled === 1 ||
    carrier?.is_enabled === 1
  );
}

 async function loadPickupOptions(args: {
  storeDb: any;
  control: any;
  store_id: string;
  city_id: string;
  currencyInfo: {
    code: string;
    symbol: string;
    decimal_digits: number;
  };
}) {
  const carriersR: any = await args.storeDb
    .from("store_shipping_carriers")
    .select("id,type,display_name,enabled,is_enabled,status")
    .eq("store_id", args.store_id)
    .eq("type", "pickup");

  if (carriersR?.error || !Array.isArray(carriersR?.data)) {
    return [] as Array<ShippingOption & { _sort_price: number }>;
  }

  const carriers = (carriersR.data as any[]).filter((carrier) => {
    return (
      s(carrier?.id) &&
      s(carrier?.type) === "pickup" &&
      s(carrier?.status) === "active" &&
      carrierIsEnabled(carrier)
    );
  });

  if (!carriers.length) {
    return [] as Array<ShippingOption & { _sort_price: number }>;
  }

  const carrierIds = carriers.map((carrier) => s(carrier.id));
  const carrierMap = new Map<string, any>();

  for (const carrier of carriers) {
    carrierMap.set(s(carrier.id), carrier);
  }

  const pointsR: any = await args.storeDb
    .from("store_pickup_points")
    .select(
      [
        "id",
        "store_id",
        "store_shipping_carrier_id",
        "city_id",
        "title",
        "address",
        "map_url",
        "lat",
        "lng",
        "phone",
        "notes",
        "status",
        "created_at",
      ].join(","),
    )
    .eq("store_id", args.store_id)
    .eq("status", "active")
    .in("store_shipping_carrier_id", carrierIds)
    .order("created_at", { ascending: false });

  if (pointsR?.error || !Array.isArray(pointsR?.data)) {
    return [] as Array<ShippingOption & { _sort_price: number }>;
  }

  const points = pointsR.data as any[];

  if (!points.length) {
    return [] as Array<ShippingOption & { _sort_price: number }>;
  }

  const cityIds = uniqStrings(points.map((point) => point?.city_id));
  const cityMap = new Map<string, string>();

  if (cityIds.length) {
    try {
      const citiesR: any = await args.control
        .from("ref_cities")
        .select("id,name_ar,name_en")
        .in("id", cityIds);

      if (!citiesR?.error && Array.isArray(citiesR?.data)) {
        for (const city of citiesR.data) {
          const id = s(city?.id);
          if (!id) continue;

          cityMap.set(id, s(city?.name_ar) || s(city?.name_en));
        }
      }
    } catch {}
  }

  return points
    .map((point: any) => {
      const pointId = s(point?.id);
      const carrierId = s(point?.store_shipping_carrier_id);
      const carrier = carrierMap.get(carrierId);

      if (!pointId || !carrier) return null;

      const carrierName = s(carrier?.display_name) || "استلام من الفرع";
      const pointTitle = s(point?.title) || "فرع الاستلام";
      const address = s(point?.address);
      const pointCityId = s(point?.city_id);
      const pointCityName = cityMap.get(pointCityId) || "";

      const eta =
        [pointCityName, address].filter(Boolean).join(" - ") ||
        "استلام من الفرع";

      return {
        id: pointId,
        name: `${carrierName} - ${pointTitle}`,
        eta,
        price: formatMoney({
          amount: 0,
          code: args.currencyInfo.code,
          symbol: args.currencyInfo.symbol,
          decimals: args.currencyInfo.decimal_digits,
        }),
        price_amount: 0,
        original_price: null,
        original_price_amount: null,

        free_shipping_applied: false,
        free_shipping_source: null,
        free_shipping_rule_id: null,
        free_shipping_rule_name: null,
        price_label: "مجاني",

        cod: false,
        cod_fee: null,

        shipping_kind: "pickup_point",
        carrier_type: "pickup",
        store_shipping_carrier_id: carrierId,

        pickup_point_id: pointId,
        pickup_point_title: pointTitle,
        pickup_point_address: address || null,
        pickup_point_city_id: pointCityId || null,
        pickup_point_city_name: pointCityName || null,
        pickup_point_map_url: s(point?.map_url) || null,
        pickup_point_phone: s(point?.phone) || null,
        pickup_point_notes: s(point?.notes) || null,

        _sort_price: 0,
      } satisfies ShippingOption & { _sort_price: number };
    })
    .filter(Boolean) as Array<ShippingOption & { _sort_price: number }>;
}

export async function GET() {
  try {
    const store_id = await getStoreIdOrThrow();
    const session_id = await getCartSessionId();

    const ordersDb: any = await getOrdersDb(store_id);
    const storeDb: any = await getStoreDb(store_id);
    const control: any = controlDb();

    const customer = await getCheckoutCustomerId({
      sb: ordersDb,
      store_id,
    });

    if (!customer.ok) {
      return jsonError(customer.error, customer.status);
    }

    const cartR: any = await getCheckoutCart({
      sb: ordersDb,
      store_id,
      customer_id: customer.customer_id,
    });

    if (cartR.error) return jsonError(cartR.error.message, 500);
    if (!cartR.data?.id) return jsonError("CART_NOT_FOUND", 404);

    const cart = cartR.data as any;
    const cart_id = s(cart.id);
    const address_id = s(cart.address_id) || "";

    if (!address_id) {
      return jsonOk(
        {
          ok: true,
          options: [],
          reason: "NEED_ADDRESS",
        },
        session_id,
      );
    }

    const [storeR, currencyRowsRaw, addressR]: any[] = await Promise.all([
      control
        .from("stores")
        .select("default_currency")
        .eq("id", store_id)
        .limit(1)
        .maybeSingle(),

      fetchStoreCurrenciesForRuntime(storeDb, store_id),

      ordersDb
        .from("customer_addresses")
        .select("id,country_id,city_id,customer_id")
        .eq("id", address_id)
        .eq("customer_id", customer.customer_id)
        .limit(1)
        .maybeSingle(),
    ]);

    if (storeR?.error) return jsonError(storeR.error.message, 500);
    if (addressR?.error) return jsonError(addressR.error.message, 500);
    if (!addressR?.data?.id) return jsonError("ADDRESS_NOT_FOUND", 404);

    const address = addressR.data as any;

    const storeCurrency = cleanCurrencyCode(
      storeR?.data?.default_currency,
      "SAR",
    );

    const currencyRows: any[] = Array.isArray(currencyRowsRaw)
      ? currencyRowsRaw
      : [];

    const currencyRuntime = buildCurrencyRuntime(currencyRows, storeCurrency);
    const selectedCookieCurrency = await readSelectedCurrencyCodeFromCookies();

    const targetCurrency = resolveTargetCurrencyCode({
      selectedCode: selectedCookieCurrency,
      fallbackCode: cart.currency || storeCurrency,
      runtime: currencyRuntime,
    });

    const currencyInfo = currencyInfoFromRuntime({
      code: targetCurrency,
      runtime: currencyRuntime,
    });

    let country_id = address.country_id ? s(address.country_id) : "";
    const city_id = address.city_id ? s(address.city_id) : "";
    const customer_id = customer.customer_id;

    const cartProducts = await loadCartProducts({
      sb: ordersDb,
      store_id,
      cart_id,
      targetCurrency: currencyInfo.code,
      currencyRuntime,
    });

    const productIds = cartProducts.productIds;

    const [cityR, categoryIds, couponFreeShipping, freeShippingContext, ratesR, pickupOptions]:
      any[] = await Promise.all([
      !country_id && city_id
        ? control
            .from("ref_cities")
            .select("id,country_id")
            .eq("id", city_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),

      loadCategoryIdsForProducts({
        sb: storeDb,
        productIds,
      }),

      hasActiveFreeShippingCoupon({
        ordersDb,
        storeDb,
        store_id,
        cart_id,
        subtotal: cartProducts.subtotal,
        targetCurrency: currencyInfo.code,
        currencyRuntime,
      }),

      loadFreeShippingContext({
        sb: storeDb,
        store_id,
        customer_id,
      }),

      storeDb
        .from("store_shipping_rates")
        .select(
          [
            "id",
            "store_shipping_carrier_id",
            "customer_price",
            "eta_text",
            "cod_enabled",
            "cod_fee_customer",
            "currency",
            "enabled",
            "status",
            "scope",
            "included_city_ids",
            "excluded_city_ids",
          ].join(","),
        )
        .eq("store_id", store_id)
        .eq("enabled", true)
        .eq("status", "active"),

      loadPickupOptions({
        storeDb,
        control,
        store_id,
        city_id,
        currencyInfo,
      }),
    ]);

    if (!country_id && !cityR?.error && cityR?.data?.country_id) {
      country_id = s(cityR.data.country_id);
    }

    if (ratesR?.error) return jsonError(ratesR.error.message, 500);

    const rates: any[] = Array.isArray((ratesR as any)?.data)
      ? ((ratesR as any).data as any[])
      : [];

    const safePickupOptions: Array<ShippingOption & { _sort_price: number }> =
      Array.isArray(pickupOptions) ? pickupOptions : [];

    const contextBase = buildEmptyContext({
      cart_id,
      address_id,
      country_id,
      city_id,
      customer_id,
      currency: currencyInfo.code,
      subtotal: cartProducts.subtotal,
      product_ids: productIds,
      category_ids: Array.isArray(categoryIds) ? categoryIds : [],
      free_shipping_coupon_applied: Boolean(couponFreeShipping),
      free_shipping_rule_available: Boolean(freeShippingContext?.rules?.length),
    });

    if (!rates.length && !safePickupOptions.length) {
      return jsonOk(
        {
          ok: true,
          context: contextBase,
          options: [],
        },
        session_id,
      );
    }

    const carrierIds = uniqStrings(
      rates.map((rate) => rate?.store_shipping_carrier_id),
    );

    const out: Array<ShippingOption & { _sort_price: number }> = [];

    if (carrierIds.length) {
      const carriersR: any = await storeDb
        .from("store_shipping_carriers")
        .select("id,type,display_name,enabled,is_enabled,status")
        .eq("store_id", store_id)
        .in("id", carrierIds);

      if (carriersR?.error) return jsonError(carriersR.error.message, 500);

      const carriersArr: any[] = Array.isArray((carriersR as any)?.data)
        ? ((carriersR as any).data as any[])
        : [];

      const carriers = new Map<string, any>();

      for (const carrier of carriersArr) {
        const id = s(carrier?.id);
        if (id) carriers.set(id, carrier);
      }

      for (const rate of rates) {
        const carrierId = s((rate as any)?.store_shipping_carrier_id);
        const carrier = carriers.get(carrierId);

        if (!carrier) continue;

        const carrierEnabled =
          carrier.enabled === true ||
          carrier.is_enabled === true ||
          carrier.enabled === 1 ||
          carrier.is_enabled === 1;

        if (!carrierEnabled || s(carrier.status) !== "active") continue;

        if (city_id && !pickByCityScope(rate, city_id)) continue;

        const carrierType = s(carrier.type);
        const rateCurrency = cleanCurrencyCode(
          rate.currency,
          currencyRuntime.defaultCode,
        );

        const convertedShipping = round2(
          convertMoney({
            amount: Math.max(0, n(rate.customer_price)),
            sourceCode: rateCurrency,
            targetCode: currencyInfo.code,
            runtime: currencyRuntime,
          }),
        );

        const ruleMatch = couponFreeShipping
          ? ({
              applied: false,
              source: null,
              ruleId: null,
              ruleName: null,
            } as FreeShippingMatch)
          : evaluateRuleFreeShipping({
              context: freeShippingContext,
              subtotal: cartProducts.subtotal,
              countryId: country_id,
              cityId: city_id,
              productIds,
              categoryIds: Array.isArray(categoryIds) ? categoryIds : [],
              carrierId,
              minimumSubtotalToCartCurrency: (amount: number) =>
                convertMoney({
                  amount,
                  sourceCode: currencyRuntime.defaultCode,
                  targetCode: currencyInfo.code,
                  runtime: currencyRuntime,
                }),
            });

        const freeShippingApplied = Boolean(
          convertedShipping > 0 && (couponFreeShipping || ruleMatch.applied),
        );

        const displayedShipping = freeShippingApplied ? 0 : convertedShipping;

        const codAllowed = Boolean(rate.cod_enabled) && carrierType !== "pickup";
        const codFeeRaw = Math.max(0, n(rate.cod_fee_customer));

        const convertedCodFee = round2(
          convertMoney({
            amount: codFeeRaw,
            sourceCode: rateCurrency,
            targetCode: currencyInfo.code,
            runtime: currencyRuntime,
          }),
        );

        out.push({
          id: String(rate.id),
          name: s(carrier.display_name) || "شركة شحن",
          eta: s(rate.eta_text) || "—",

          price: formatMoney({
            amount: displayedShipping,
            code: currencyInfo.code,
            symbol: currencyInfo.symbol,
            decimals: currencyInfo.decimal_digits,
          }),
          price_amount: displayedShipping,

          original_price: freeShippingApplied
            ? formatMoney({
                amount: convertedShipping,
                code: currencyInfo.code,
                symbol: currencyInfo.symbol,
                decimals: currencyInfo.decimal_digits,
              })
            : null,
          original_price_amount: freeShippingApplied ? convertedShipping : null,

          free_shipping_applied: freeShippingApplied,
          free_shipping_source: freeShippingApplied
            ? couponFreeShipping
              ? "coupon"
              : "rule"
            : null,
          free_shipping_rule_id: freeShippingApplied ? ruleMatch.ruleId : null,
          free_shipping_rule_name: freeShippingApplied ? ruleMatch.ruleName : null,
          price_label: freeShippingApplied ? "الشحن مجانًا" : null,

          cod: codAllowed,
          cod_fee:
            codAllowed && convertedCodFee > 0
              ? formatMoney({
                  amount: convertedCodFee,
                  code: currencyInfo.code,
                  symbol: currencyInfo.symbol,
                  decimals: currencyInfo.decimal_digits,
                })
              : null,

          shipping_kind: "rate",
          carrier_type: carrierType,
          store_shipping_carrier_id: carrierId,

          _sort_price: convertedShipping,
        });
      }
    }

    const allOut = [...out, ...safePickupOptions];

    if (allOut.length) {
      let bestIdx = 0;
      let bestPrice = Infinity;

      for (let i = 0; i < allOut.length; i++) {
        const price = allOut[i]._sort_price;

        if (Number.isFinite(price) && price < bestPrice) {
          bestPrice = price;
          bestIdx = i;
        }
      }

      allOut.forEach((option, index) => {
        if (index === bestIdx) option.recommended = true;
      });
    }

    const options = allOut.map(({ _sort_price, ...option }) => option);
    const hasFreeShippingOption = options.some(
      (option) => option.free_shipping_applied,
    );

    return jsonOk(
      {
        ok: true,
        context: {
          ...contextBase,
          free_shipping_applied: hasFreeShippingOption,
          pickup_available: safePickupOptions.length > 0,
        },
        options,
      },
      session_id,
    );
  } catch (error: any) {
    return jsonError(error?.message || "SHIPPING_OPTIONS_FAILED", 500);
  }
}