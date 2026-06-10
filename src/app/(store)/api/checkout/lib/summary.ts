// FILE: apps/storefront/src/app/(store)/api/checkout/lib/summary.ts

import { cookies } from "next/headers";
import crypto from "crypto";

import { getOrdersDb } from "@/data/db/orders-db.server";
import { getStoreDb } from "@/data/db/store-db.server";
import { getStoreCurrency } from "../../_cart/cart.server";
import { loadFreeShippingEvaluator } from "./free-shipping";
import { calculateCartSpecialOffers } from "./special-offers";
import {
  loadCartOrderOptionsSummary,
  type CartOrderOptionSummaryLine,
} from "./order-options";

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function round2(x: number) {
  return Math.round(x * 100) / 100;
}

function s(x: any) {
  return String(x ?? "").trim();
}

function bool(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const v = value.trim().toLowerCase();

    if (["true", "1", "yes", "on"].includes(v)) return true;
    if (["false", "0", "no", "off"].includes(v)) return false;
  }

  return fallback;
}

function boolMaybe(value: unknown): boolean | null {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const v = value.trim().toLowerCase();

    if (["true", "1", "yes", "on", "enabled", "active"].includes(v)) {
      return true;
    }

    if (["false", "0", "no", "off", "disabled", "inactive"].includes(v)) {
      return false;
    }
  }

  return null;
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

/* -------------------------------------------------------------------------- */
/* Currency runtime                                                           */
/* -------------------------------------------------------------------------- */

type CurrencyRuntimeRow = {
  code: string;
  symbol: string;
  decimal_digits: number;
  rate: number;
  is_default: boolean;
  enabled: boolean;
};

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

function convertNullablePrice(args: {
  amount: any;
  sourceCode: any;
  targetCurrency: string;
  currencyRuntime: ReturnType<typeof buildCurrencyRuntime>;
}) {
  const amount = n(args.amount);
  if (!(amount > 0)) return null;

  return convertMoney({
    amount,
    sourceCode: args.sourceCode,
    targetCode: args.targetCurrency,
    runtime: args.currencyRuntime,
  });
}

/* -------------------------------------------------------------------------- */
/* Tax runtime                                                                */
/* -------------------------------------------------------------------------- */

type StoreTaxSettingsRow = {
  enabled?: boolean | number | string | null;
  tax_number?: string | null;
  tax_certificate_url?: string | null;
  show_tax_number_in_footer?: boolean | number | string | null;
  show_tax_certificate_icon?: boolean | number | string | null;
  prices_include_tax?: boolean | number | string | null;
  shipping_include_tax?: boolean | number | string | null;
  tax_label?: string | null;
  metadata?: Record<string, any> | string | null;
};

type StoreTaxRateRow = {
  country_code?: string | null;
  country_name_ar?: string | null;
  country_name_en?: string | null;
  rate?: number | string | null;
  is_active?: boolean | number | string | null;
  sort_order?: number | string | null;
  metadata?: Record<string, any> | string | null;
};

type CheckoutTaxRuntime = {
  enabled: boolean;
  label: string;
  rate: number;
  pricesIncludeTax: boolean;
  prices_include_tax: boolean;
  shippingIncludeTax: boolean;
  shipping_include_tax: boolean;
  multiplier: number;
};

function normalizeTaxCountryCode(value: unknown) {
  const code = s(value).toUpperCase();

  if (!code) return "";
  if (code === "ALL") return "ALL";

  return /^[A-Z]{2}$/.test(code) ? code : "";
}

function toTaxRateNumber(value: unknown) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return 0;

  return Math.max(0, Math.min(100, num));
}

function normalizeTaxRateRow(row: StoreTaxRateRow, index: number) {
  const countryCode = normalizeTaxCountryCode(row.country_code);
  if (!countryCode) return null;

  const sortOrder = Number(row.sort_order ?? index);

  return {
    country_code: countryCode,
    rate: toTaxRateNumber(row.rate),
    is_active: bool(row.is_active, true),
    sort_order: Number.isFinite(sortOrder) ? Math.floor(sortOrder) : index,
  };
}

function chooseDefaultTaxRate(rows: StoreTaxRateRow[]) {
  const rates = (Array.isArray(rows) ? rows : [])
    .map((row, index) => normalizeTaxRateRow(row, index))
    .filter(Boolean)
    .sort((a: any, b: any) => n(a.sort_order) - n(b.sort_order)) as Array<{
    country_code: string;
    rate: number;
    is_active: boolean;
    sort_order: number;
  }>;

  const activeRates = rates.filter((rate) => rate.is_active && rate.rate > 0);

  return (
    activeRates.find((rate) => rate.country_code === "SA") ||
    activeRates.find((rate) => rate.country_code === "ALL") ||
    activeRates[0] ||
    rates.find((rate) => rate.country_code === "SA") ||
    rates.find((rate) => rate.country_code === "ALL") ||
    rates[0] ||
    null
  );
}

