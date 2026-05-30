// FILE: apps/storefront/src/app/(store)/api/checkout/prepare/route.ts

import { NextResponse } from "next/server";

import {
  cartSessionCookie,
  getCartSessionIdFromCookie,
  getExistingOpenCart,
  getStoreCurrencyInfo,
  getStoreIdOrThrow,
} from "../../_cart/cart.server";
import { buildCartSummary } from "../lib/summary";

export const dynamic = "force-dynamic";

function s(x: any) {
  return String(x ?? "").trim();
}

function normalizeCurrencyInfo(info: any) {
  const code = s(info?.code).toUpperCase() || "SAR";
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

function emptySummary(currencyInfo: any) {
  const meta = normalizeCurrencyInfo(currencyInfo);

  return {
    cart_id: "",

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

    items: [],

    subtotal: 0,
    discount: 0,
    shipping: 0,
    payment_fee: 0,

    order_options: [],
    orderOptions: [],
    order_options_fee: 0,
    orderOptionsFee: 0,
    order_options_base: 0,
    orderOptionsBase: 0,
    order_options_tax: 0,
    orderOptionsTax: 0,
    order_options_total: 0,
    orderOptionsTotal: 0,

    shipping_base: 0,
    shippingBase: 0,

    payment_fee_base: 0,
    paymentFeeBase: 0,

    shipping_before_discount: 0,
    shippingBeforeDiscount: 0,

    shipping_before_discount_base: 0,
    shippingBeforeDiscountBase: 0,

    shipping_discount: 0,
    shippingDiscount: 0,

    free_shipping: false,
    freeShipping: false,

    free_shipping_available: false,
    freeShippingAvailable: false,

    free_shipping_threshold: 0,
    freeShippingThreshold: 0,

    free_shipping_remaining: 0,
    freeShippingRemaining: 0,

    free_shipping_source: null,
    freeShippingSource: null,
    free_shipping_rule_id: null,
    freeShippingRuleId: null,
    free_shipping_rule_name: null,
    freeShippingRuleName: null,

    tax: 0,
    tax_added: 0,
    taxAdded: 0,

    tax_total: 0,
    taxTotal: 0,

    total: 0,

    product_tax: 0,
    productTax: 0,

    shipping_tax: 0,
    shippingTax: 0,

    payment_fee_tax: 0,
    paymentFeeTax: 0,

    shipping_total: 0,
    shippingTotal: 0,

    payment_fee_total: 0,
    paymentFeeTotal: 0,

    shipping_include_tax: false,
    shippingIncludeTax: false,

    payment_fee_include_tax: false,
    paymentFeeIncludeTax: false,

    tax_enabled: false,
    taxEnabled: false,
    tax_label: "VAT",
    taxLabel: "VAT",
    tax_rate: 0,
    taxRate: 0,
    prices_include_tax: false,
    pricesIncludeTax: false,

    coupon: null,
    payment_method: null,
  };
}

function jsonError(error: string, status = 500, extra?: any) {
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

function jsonOk(args: {
  payload: Record<string, any>;
  session_id?: string | null;
}) {
  const res = NextResponse.json(args.payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });

  const sessionId = s(args.session_id);

  if (sessionId) {
    res.cookies.set(cartSessionCookie(sessionId));
  }

  return res;
}

export async function GET() {
  try {
    const store_id = await getStoreIdOrThrow();
    const session_id = await getCartSessionIdFromCookie();

    const [cart, currencyInfo] = await Promise.all([
      getExistingOpenCart({
        store_id,
        session_id,
      }),
      getStoreCurrencyInfo(store_id),
    ]);

    if (!cart?.id) {
      const summary = emptySummary(currencyInfo);

      return jsonOk({
        session_id: "",
        payload: {
          ok: true,
          cart: null,
          state: {
            address_id: null,
            shipping_id: null,
            payment_method: null,
            payment_ready: false,
          },
          summary,
        },
      });
    }

    const cartId = s(cart.id);

    const summary = await buildCartSummary({
      store_id,
      cart_id: cartId,
    });

    const addressId = cart.address_id ? String(cart.address_id) : null;
    const shippingId = cart.shipping_id ? String(cart.shipping_id) : null;
    const paymentMethod = cart.payment_method
      ? String(cart.payment_method)
      : null;

    return jsonOk({
      session_id,
      payload: {
        ok: true,
        cart: {
          id: cartId,
          address_id: addressId,
          shipping_id: shippingId,
          payment_method: paymentMethod,
          currency: cart.currency ?? summary.currency ?? currencyInfo.code,
          user_id: cart.user_id ?? null,
          status: cart.status ?? "open",
        },
        state: {
          address_id: addressId,
          shipping_id: shippingId,
          payment_method: paymentMethod,
          payment_ready: Boolean(paymentMethod),
        },
        summary,
      },
    });
  } catch (e: any) {
    return jsonError(e?.message || "PREPARE_FAILED", 500);
  }
}