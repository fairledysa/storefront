// FILE: apps/storefront/src/app/(store)/api/checkout/order-options/route.ts

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
} from "../../_cart/cart.server";

export const dynamic = "force-dynamic";

const SESSION_COOKIE = "elyaia_session";

type CurrencyRuntimeRow = {
  code: string;
  symbol: string;
  decimal_digits: number;
  rate: number;
  is_default: boolean;
  enabled: boolean;
};

function s(x: any) {
  return String(x ?? "").trim();
}

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function round2(x: number) {
  return Math.round(x * 100) / 100;
}

function unique(values: string[]) {
  return Array.from(new Set(values.map(String).filter(Boolean)));
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
  const raw = value ?? fallback;
  const num = Number(raw);

  if (!Number.isFinite(num)) return fallback;

  return Math.max(0, Math.min(4, Math.floor(num)));
}

function positiveRate(value: any, fallback = 1) {
  const num = Number(value ?? fallback);
  return Number.isFinite(num) && num > 0 ? num : fallback;
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

function jsonError(error: string, status = 500) {
  return NextResponse.json(
    { ok: false, error },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

function jsonOk(payload: Record<string, any>, sessionId: string) {
  const res = NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });

  if (sessionId) {
    res.cookies.set(cartSessionCookie(sessionId));
  }

  return res;
}

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

    const linkR = await args.sb
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
    .select("id,currency,user_id,status")
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

  for (const select of selects) {
    const res = await sb
      .from("store_currencies")
      .select(select)
      .eq("store_id", storeId)
      .eq("is_enabled", true);

    if (!res.error) {
      return Array.isArray(res.data) ? res.data : [];
    }
  }

  return [];
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

    const cartR = await getCheckoutCart({
      sb: ordersDb,
      store_id,
      customer_id: customer.customer_id,
    });

    if (cartR.error) throw new Error(cartR.error.message);

    const cartId = s(cartR.data?.id);

    if (!cartId) {
      return jsonError("CART_NOT_FOUND", 404);
    }

    const [storeR, currencyRows, itemsR, optionsR] = await Promise.all([
      control
        .from("stores")
        .select("default_currency")
        .eq("id", store_id)
        .limit(1)
        .maybeSingle(),

      fetchStoreCurrenciesForRuntime(storeDb, store_id),

      ordersDb
        .from("cart_items")
        .select("product_id")
        .eq("cart_id", cartId)
        .eq("store_id", store_id),

      storeDb
        .from("store_order_options")
        .select(
          [
            "id",
            "store_id",
            "type",
            "name",
            "description",
            "status",
            "is_required",
            "applies_to",
            "text_size",
            "allow_multiple",
            "price_customer",
            "metadata",
            "sort_order",
            "created_at",
          ].join(","),
        )
        .eq("store_id", store_id)
        .eq("status", "active")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

    if (storeR.error) throw new Error(storeR.error.message);
    if (itemsR.error) throw new Error(itemsR.error.message);
    if (optionsR.error) throw new Error(optionsR.error.message);

    const storeCurrencyFallback = cleanCurrencyCode(
      storeR.data?.default_currency,
      "SAR",
    );

    const runtime = buildCurrencyRuntime(currencyRows, storeCurrencyFallback);
    const selectedCookieCurrency = await readSelectedCurrencyCodeFromCookies();

    const targetCurrencyCode = resolveTargetCurrencyCode({
      selectedCode: selectedCookieCurrency,
      fallbackCode: cartR.data?.currency || storeCurrencyFallback,
      runtime,
    });

    const currency = currencyInfoFromRuntime({
      code: targetCurrencyCode,
      runtime,
    });

    function convertStorePrice(value: any) {
      const amount = n(value);
      if (!(amount > 0)) return 0;

      return round2(
        convertMoney({
          amount,
          sourceCode: runtime.defaultCode,
          targetCode: currency.code,
          runtime,
        }),
      );
    }

    const productIds = unique(
      (itemsR.data ?? []).map((item: any) => s(item.product_id)),
    );

    if (productIds.length === 0) {
      return jsonOk(
        {
          ok: true,
          data: [],
          currency,
        },
        session_id,
      );
    }

    const options = Array.isArray(optionsR.data) ? optionsR.data : [];
    const optionIds = options.map((option: any) => s(option.id)).filter(Boolean);

    if (optionIds.length === 0) {
      return jsonOk(
        {
          ok: true,
          data: [],
          currency,
        },
        session_id,
      );
    }

    const [
      productCategoriesR,
      categoryProductsR,
      optionCategoriesR,
      choicesR,
    ] = await Promise.all([
      storeDb
        .from("product_categories")
        .select("product_id,category_id")
        .in("product_id", productIds),

      storeDb
        .from("category_products")
        .select("product_id,category_id")
        .in("product_id", productIds),

      storeDb
        .from("store_order_option_categories")
        .select("option_id,category_id")
        .eq("store_id", store_id)
        .in("option_id", optionIds),

      storeDb
        .from("store_order_option_choices")
        .select(
          [
            "id",
            "option_id",
            "label",
            "price_customer",
            "cost",
            "weight_kg",
            "sort_order",
            "created_at",
          ].join(","),
        )
        .eq("store_id", store_id)
        .in("option_id", optionIds)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

    if (productCategoriesR.error) {
      throw new Error(productCategoriesR.error.message);
    }

    if (categoryProductsR.error) {
      throw new Error(categoryProductsR.error.message);
    }

    if (optionCategoriesR.error) {
      throw new Error(optionCategoriesR.error.message);
    }

    if (choicesR.error) {
      throw new Error(choicesR.error.message);
    }

    const cartCategoryIds = unique([
      ...(productCategoriesR.data ?? []).map((row: any) => s(row.category_id)),
      ...(categoryProductsR.data ?? []).map((row: any) => s(row.category_id)),
    ]);

    const categoryMap = new Map<string, string[]>();

    for (const row of optionCategoriesR.data ?? []) {
      const optionId = s(row.option_id);
      const categoryId = s(row.category_id);

      if (!optionId || !categoryId) continue;

      const list = categoryMap.get(optionId) ?? [];
      list.push(categoryId);
      categoryMap.set(optionId, list);
    }

    const choicesMap = new Map<string, any[]>();

    for (const row of choicesR.data ?? []) {
      const optionId = s(row.option_id);

      if (!optionId) continue;

      const list = choicesMap.get(optionId) ?? [];
      list.push({
        ...row,
        price_customer: convertStorePrice(row.price_customer),
        price_customer_raw: row.price_customer ?? 0,
        currency: currency.code,
      });
      choicesMap.set(optionId, list);
    }

    const cartCategorySet = new Set(cartCategoryIds);

    const data = options
      .map((option: any) => {
        const optionId = s(option.id);
        const appliesTo = s(option.applies_to) || "all";
        const categoryIds = categoryMap.get(optionId) ?? [];

        const visible =
          appliesTo === "all" ||
          categoryIds.some((categoryId) => cartCategorySet.has(categoryId));

        if (!visible) return null;

        return {
          ...option,
          price_customer: convertStorePrice(option.price_customer),
          price_customer_raw: option.price_customer ?? 0,
          currency: currency.code,
          category_ids: categoryIds,
          choices: choicesMap.get(optionId) ?? [],
        };
      })
      .filter(Boolean);

    return jsonOk(
      {
        ok: true,
        data,
        currency,
      },
      session_id,
    );
  } catch (error: any) {
    console.error("ORDER_OPTIONS_FAILED", error);
    return jsonError("ORDER_OPTIONS_FAILED", 500);
  }
}