function normalizeCheckoutTax(args: {
  settings?: StoreTaxSettingsRow | null;
  rates?: StoreTaxRateRow[] | null;
}): CheckoutTaxRuntime {
  const settings = args.settings ?? null;
  const metadata = safeObject(settings?.metadata);
  const rateRow = chooseDefaultTaxRate(
    Array.isArray(args.rates) ? args.rates : [],
  );

  const metadataEnabled =
    boolMaybe(metadata.tax_enabled) ??
    boolMaybe(metadata.taxEnabled) ??
    boolMaybe(metadata.enabled) ??
    boolMaybe(metadata.is_enabled) ??
    boolMaybe(metadata.isEnabled) ??
    boolMaybe(metadata.active) ??
    boolMaybe(metadata.is_active) ??
    boolMaybe(metadata.isActive);

  const columnEnabled = boolMaybe(settings?.enabled);
  const enabledRaw = metadataEnabled ?? columnEnabled ?? false;

  const label =
    s(settings?.tax_label) ||
    s(metadata.tax_label) ||
    s(metadata.taxLabel) ||
    s(metadata.label) ||
    "VAT";

  const metadataRate = toTaxRateNumber(
    metadata.effective_rate ??
      metadata.effectiveRate ??
      metadata.tax_rate ??
      metadata.taxRate ??
      metadata.vat_rate ??
      metadata.vatRate ??
      metadata.rate,
  );

  const rateFromRow = toTaxRateNumber(rateRow?.rate ?? 0);
  const rawRate = rateFromRow > 0 ? rateFromRow : metadataRate;

  const effectiveRate = enabledRaw ? toTaxRateNumber(rawRate) : 0;

  const pricesIncludeTax = enabledRaw
    ? bool(
        metadata.prices_include_tax ??
          metadata.pricesIncludeTax ??
          settings?.prices_include_tax,
        false,
      )
    : false;

  const shippingIncludeTax = enabledRaw
    ? bool(
        metadata.shipping_include_tax ??
          metadata.shippingIncludeTax ??
          settings?.shipping_include_tax,
        false,
      )
    : false;

  const enabled = Boolean(enabledRaw && effectiveRate > 0);

  return {
    enabled,
    label,
    rate: enabled ? effectiveRate : 0,

    pricesIncludeTax: enabled ? pricesIncludeTax : false,
    prices_include_tax: enabled ? pricesIncludeTax : false,

    shippingIncludeTax: enabled ? shippingIncludeTax : false,
    shipping_include_tax: enabled ? shippingIncludeTax : false,

    multiplier: enabled && effectiveRate > 0 ? 1 + effectiveRate / 100 : 1,
  };
}

async function loadCheckoutTax(args: {
  sb: any;
  store_id: string;
}): Promise<CheckoutTaxRuntime> {
  const [settingsR, ratesR] = await Promise.all([
    args.sb
      .from("store_tax_settings")
      .select(
        "enabled,tax_number,tax_certificate_url,show_tax_number_in_footer,show_tax_certificate_icon,prices_include_tax,shipping_include_tax,tax_label,metadata",
      )
      .eq("store_id", args.store_id)
      .maybeSingle(),

    args.sb
      .from("store_tax_rates")
      .select(
        "country_code,country_name_ar,country_name_en,rate,is_active,sort_order,metadata",
      )
      .eq("store_id", args.store_id)
      .order("sort_order", { ascending: true })
      .order("country_code", { ascending: true }),
  ]);

  if (settingsR.error || ratesR.error) {
    return normalizeCheckoutTax({
      settings: null,
      rates: [],
    });
  }

  return normalizeCheckoutTax({
    settings: settingsR.data as StoreTaxSettingsRow | null,
    rates: Array.isArray(ratesR.data) ? (ratesR.data as StoreTaxRateRow[]) : [],
  });
}

function amountWithoutTax(amount: number, tax: CheckoutTaxRuntime) {
  const value = n(amount);
  if (!(value > 0)) return 0;

  if (!tax.enabled) return value;
  if (!tax.pricesIncludeTax) return value;

  return value / tax.multiplier;
}

/* -------------------------------------------------------------------------- */
/* Variant helpers                                                            */
/* -------------------------------------------------------------------------- */

function buildVariantsByProduct(rows: any[]) {
  const out = new Map<string, any[]>();

  for (const row of rows || []) {
    const productId = s(row?.product_id);
    if (!productId) continue;

    if (!out.has(productId)) {
      out.set(productId, []);
    }

    out.get(productId)!.push(row);
  }

  return out;
}

function buildVariantById(rows: any[]) {
  const out = new Map<string, any>();

  for (const row of rows || []) {
    const id = s(row?.id);
    if (id) out.set(id, row);
  }

  return out;
}

function buildVariantLinksByVariant(rows: any[]) {
  const out = new Map<string, Set<string>>();

  for (const row of rows || []) {
    const variantId = s(row?.variant_id);
    const optionValueId = s(row?.option_value_id);

    if (!variantId || !optionValueId) continue;

    if (!out.has(variantId)) {
      out.set(variantId, new Set<string>());
    }

    out.get(variantId)!.add(optionValueId);
  }

  return out;
}

