// FILE: apps/storefront/src/app/(store)/api/checkout/payment/options/route.ts

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/data/store/supabase.server";
import { verifySession } from "@/lib/auth/session";
import {
  cartSessionCookie,
  getCartSessionId,
  getStoreIdOrThrow,
} from "../../../_cart/cart.server";
import {
  evaluateCodRestrictions,
  type CodRestrictionEvaluation,
} from "../../lib/cod-restrictions";

export const dynamic = "force-dynamic";

const SESSION_COOKIE = "elyaia_session";

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

function jsonError(error: string, status = 400, extra?: any) {
  return NextResponse.json(
    { ok: false, error, ...(extra ? { extra } : {}) },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function jsonOk(payload: Record<string, any>, sessionId: string) {
  const res = NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });

  if (sessionId) {
    res.cookies.set(cartSessionCookie(sessionId));
  }

  return res;
}

function safeObject(value: any): Record<string, any> {
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

type CurrencyRuntimeRow = {
  code: string;
  symbol: string;
  decimal_digits: number;
  rate: number;
  is_default: boolean;
  enabled: boolean;
};

type PaymentDisabledHelp =
  | {
      kind: "cod_untrusted_customer";
      title: string;
      message: string;
      records: Array<{
        store_name: string;
        reason_text: string;
        reason_note?: string | null;
        created_at?: string | null;
        is_current_store?: boolean;
      }>;
    }
  | null;

type PaymentOption = {
  id: string;
  type: "cod" | "bank_transfer" | "provider";
  title: string;
  subtitle?: string | null;
  fee_text?: string | null;
  fee_amount?: number | null;
  recommended?: boolean;
  disabled?: boolean;
  disabled_reason?: string | null;
  disabled_help?: PaymentDisabledHelp;
  bank_details?: {
    bank_name: string;
    account_holder: string;
    iban: string;
    note: string;
  } | null;
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
    .select("id,user_id,address_id,shipping_id,payment_method,currency,status")
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

function currencyDecimals(args: {
  code: string;
  runtime: ReturnType<typeof buildCurrencyRuntime>;
}) {
  const code = cleanCurrencyCode(args.code, args.runtime.defaultCode);
  const row = args.runtime.map.get(code);

  return clampDecimals(row?.decimal_digits, 2);
}

function formatMoney(args: {
  amount: number;
  currency: string;
  runtime: ReturnType<typeof buildCurrencyRuntime>;
}) {
  const currency = cleanCurrencyCode(args.currency, args.runtime.defaultCode);
  const decimals = currencyDecimals({
    code: currency,
    runtime: args.runtime,
  });

  const rounded =
    decimals <= 0
      ? Math.round(args.amount)
      : Number(round2(args.amount).toFixed(decimals));

  return `${currency} ${rounded.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })}`;
}

async function loadCartProductsSubtotal(args: {
  sb: any;
  storeId: string;
  cartId: string;
}) {
  const { data, error } = await args.sb
    .from("cart_items")
    .select("qty,unit_price")
    .eq("store_id", args.storeId)
    .eq("cart_id", args.cartId);

  if (error) throw new Error(error.message);

  let subtotal = 0;

  for (const item of data ?? []) {
    const qtyValue = Number(item?.qty ?? 1);
    const unitPriceValue = Number(item?.unit_price ?? 0);

    const qty = Math.max(
      1,
      Math.floor(Number.isFinite(qtyValue) ? qtyValue : 1),
    );

    const unitPrice = Math.max(
      0,
      Number.isFinite(unitPriceValue) ? unitPriceValue : 0,
    );

    subtotal += unitPrice * qty;
  }

  return round2(Math.max(0, subtotal));
}

function getCodSubtitle(args: {
  shippingId: string;
  codAllowed: boolean;
  disabledReason: string | null;
  restrictions: CodRestrictionEvaluation | null;
  targetCurrency: string;
  currencyRuntime: ReturnType<typeof buildCurrencyRuntime>;
}) {
  if (!args.shippingId) {
    return "اختر شركة الشحن أولاً لتأكيد توفر الدفع عند الاستلام";
  }

  if (args.codAllowed) {
    return "ادفع عند وصول الطلب";
  }

  const reason = s(args.disabledReason);
  const restrictions = args.restrictions;

  if (reason === "COD_UNTRUSTED_CUSTOMER") {
    if (restrictions?.untrustedCustomerSummary?.current_store_blocked) {
      return "الدفع عند الاستلام غير متاح لك في هذا المتجر";
    }

    return "الدفع عند الاستلام غير متاح لك مؤقتًا";
  }

  if (reason === "COD_MINIMUM_SUBTOTAL" && restrictions?.minimumSubtotal) {
    return `الدفع عند الاستلام متاح للطلبات من ${formatMoney({
      amount: restrictions.minimumSubtotal,
      currency: args.targetCurrency,
      runtime: args.currencyRuntime,
    })}`;
  }

  if (reason === "COD_MAXIMUM_SUBTOTAL" && restrictions?.maximumSubtotal) {
    return `الدفع عند الاستلام متاح حتى ${formatMoney({
      amount: restrictions.maximumSubtotal,
      currency: args.targetCurrency,
      runtime: args.currencyRuntime,
    })}`;
  }

  if (reason === "COD_MAXIMUM_WEIGHT" && restrictions?.maximumWeightKg) {
    return `الدفع عند الاستلام متاح حتى وزن ${restrictions.maximumWeightKg} كجم`;
  }

  if (reason === "COD_PRODUCT_EXCLUDED") {
    return "الدفع عند الاستلام غير متاح بسبب وجود منتج مستثنى في السلة";
  }

  if (reason === "COD_CATEGORY_EXCLUDED") {
    return "الدفع عند الاستلام غير متاح بسبب وجود منتج من قسم مستثنى في السلة";
  }

  if (reason === "COD_NOT_AVAILABLE_FOR_PICKUP") {
    return "الدفع عند الاستلام غير متاح مع الاستلام من الفرع";
  }

  if (reason === "SHIPPING_CARRIER_DISABLED") {
    return "طريقة الشحن الحالية غير مفعلة";
  }

  if (reason === "COD_NOT_ENABLED_FOR_SHIPPING_RATE") {
    return "الدفع عند الاستلام غير مفعل لطريقة الشحن الحالية";
  }

  return "الدفع عند الاستلام غير متاح لطريقة الشحن الحالية";
}

function getCodDisabledHelp(args: {
  disabledReason: string | null;
  restrictions: CodRestrictionEvaluation | null;
}): PaymentDisabledHelp {
  if (s(args.disabledReason) !== "COD_UNTRUSTED_CUSTOMER") return null;

  const summary = args.restrictions?.untrustedCustomerSummary;
  if (!summary?.records?.length) return null;

  return {
    kind: "cod_untrusted_customer",
    title: summary.current_store_blocked
      ? "الدفع عند الاستلام غير متاح في هذا المتجر"
      : "الدفع عند الاستلام غير متاح لك مؤقتًا",
    message: summary.current_store_blocked
      ? "قام هذا المتجر بإيقاف الدفع عند الاستلام لهذا الحساب. يمكنك التواصل مع المتجر لمعرفة التفاصيل أو طلب مراجعة السجل."
      : "لديك سجل سابق في عدة متاجر يتعلق بعدم الجدية في الدفع أو استلام الطلب. يمكنك التواصل مع المتاجر التالية لمعرفة التفاصيل أو طلب مراجعة السجل.",
    records: summary.records.map((record) => ({
      store_name: record.store_name,
      reason_text: record.reason_text,
      reason_note: record.reason_note,
      created_at: record.created_at,
      is_current_store: record.is_current_store,
    })),
  };
}

export async function GET() {
  try {
    const sb: any = supabaseAdmin();
    const store_id = await getStoreIdOrThrow();
    const session_id = await getCartSessionId();

    const customer = await getCheckoutCustomerId({
      sb,
      store_id,
    });

    if (!customer.ok) {
      return jsonError(customer.error, customer.status);
    }

    const cartR = await getCheckoutCart({
      sb,
      store_id,
      customer_id: customer.customer_id,
    });

    if (cartR.error) return jsonError(cartR.error.message, 500);
    if (!cartR.data?.id) return jsonError("CART_NOT_FOUND", 404);

    const cart_id = s(cartR.data.id);
    const address_id = s(cartR.data.address_id) || "";
    const shipping_id = s(cartR.data.shipping_id) || "";
    const payment_method = s(cartR.data.payment_method) || "";
    let customer_id = s(cartR.data.user_id) || customer.customer_id;

    const [storeR, currencyRows, pmR, banksR] = await Promise.all([
      sb
        .from("stores")
        .select("default_currency")
        .eq("id", store_id)
        .limit(1)
        .maybeSingle(),

      fetchStoreCurrenciesForRuntime(sb, store_id),

      sb
        .from("store_payment_methods")
        .select("id,provider_code,enabled,status,sort_order")
        .eq("store_id", store_id)
        .order("sort_order", { ascending: true }),

      sb
        .from("store_bank_accounts")
        .select("id,bank_name,account_holder,iban,is_primary,status")
        .eq("store_id", store_id)
        .order("is_primary", { ascending: false })
        .order("updated_at", { ascending: false }),
    ]);

    if (storeR.error) return jsonError(storeR.error.message, 500);
    if (pmR.error) return jsonError(pmR.error.message, 500);
    if (banksR.error) return jsonError(banksR.error.message, 500);

    const storeCurrency = cleanCurrencyCode(
      storeR.data?.default_currency,
      "SAR",
    );

    const currencyRuntime = buildCurrencyRuntime(currencyRows, storeCurrency);
    const selectedCookieCurrency = await readSelectedCurrencyCodeFromCookies();

    const targetCurrency = resolveTargetCurrencyCode({
      selectedCode: selectedCookieCurrency,
      fallbackCode: cartR.data.currency || storeCurrency,
      runtime: currencyRuntime,
    });

    let city_id = "";

    if (address_id) {
      const aR = await sb
        .from("customer_addresses")
        .select("id,city_id,customer_id")
        .eq("id", address_id)
        .eq("customer_id", customer.customer_id)
        .limit(1)
        .maybeSingle();

      if (!aR.error && aR.data?.id) {
        city_id = s(aR.data.city_id) || "";
        customer_id = s(aR.data.customer_id) || customer_id;
      }
    }

    let codAllowed = false;
    let codDisabledReason: string | null = shipping_id
      ? "COD_NOT_AVAILABLE"
      : "NEED_SHIPPING";

    let codFeeCustomerRaw = 0;
    let codFeeCustomerConverted = 0;
    let shippingCarrierType: string | null = null;
    let rateCurrency = targetCurrency;
    let codRestrictions: CodRestrictionEvaluation | null = null;

    if (shipping_id) {
      const rateR = await sb
        .from("store_shipping_rates")
        .select(
          "id,cod_enabled,cod_fee_customer,currency,store_shipping_carrier_id",
        )
        .eq("id", shipping_id)
        .eq("store_id", store_id)
        .limit(1)
        .maybeSingle();

      if (!rateR.error && rateR.data?.id) {
        codAllowed = Boolean(rateR.data.cod_enabled);
        codDisabledReason = codAllowed
          ? null
          : "COD_NOT_ENABLED_FOR_SHIPPING_RATE";

        codFeeCustomerRaw = Math.max(0, n(rateR.data.cod_fee_customer));

        rateCurrency = cleanCurrencyCode(
          rateR.data.currency,
          currencyRuntime.defaultCode,
        );

        codFeeCustomerConverted = round2(
          convertMoney({
            amount: codFeeCustomerRaw,
            sourceCode: rateCurrency,
            targetCode: targetCurrency,
            runtime: currencyRuntime,
          }),
        );

        const carrierR = await sb
          .from("store_shipping_carriers")
          .select("id,type,enabled,is_enabled,status")
          .eq("id", String(rateR.data.store_shipping_carrier_id))
          .eq("store_id", store_id)
          .limit(1)
          .maybeSingle();

        if (!carrierR.error && carrierR.data?.id) {
          shippingCarrierType = s(carrierR.data.type) || null;

          if (shippingCarrierType === "pickup") {
            codAllowed = false;
            codDisabledReason = "COD_NOT_AVAILABLE_FOR_PICKUP";
          }

          const carrierEnabled =
            carrierR.data.enabled === true ||
            carrierR.data.is_enabled === true ||
            carrierR.data.enabled === 1;

          if (!carrierEnabled || s(carrierR.data.status) !== "active") {
            codAllowed = false;
            codDisabledReason = "SHIPPING_CARRIER_DISABLED";
          }
        }
      } else {
        codAllowed = false;
        codDisabledReason = "SHIPPING_RATE_NOT_FOUND";
      }
    }

    if (codAllowed) {
      const cartProductsSubtotal = await loadCartProductsSubtotal({
        sb,
        storeId: store_id,
        cartId: cart_id,
      });

      codRestrictions = await evaluateCodRestrictions({
        sb,
        storeId: store_id,
        cartId: cart_id,
        cartSubtotal: cartProductsSubtotal,
        customerId: customer_id || null,
        toCartCurrency: (amount) =>
          round2(
            convertMoney({
              amount,
              sourceCode: currencyRuntime.defaultCode,
              targetCode: targetCurrency,
              runtime: currencyRuntime,
            }),
          ),
      });

      if (!codRestrictions.allowed) {
        codAllowed = false;
        codDisabledReason = codRestrictions.reason || "COD_RESTRICTED";
      }
    }

    const rows = Array.isArray(pmR.data) ? pmR.data : [];

    const banks = (banksR.data ?? []).filter(
      (b: any) => s(b.status) === "active",
    );

    const options: PaymentOption[] = [];

    options.push({
      id: "cod",
      type: "cod",
      title: "الدفع عند الاستلام",
      subtitle: getCodSubtitle({
        shippingId: shipping_id,
        codAllowed,
        disabledReason: codDisabledReason,
        restrictions: codRestrictions,
        targetCurrency,
        currencyRuntime,
      }),
      fee_amount: codAllowed ? codFeeCustomerConverted : null,
      fee_text:
        codAllowed && codFeeCustomerConverted > 0
          ? `رسوم الدفع عند الاستلام: ${formatMoney({
              amount: codFeeCustomerConverted,
              currency: targetCurrency,
              runtime: currencyRuntime,
            })}`
          : null,
      recommended: codAllowed,
      disabled: !codAllowed,
      disabled_reason: !shipping_id
        ? "NEED_SHIPPING"
        : codAllowed
          ? null
          : codDisabledReason || "COD_NOT_AVAILABLE",
      disabled_help: getCodDisabledHelp({
        disabledReason: codDisabledReason,
        restrictions: codRestrictions,
      }),
    });

    if (banks.length > 0) {
      const primary = banks.find((b: any) => !!b.is_primary) ?? banks[0];

      const bankName = s(primary?.bank_name) || "غير محدد";
      const holder = s(primary?.account_holder) || "غير محدد";
      const iban = s(primary?.iban) || "غير محدد";

      options.push({
        id: "bank_transfer",
        type: "bank_transfer",
        title: "تحويل بنكي",
        subtitle:
          `${bankName} • ${
            iban !== "غير محدد" ? `${iban.slice(0, 6)}…${iban.slice(-4)}` : ""
          }`.trim(),
        bank_details: {
          bank_name: bankName,
          account_holder: holder,
          iban,
          note: "ملاحظة: بعد التحويل ارسل صورة من الإيصال إلى خدمة العملاء/الواتساب ليتم اعتماد طلبك.",
        },
        recommended: false,
        disabled: false,
      });
    }

    for (const m of rows) {
      const enabled = Boolean(m.enabled);
      const status = s(m.status);

      if (!enabled) continue;
      if (status !== "active") continue;

      const code = s(m.provider_code);
      if (!code) continue;

      options.push({
        id: `provider:${code}`,
        type: "provider",
        title: `الدفع الإلكتروني (${code})`,
        subtitle: "بطاقة / مدى / محافظ (حسب المزوّد)",
        recommended: false,
        disabled: false,
      });
    }

    return jsonOk(
      {
        ok: true,
        context: {
          cart_id,
          customer_id: customer_id || null,
          address_id: address_id || null,
          city_id: city_id || null,
          shipping_id: shipping_id || null,
          shipping_carrier_type: shippingCarrierType,
          payment_method: payment_method || null,
          currency: targetCurrency,
          cod_fee_source_currency: rateCurrency,
          cod_disabled_reason: codAllowed ? null : codDisabledReason,
          cod_restrictions: codRestrictions,
        },
        options,
        fees: {
          cod_fee: codAllowed ? codFeeCustomerConverted : 0,
          cod_fee_raw: codAllowed ? codFeeCustomerRaw : 0,
          cod_fee_currency: targetCurrency,
          cod_fee_source_currency: rateCurrency,
        },
      },
      session_id,
    );
  } catch (e: any) {
    return jsonError(e?.message || "PAYMENT_OPTIONS_FAILED", 500);
  }
}