function resolveVariantIdFromOptionsMap(args: {
  product_id: string;
  selected_option_value_ids: string[];
  variantsByProduct: Map<string, any[]>;
  linksByVariant: Map<string, Set<string>>;
}): string | null {
  const selected = Array.isArray(args.selected_option_value_ids)
    ? args.selected_option_value_ids.map(String).filter(Boolean)
    : [];

  if (selected.length === 0) return null;

  const variants = args.variantsByProduct.get(String(args.product_id)) ?? [];
  if (!variants.length) return null;

  const selectedSet = new Set(selected);

  for (const variant of variants) {
    const variantId = s(variant?.id);
    if (!variantId) continue;

    const set = args.linksByVariant.get(variantId) ?? new Set<string>();

    let ok = true;

    for (const oid of selectedSet) {
      if (!set.has(String(oid))) {
        ok = false;
        break;
      }
    }

    if (ok) return variantId;
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Pricing helpers                                                            */
/* -------------------------------------------------------------------------- */

function buildPricingByProduct(rows: any[]) {
  const out = new Map<string, any[]>();

  for (const row of rows || []) {
    const productId = s(row?.product_id);
    if (!productId) continue;

    if (!out.has(productId)) {
      out.set(productId, []);
    }

    out.get(productId)!.push(row);
  }

  return out;
}

function pickPricingRow(args: {
  rows: any[];
  targetCurrency: string;
  defaultCurrency: string;
}) {
  const rows = Array.isArray(args.rows) ? args.rows : [];
  if (!rows.length) return null;

  const targetCurrency = cleanCurrencyCode(args.targetCurrency, "");
  const defaultCurrency = cleanCurrencyCode(args.defaultCurrency, "");

  return (
    rows.find(
      (row) => cleanCurrencyCode(row?.currency, "") === targetCurrency,
    ) ||
    rows.find(
      (row) => cleanCurrencyCode(row?.currency, "") === defaultCurrency,
    ) ||
    rows[0] ||
    null
  );
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

function pickConvertedUnitPrice(args: {
  variant?: any | null;
  pricing?: any | null;
  targetCurrency: string;
  currencyRuntime: ReturnType<typeof buildCurrencyRuntime>;
}) {
  const variant = args.variant ?? null;
  const pricing = args.pricing ?? null;

  const sourceCurrency = readPricingCurrency(
    pricing,
    args.currencyRuntime.defaultCode,
  );

  if (variant) {
    const sale = convertNullablePrice({
      amount: variant?.sale_price,
      sourceCode: sourceCurrency,
      targetCurrency: args.targetCurrency,
      currencyRuntime: args.currencyRuntime,
    });

    if (sale != null && sale > 0) return sale;

    const price = convertNullablePrice({
      amount: variant?.price,
      sourceCode: sourceCurrency,
      targetCurrency: args.targetCurrency,
      currencyRuntime: args.currencyRuntime,
    });

    return price != null && price > 0 ? price : 0;
  }

  const sale = convertNullablePrice({
    amount: pricing?.sale_price,
    sourceCode: sourceCurrency,
    targetCurrency: args.targetCurrency,
    currencyRuntime: args.currencyRuntime,
  });

  if (sale != null && sale > 0) return sale;

  const price = convertNullablePrice({
    amount: pricing?.price,
    sourceCode: sourceCurrency,
    targetCurrency: args.targetCurrency,
    currencyRuntime: args.currencyRuntime,
  });

  return price != null && price > 0 ? price : 0;
}

function isSaleLine(args: {
  variant?: any | null;
  pricing?: any | null;
  targetCurrency: string;
  currencyRuntime: ReturnType<typeof buildCurrencyRuntime>;
  unitPriceBeforeTax: number;
  tax: CheckoutTaxRuntime;
}) {
  const sourceCurrency = readPricingCurrency(
    args.pricing,
    args.currencyRuntime.defaultCode,
  );

  const rawSale = args.variant?.sale_price ?? args.pricing?.sale_price;

  const sale = convertNullablePrice({
    amount: rawSale,
    sourceCode: sourceCurrency,
    targetCurrency: args.targetCurrency,
    currencyRuntime: args.currencyRuntime,
  });

  if (sale == null || sale <= 0) return false;

  const saleWithoutTax = amountWithoutTax(sale, args.tax);

  return round2(saleWithoutTax) === round2(args.unitPriceBeforeTax);
}

/* -------------------------------------------------------------------------- */
/* Coupon helpers                                                             */
/* -------------------------------------------------------------------------- */

function computeDiscountFromCoupon(args: {
  coupon: any;
  eligibleSubtotal: number;
  targetCurrency: string;
  sourceCurrency: string;
  currencyRuntime: ReturnType<typeof buildCurrencyRuntime>;
}) {
  const { coupon, eligibleSubtotal } = args;
  if (eligibleSubtotal <= 0) return 0;

  let discount = 0;

  if (String(coupon.discount_type) === "P") {
    const pct = Math.max(0, n(coupon.amount));
    discount = (eligibleSubtotal * pct) / 100;

    const maxRaw =
      coupon.maximum_amount == null
        ? null
        : Math.max(0, n(coupon.maximum_amount));

    const max =
      maxRaw != null && maxRaw > 0
        ? convertMoney({
            amount: maxRaw,
            sourceCode: args.sourceCurrency,
            targetCode: args.targetCurrency,
            runtime: args.currencyRuntime,
          })
        : null;

    if (max != null && max > 0) {
      discount = Math.min(discount, max);
    }
  } else {
    discount = convertMoney({
      amount: Math.max(0, n(coupon.amount)),
      sourceCode: args.sourceCurrency,
      targetCode: args.targetCurrency,
      runtime: args.currencyRuntime,
    });
  }

  discount = Math.min(discount, eligibleSubtotal);
  return round2(discount);
}

/* -------------------------------------------------------------------------- */
/* Shipping helpers                                                           */
/* -------------------------------------------------------------------------- */

function pickByCityScope(rate: any, cityId: string) {
  const scope = s(rate?.scope);

  const included: string[] = Array.isArray(rate?.included_city_ids)
    ? rate.included_city_ids.map((x: any) => String(x))
    : [];

  const excluded: string[] = Array.isArray(rate?.excluded_city_ids)
    ? rate.excluded_city_ids.map((x: any) => String(x))
    : [];

  if (!cityId) return false;
  if (excluded.includes(cityId)) return false;

  if (scope === "include_cities") return included.includes(cityId);

  return true;
}

async function computeCheckoutCharges(args: {
  sb: any;
  store_id: string;
  city_id: string;
  shipping_rate_id: string;
  free_shipping: boolean;
  payment_method: string | null;
  targetCurrency: string;
  currencyRuntime: ReturnType<typeof buildCurrencyRuntime>;
}) {
  const { sb, store_id, city_id, shipping_rate_id, free_shipping } = args;

  const rateId = s(shipping_rate_id);

  const empty = {
    shipping: 0,
    shipping_before_discount: 0,
    shipping_discount: 0,
    payment_fee: 0,
    cod_fee_include_tax: false,
  };

  if (!rateId) return empty;

  const rR = await sb
    .from("store_shipping_rates")
    .select(
      "id,store_id,store_shipping_carrier_id,scope,included_city_ids,excluded_city_ids,customer_price,currency,enabled,status,cod_enabled,cod_fee_customer,cod_fee_include_tax",
    )
    .eq("id", rateId)
    .eq("store_id", store_id)
    .maybeSingle();

  if (rR.error || !rR.data?.id) return empty;

  const enabled = rR.data.enabled === true;
  const statusOk = s(rR.data.status) === "active";

  if (!enabled || !statusOk) return empty;

  const rateCurrency = cleanCurrencyCode(
    rR.data.currency,
    args.currencyRuntime.defaultCode,
  );

  const cityAllowed = city_id ? pickByCityScope(rR.data, city_id) : false;

  const rawShippingBeforeDiscount = cityAllowed
    ? Math.max(0, n(rR.data.customer_price))
    : 0;

  const rawShipping = free_shipping ? 0 : rawShippingBeforeDiscount;

  const rawPaymentFee =
    s(args.payment_method) === "cod" && Boolean(rR.data.cod_enabled)
      ? Math.max(0, n(rR.data.cod_fee_customer))
      : 0;

  const shippingBeforeDiscount = round2(
    convertMoney({
      amount: rawShippingBeforeDiscount,
      sourceCode: rateCurrency,
      targetCode: args.targetCurrency,
      runtime: args.currencyRuntime,
    }),
  );

  const shipping = round2(
    convertMoney({
      amount: rawShipping,
      sourceCode: rateCurrency,
      targetCode: args.targetCurrency,
      runtime: args.currencyRuntime,
    }),
  );

  const paymentFee = round2(
    convertMoney({
      amount: rawPaymentFee,
      sourceCode: rateCurrency,
      targetCode: args.targetCurrency,
      runtime: args.currencyRuntime,
    }),
  );

  return {
    shipping,
    shipping_before_discount: shippingBeforeDiscount,
    shipping_discount: round2(Math.max(0, shippingBeforeDiscount - shipping)),
    payment_fee: paymentFee,
    cod_fee_include_tax:
      rawPaymentFee > 0 ? Boolean(rR.data.cod_fee_include_tax) : false,
  };
}

function splitChargeForTax(args: {
  amount: number;
  tax: CheckoutTaxRuntime;
  includeTax: boolean;
}) {
  const amount = round2(Math.max(0, n(args.amount)));

  if (!args.tax.enabled || args.tax.rate <= 0 || amount <= 0) {
    return {
      base: amount,
      tax: 0,
      total: amount,
      includeTax: false,
    };
  }

  if (args.includeTax) {
    const base = round2(amount / args.tax.multiplier);
    const tax = round2(amount - base);

    return {
      base,
      tax,
      total: amount,
      includeTax: true,
    };
  }

  const tax = round2(amount * (args.tax.rate / 100));

  return {
    base: amount,
    tax,
    total: round2(amount + tax),
    includeTax: false,
  };
}

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type CartItemOut = {
  id: string;
  product_id: string;
  variant_id: string | null;
  qty: number;
  line_key: string;
  unit_price: number;
  title: string;
  image_url: string | null;
};

export type CartSummaryOut = {
  cart_id: string;

  currency: string;
  currency_code: string;
  currencyCode: string;

  currency_symbol: string;
  currencySymbol: string;
  symbol: string;

  currency_decimals: number;
  currencyDecimals: number;
  decimal_digits: number;
  decimalDigits: number;

  items: CartItemOut[];

  subtotal: number;
  discount: number;
  shipping: number;
  payment_fee: number;

  order_options: CartOrderOptionSummaryLine[];
  orderOptions: CartOrderOptionSummaryLine[];
  order_options_fee: number;
  orderOptionsFee: number;
  order_options_base: number;
  orderOptionsBase: number;
  order_options_tax: number;
  orderOptionsTax: number;
  order_options_total: number;
  orderOptionsTotal: number;

  shipping_base: number;
  shippingBase: number;

  payment_fee_base: number;
  paymentFeeBase: number;

  shipping_before_discount: number;
  shippingBeforeDiscount: number;

  shipping_before_discount_base: number;
  shippingBeforeDiscountBase: number;

  shipping_discount: number;
  shippingDiscount: number;

  free_shipping: boolean;
  freeShipping: boolean;

  free_shipping_available: boolean;
  freeShippingAvailable: boolean;

  free_shipping_threshold: number;
  freeShippingThreshold: number;

  free_shipping_remaining: number;
  freeShippingRemaining: number;

  free_shipping_source: "coupon" | "rule" | null;
  freeShippingSource: "coupon" | "rule" | null;
  free_shipping_rule_id: string | null;
  freeShippingRuleId: string | null;
  free_shipping_rule_name: string | null;
  freeShippingRuleName: string | null;

  tax: number;
  tax_added: number;
  taxAdded: number;

  tax_total: number;
  taxTotal: number;

  total: number;

  product_tax: number;
  productTax: number;

  shipping_tax: number;
  shippingTax: number;

  payment_fee_tax: number;
  paymentFeeTax: number;

  shipping_total: number;
  shippingTotal: number;

  payment_fee_total: number;
  paymentFeeTotal: number;

  shipping_include_tax: boolean;
  shippingIncludeTax: boolean;

  payment_fee_include_tax: boolean;
  paymentFeeIncludeTax: boolean;

  tax_enabled: boolean;
  taxEnabled: boolean;
  tax_label: string;
  taxLabel: string;
  tax_rate: number;
  taxRate: number;
  prices_include_tax: boolean;
  pricesIncludeTax: boolean;

  coupon: null | { code: string; discount: number };
  coupon_discount: number;
  couponDiscount: number;
  special_offers_discount: number;
  specialOffersDiscount: number;
  applied_special_offers: Array<{
    id: string;
    title: string;
    offer_type: string;
    discount: number;
    message: string | null;
  }>;
  appliedSpecialOffers: Array<{
    id: string;
    title: string;
    offer_type: string;
    discount: number;
    message: string | null;
  }>;
  special_offer_messages: string[];
  specialOfferMessages: string[];
  special_offer_line_adjustments: Array<{
    cartItemId: string;
    productId: string;
    discount: number;
    label: string;
    offerId: string;
    offerTitle: string;
    offerType: string;
  }>;
  specialOfferLineAdjustments: Array<{
    cartItemId: string;
    productId: string;
    discount: number;
    label: string;
    offerId: string;
    offerTitle: string;
    offerType: string;
  }>;
  lineAdjustments: Array<{
    cartItemId: string;
    productId: string;
    discount: number;
    label: string;
    offerId: string;
    offerTitle: string;
    offerType: string;
  }>;
  payment_method: string | null;
};

/* -------------------------------------------------------------------------- */
/* Main summary                                                               */
/* -------------------------------------------------------------------------- */

export async function buildCartSummary(args: {
  store_id: string;
  cart_id: string;
}): Promise<CartSummaryOut> {
  const [ordersDb, storeDb] = await Promise.all([
    getOrdersDb(args.store_id),
    getStoreDb(args.store_id),
  ]);

  const [cartR, itemsR, ccR, currencyRows, checkoutTax] = await Promise.all([
    ordersDb
      .from("carts")
      .select(
        "id,store_id,user_id,currency,coupon_discount,address_id,shipping_id,payment_method",
      )
      .eq("id", args.cart_id)
      .eq("store_id", args.store_id)
      .limit(1)
      .maybeSingle(),

    ordersDb
      .from("cart_items")
      .select(
        "id,product_id,variant_id,qty,line_key,unit_price,selected_option_value_ids",
      )
      .eq("cart_id", args.cart_id),

    ordersDb
      .from("cart_coupons")
      .select("coupon_id,code,discount_amount")
      .eq("cart_id", args.cart_id)
      .eq("store_id", args.store_id)
      .limit(1)
      .maybeSingle(),

    fetchStoreCurrenciesForRuntime(storeDb, args.store_id),

    loadCheckoutTax({
      sb: storeDb,
      store_id: args.store_id,
    }),
  ]);

  if (cartR.error) throw new Error(cartR.error.message);
  if (!cartR.data?.id) throw new Error("CART_NOT_FOUND");

  if (itemsR.error) throw new Error(itemsR.error.message);

  const storeCurrency = await getStoreCurrency(args.store_id);

  const currencyRuntime = buildCurrencyRuntime(
    currencyRows,
    storeCurrency || "SAR",
  );

  const storeCurrencyCode = currencyRuntime.defaultCode;

  const selectedCookieCurrency = await readSelectedCurrencyCodeFromCookies();

  const cartCurrencyCode = cleanCurrencyCode(
    cartR.data.currency || storeCurrency || currencyRuntime.defaultCode,
    currencyRuntime.defaultCode || "SAR",
  );

  const currency = resolveTargetCurrencyCode({
    selectedCode: selectedCookieCurrency,
    fallbackCode: cartCurrencyCode,
    runtime: currencyRuntime,
  });

  const currencyInfo = currencyInfoFromRuntime({
    code: currency,
    runtime: currencyRuntime,
  });

  const itemsRaw = Array.isArray(itemsR.data) ? itemsR.data : [];

  const productIds: string[] = Array.from(
    new Set(
      itemsRaw
        .map((x: any) => String(x.product_id ?? "").trim())
        .filter(Boolean),
    ),
  );

  const [pR, pricingR, mR, variantsR] =
    productIds.length === 0
      ? await Promise.all([
          Promise.resolve({ data: [], error: null } as any),
          Promise.resolve({ data: [], error: null } as any),
          Promise.resolve({ data: [], error: null } as any),
          Promise.resolve({ data: [], error: null } as any),
        ])
      : await Promise.all([
          storeDb
            .from("products")
            .select("id,name,require_shipping,brand_id")
            .in("id", productIds)
            .eq("store_id", args.store_id),

          storeDb
            .from("product_pricing")
            .select("product_id,currency,price,sale_price")
            .in("product_id", productIds),

          storeDb
            .from("product_media")
            .select("product_id,original_url,is_default,sort_order")
            .in("product_id", productIds),

          storeDb
            .from("product_variants")
            .select("id,product_id,price,sale_price")
            .in("product_id", productIds),
        ]);

  if (pR.error) throw new Error(pR.error.message);
  if (pricingR.error) throw new Error(pricingR.error.message);
  if (variantsR.error) throw new Error(variantsR.error.message);

  const productsById = new Map<string, any>();

  for (const p of pR.data ?? []) {
    productsById.set(String(p.id), p);
  }

  const pricingByProduct = buildPricingByProduct(
    Array.isArray(pricingR.data) ? pricingR.data : [],
  );

  const imageByProduct = new Map<string, string | null>();

  if (!mR.error && Array.isArray(mR.data)) {
    const best = new Map<string, any>();

    for (const row of mR.data) {
      const pid = String(row.product_id);
      const cur = best.get(pid);
      const score = (row.is_default ? 0 : 1000) + n(row.sort_order);
      const curScore = cur
        ? (cur.is_default ? 0 : 1000) + n(cur.sort_order)
        : 1e9;

      if (!cur || score < curScore) {
        best.set(pid, row);
      }
    }

    for (const [pid, row] of best.entries()) {
      imageByProduct.set(pid, row?.original_url ?? null);
    }
  }

  const variants = Array.isArray(variantsR.data) ? variantsR.data : [];
  const variantIds = variants.map((v: any) => String(v.id)).filter(Boolean);

  const linksR =
    variantIds.length === 0
      ? ({ data: [], error: null } as any)
      : await storeDb
          .from("variant_option_values")
          .select("variant_id,option_value_id")
          .in("variant_id", variantIds);

  if (linksR.error) throw new Error(linksR.error.message);

  const variantsByProduct = buildVariantsByProduct(variants);
  const variantById = buildVariantById(variants);
  const linksByVariant = buildVariantLinksByVariant(
    Array.isArray(linksR.data) ? linksR.data : [],
  );

  const effVariantByItemId = new Map<string, string | null>();

  for (const it of itemsRaw) {
    const itemId = String(it.id);
    const pid = String(it.product_id);
    const vid = it.variant_id ? String(it.variant_id) : null;

    if (vid) {
      effVariantByItemId.set(itemId, vid);
      continue;
    }

    const selected: string[] = Array.isArray(it.selected_option_value_ids)
      ? it.selected_option_value_ids.map(String).filter(Boolean)
      : [];

    if (selected.length > 0) {
      const resolved = resolveVariantIdFromOptionsMap({
        product_id: pid,
        selected_option_value_ids: selected,
        variantsByProduct,
        linksByVariant,
      });

      effVariantByItemId.set(itemId, resolved);
      continue;
    }

    effVariantByItemId.set(itemId, null);
  }

  const items: CartItemOut[] = itemsRaw.map((it: any) => {
    const pid = String(it.product_id);
    const itemId = String(it.id);

    const vidEff = effVariantByItemId.get(itemId) ?? null;
    const qty = Math.max(1, Math.floor(n(it.qty) || 1));

    const p = productsById.get(pid);
    const title = String(p?.name ?? "منتج");
    const image_url = imageByProduct.get(pid) ?? null;

    const vRow = vidEff ? variantById.get(vidEff) : null;

    const prRow = pickPricingRow({
      rows: pricingByProduct.get(pid) ?? [],
      targetCurrency: currencyInfo.code,
      defaultCurrency: currencyRuntime.defaultCode,
    });

    const computedUnitWithTaxState = pickConvertedUnitPrice({
      variant: vRow,
      pricing: prRow,
      targetCurrency: currencyInfo.code,
      currencyRuntime,
    });

    const storedUnit = it.unit_price == null ? null : n(it.unit_price);

    const rawUnit =
      computedUnitWithTaxState > 0
        ? computedUnitWithTaxState
        : storedUnit != null && storedUnit > 0
          ? storedUnit
          : 0;

    const unitPriceBeforeTax = round2(amountWithoutTax(rawUnit, checkoutTax));

    return {
      id: itemId,
      product_id: pid,
      variant_id: vidEff,
      qty,
      line_key: String(it.line_key),
      unit_price: unitPriceBeforeTax,
      title,
      image_url,
    };
  });

  const subtotal = round2(items.reduce((a, x) => a + x.unit_price * x.qty, 0));

  const orderOptionsSummary = await loadCartOrderOptionsSummary({
    sb: ordersDb,
    storeId: args.store_id,
    cartId: args.cart_id,
    productIds,
    targetCurrency: currencyInfo.code,
    sourceCurrency: storeCurrencyCode,
    convertFromStoreCurrency: (amount) =>
      round2(
        convertMoney({
          amount,
          sourceCode: storeCurrencyCode,
          targetCode: currencyInfo.code,
          runtime: currencyRuntime,
        }),
      ),
  });

  const order_options = Array.isArray(orderOptionsSummary.lines)
    ? orderOptionsSummary.lines
    : [];

  const order_options_fee = round2(Math.max(0, n(orderOptionsSummary.fee)));
  const order_options_base = order_options_fee;
  const order_options_tax = 0;
  const order_options_total = order_options_fee;

  let couponOut: null | { code: string; discount: number } = null;
  let discount = 0;
  let couponFreeShipping = false;

  if (!ccR.error && ccR.data?.coupon_id) {
    const couponId = String(ccR.data.coupon_id);

    const cR = await storeDb
      .from("coupons")
      .select(
        "id,store_id,code,discount_type,amount,maximum_amount,start_at,end_at,status,minimum_amount,exclude_sale_products,free_shipping",
      )
      .eq("id", couponId)
      .eq("store_id", args.store_id)
      .limit(1)
      .maybeSingle();

    const coupon = cR.error ? null : cR.data;
    const now = Date.now();

    const minAmountRaw =
      coupon?.minimum_amount == null
        ? null
        : Math.max(0, n(coupon.minimum_amount));

    const minimumAmount =
      minAmountRaw != null && minAmountRaw > 0
        ? convertMoney({
            amount: minAmountRaw,
            sourceCode: storeCurrencyCode,
            targetCode: currencyInfo.code,
            runtime: currencyRuntime,
          })
        : null;

    const valid =
      coupon?.id &&
      String(coupon.status) === "active" &&
      (!coupon.start_at || Date.parse(String(coupon.start_at)) <= now) &&
      (!coupon.end_at || Date.parse(String(coupon.end_at)) >= now) &&
      (minimumAmount == null || subtotal >= minimumAmount);

    if (valid) {
      couponFreeShipping = coupon.free_shipping === true;

      let eligibleSubtotal = subtotal;

      if (coupon.exclude_sale_products) {
        let eligible = 0;

        for (const it of items) {
          const pid = String(it.product_id);
          const vid = it.variant_id ? String(it.variant_id) : null;

          const v = vid ? variantById.get(vid) : null;

          const pr = pickPricingRow({
            rows: pricingByProduct.get(pid) ?? [],
            targetCurrency: currencyInfo.code,
            defaultCurrency: currencyRuntime.defaultCode,
          });

          const saleLine = isSaleLine({
            variant: v,
            pricing: pr,
            targetCurrency: currencyInfo.code,
            currencyRuntime,
            unitPriceBeforeTax: it.unit_price,
            tax: checkoutTax,
          });

          if (!saleLine) eligible += it.unit_price * it.qty;
        }

        eligibleSubtotal = round2(eligible);
      }

      discount = computeDiscountFromCoupon({
        coupon,
        eligibleSubtotal,
        targetCurrency: currencyInfo.code,
        sourceCurrency: storeCurrencyCode,
        currencyRuntime,
      });

      couponOut = { code: String(ccR.data.code ?? coupon.code), discount };

      if (round2(n(ccR.data?.discount_amount)) !== discount) {
        await Promise.all([
          ordersDb
            .from("cart_coupons")
            .update({
              discount_amount: discount,
              updated_at: new Date().toISOString(),
            })
            .eq("store_id", args.store_id)
            .eq("cart_id", args.cart_id),

          ordersDb
            .from("carts")
            .update({
              coupon_discount: discount,
              last_activity_at: new Date().toISOString(),
            })
            .eq("id", args.cart_id)
            .eq("store_id", args.store_id),
        ]);
      }
    }
  }

  if (!couponOut) {
    discount = 0;
    couponFreeShipping = false;

    if (n(cartR.data.coupon_discount) > 0) {
      await ordersDb
        .from("carts")
        .update({
          coupon_discount: 0,
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", args.cart_id)
        .eq("store_id", args.store_id);
    }
  }

  let city_id = "";
  let country_id = "";
  let customer_id = "";

  const address_id = s(cartR.data.address_id) || "";

  if (address_id) {
    const aR = await ordersDb
      .from("customer_addresses")
      .select("id,country_id,city_id,customer_id")
      .eq("id", address_id)
      .maybeSingle();

    if (!aR.error && aR.data?.id) {
      city_id = s(aR.data.city_id) || "";
      country_id = s(aR.data.country_id) || "";
      customer_id = s(aR.data.customer_id) || "";
    }
  }

  if (!country_id && city_id) {
    const cityR = await storeDb
      .from("ref_cities")
      .select("id,country_id")
      .eq("id", city_id)
      .maybeSingle();

    if (!cityR.error && cityR.data?.country_id) {
      country_id = s(cityR.data.country_id);
    }
  }

  const specialOffersResult = await calculateCartSpecialOffers({
    sb: storeDb,
    storeId: args.store_id,
    items: items.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      variant_id: item.variant_id,
      qty: item.qty,
      unit_price: item.unit_price,
    })),
    subtotal,
    couponApplied: Boolean(couponOut),
    countryId: country_id,
    customerId: customer_id,
    convertStoreAmountToCartCurrency: (amount) =>
      round2(
        convertMoney({
          amount,
          sourceCode: storeCurrencyCode,
          targetCode: currencyInfo.code,
          runtime: currencyRuntime,
        }),
      ),
  });

  const couponDiscount = round2(discount);
  const specialOffersDiscount = round2(specialOffersResult.discount);

  discount = round2(Math.min(subtotal, couponDiscount + specialOffersDiscount));

  const shipping_rate_id = s(cartR.data.shipping_id) || "";
  const payment_method = s(cartR.data.payment_method) || null;

  let store_shipping_carrier_id = "";

  if (shipping_rate_id) {
    const srR = await storeDb
      .from("store_shipping_rates")
      .select("id,store_shipping_carrier_id")
      .eq("id", shipping_rate_id)
      .eq("store_id", args.store_id)
      .maybeSingle();

    if (!srR.error && srR.data?.id) {
      store_shipping_carrier_id = s(srR.data.store_shipping_carrier_id);
    }
  }

  const freeShippingProductIds = Array.from(
    new Set(
      items
        .filter((item) => {
          const product = productsById.get(item.product_id);
          return product?.require_shipping !== false;
        })
        .map((item) => item.product_id)
        .filter(Boolean),
    ),
  );

  const productIdsForFreeShipping = freeShippingProductIds.length
    ? freeShippingProductIds
    : Array.from(new Set(items.map((item) => item.product_id).filter(Boolean)));

  const freeShippingEvaluator = await loadFreeShippingEvaluator({
    sb: storeDb,
    storeId: args.store_id,
    subtotal,
    countryId: country_id,
    cityId: city_id,
    customerId: customer_id,
    productIds: productIdsForFreeShipping,

    minimumSubtotalToCartCurrency: (amount) =>
      round2(
        convertMoney({
          amount,
          sourceCode: storeCurrencyCode,
          targetCode: currencyInfo.code,
          runtime: currencyRuntime,
        }),
      ),
  });

  const freeShippingRule = freeShippingEvaluator.evaluate({
    storeShippingCarrierId: store_shipping_carrier_id,
  });

  const free_shipping = Boolean(couponFreeShipping || freeShippingRule.applied);

  const free_shipping_source: "coupon" | "rule" | null = couponFreeShipping
    ? "coupon"
    : freeShippingRule.applied
      ? "rule"
      : null;

  const free_shipping_available = Boolean(freeShippingRule.available);

  const free_shipping_threshold = round2(
    Math.max(0, n(freeShippingRule.minimumSubtotal)),
  );

  const free_shipping_remaining = freeShippingRule.applied
    ? 0
    : round2(Math.max(0, n(freeShippingRule.remaining)));

  const charges = await computeCheckoutCharges({
    sb: storeDb,
    store_id: args.store_id,
    city_id,
    shipping_rate_id,
    free_shipping,
    payment_method,
    targetCurrency: currencyInfo.code,
    currencyRuntime,
  });

  const shippingSplit = splitChargeForTax({
    amount: charges.shipping,
    tax: checkoutTax,
    includeTax: checkoutTax.shippingIncludeTax,
  });

  const shippingBeforeDiscountSplit = splitChargeForTax({
    amount: charges.shipping_before_discount,
    tax: checkoutTax,
    includeTax: checkoutTax.shippingIncludeTax,
  });

  const paymentFeeSplit = splitChargeForTax({
    amount: charges.payment_fee,
    tax: checkoutTax,
    includeTax: Boolean(charges.cod_fee_include_tax),
  });

  const taxableBase = round2(Math.max(0, subtotal - discount));

  const product_tax =
    checkoutTax.enabled && checkoutTax.rate > 0
      ? round2(taxableBase * (checkoutTax.rate / 100))
      : 0;

  const shipping_base = round2(shippingSplit.base);
  const payment_fee_base = round2(paymentFeeSplit.base);

  const shipping_tax = round2(shippingSplit.tax);
  const payment_fee_tax = round2(paymentFeeSplit.tax);

  const shipping_total = round2(shippingSplit.total);
  const payment_fee_total = round2(paymentFeeSplit.total);

  const shipping = shipping_total;
  const payment_fee = payment_fee_total;

  const shipping_before_discount_base = round2(shippingBeforeDiscountSplit.base);
  const shipping_before_discount_total = round2(
    shippingBeforeDiscountSplit.total,
  );

  const shipping_before_discount = shipping_before_discount_total;

  const shipping_discount = round2(
    Math.max(0, shipping_before_discount_total - shipping_total),
  );

  const tax = round2(
    product_tax +
      (shippingSplit.includeTax ? 0 : shipping_tax) +
      (paymentFeeSplit.includeTax ? 0 : payment_fee_tax),
  );

  const tax_total = round2(
    product_tax + shipping_tax + payment_fee_tax + order_options_tax,
  );

  const total = round2(
    taxableBase + shipping + payment_fee + order_options_total + tax,
  );

  return {
    cart_id: String(cartR.data.id),

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

    items,

    subtotal,
    discount,
    shipping,
    payment_fee,

    order_options,
    orderOptions: order_options,

    order_options_fee,
    orderOptionsFee: order_options_fee,

    order_options_base,
    orderOptionsBase: order_options_base,

    order_options_tax,
    orderOptionsTax: order_options_tax,

    order_options_total,
    orderOptionsTotal: order_options_total,

    shipping_base,
    shippingBase: shipping_base,

    payment_fee_base,
    paymentFeeBase: payment_fee_base,

    shipping_before_discount,
    shippingBeforeDiscount: shipping_before_discount,

    shipping_before_discount_base,
    shippingBeforeDiscountBase: shipping_before_discount_base,

    shipping_discount,
    shippingDiscount: shipping_discount,

    free_shipping,
    freeShipping: free_shipping,

    free_shipping_available,
    freeShippingAvailable: free_shipping_available,

    free_shipping_threshold,
    freeShippingThreshold: free_shipping_threshold,

    free_shipping_remaining,
    freeShippingRemaining: free_shipping_remaining,

    free_shipping_source,
    freeShippingSource: free_shipping_source,
    free_shipping_rule_id: freeShippingRule.ruleId,
    freeShippingRuleId: freeShippingRule.ruleId,
    free_shipping_rule_name: freeShippingRule.ruleName,
    freeShippingRuleName: freeShippingRule.ruleName,

    tax,
    tax_added: tax,
    taxAdded: tax,

    tax_total,
    taxTotal: tax_total,

    total,

    product_tax,
    productTax: product_tax,

    shipping_tax,
    shippingTax: shipping_tax,

    payment_fee_tax,
    paymentFeeTax: payment_fee_tax,

    shipping_total,
    shippingTotal: shipping_total,

    payment_fee_total,
    paymentFeeTotal: payment_fee_total,

    shipping_include_tax: checkoutTax.enabled
      ? checkoutTax.shippingIncludeTax
      : false,
    shippingIncludeTax: checkoutTax.enabled
      ? checkoutTax.shippingIncludeTax
      : false,

    payment_fee_include_tax: checkoutTax.enabled
      ? Boolean(charges.cod_fee_include_tax)
      : false,
    paymentFeeIncludeTax: checkoutTax.enabled
      ? Boolean(charges.cod_fee_include_tax)
      : false,

    tax_enabled: checkoutTax.enabled,
    taxEnabled: checkoutTax.enabled,
    tax_label: checkoutTax.label,
    taxLabel: checkoutTax.label,
    tax_rate: checkoutTax.rate,
    taxRate: checkoutTax.rate,
    prices_include_tax: checkoutTax.pricesIncludeTax,
    pricesIncludeTax: checkoutTax.pricesIncludeTax,

    coupon: couponOut,
    coupon_discount: couponDiscount,
    couponDiscount,
    special_offers_discount: specialOffersDiscount,
    specialOffersDiscount,
    applied_special_offers: specialOffersResult.appliedOffers,
    appliedSpecialOffers: specialOffersResult.appliedOffers,
    special_offer_messages: specialOffersResult.messages,
    specialOfferMessages: specialOffersResult.messages,
    special_offer_line_adjustments: specialOffersResult.lineAdjustments,
    specialOfferLineAdjustments: specialOffersResult.lineAdjustments,
    lineAdjustments: specialOffersResult.lineAdjustments,
    payment_method,
  };
}

/* -------------------------------------------------------------------------- */
/* Public token helpers                                                       */
/* -------------------------------------------------------------------------- */

export function makePublicToken(len = 7) {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = crypto.randomBytes(len);

  let out = "";

  for (let i = 0; i < len; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }

  return out;
}

export async function generateUniqueOrderPublicToken(args: {
  store_id: string;
  tries?: number;
  len?: number;
}) {
  const ordersDb = await getOrdersDb(args.store_id);
  const tries = Math.max(1, Math.min(50, Math.floor(n(args.tries ?? 25))));
  const len = Math.max(5, Math.min(24, Math.floor(n(args.len ?? 7))));

  for (let i = 0; i < tries; i++) {
    const token = makePublicToken(len);

    const existsR = await ordersDb
      .from("orders")
      .select("id")
      .eq("store_id", args.store_id)
      .eq("public_token", token)
      .limit(1)
      .maybeSingle();

    if (existsR.error) continue;

    if (!existsR.data?.id) return token;
  }

  return `${Date.now().toString(36).toUpperCase()}${makePublicToken(
    Math.min(10, len),
  )}`;
}
