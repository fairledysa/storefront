// FILE: apps/storefront/src/app/(store)/api/checkout/bootstrap/route.ts

import { NextResponse } from "next/server";

import { getOrdersDb } from "@/data/db/orders-db.server";
import { getStoreDb } from "@/data/db/store-db.server";
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

function n(x: any) {
  const value = Number(x ?? 0);
  return Number.isFinite(value) ? value : 0;
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

function withCartCookie(res: NextResponse, sessionId: string) {
  const sid = s(sessionId);
  if (!sid) return res;

  res.cookies.set(cartSessionCookie(sid));
  return res;
}

function emptySummary(currencyInfo: any) {
  const code = s(currencyInfo?.code) || "SAR";
  const symbol = s(currencyInfo?.symbol) || code;

  const decimalsRaw = Number(currencyInfo?.decimal_digits ?? 2);
  const decimal_digits = Number.isFinite(decimalsRaw)
    ? Math.max(0, Math.min(4, Math.floor(decimalsRaw)))
    : 2;

  return {
    cart_id: "",

    currency: code,
    currency_code: code,
    currencyCode: code,

    currency_symbol: symbol,
    currencySymbol: symbol,
    symbol,

    currency_decimals: decimal_digits,
    currencyDecimals: decimal_digits,
    decimal_digits,
    decimalDigits: decimal_digits,

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
    coupon_discount: 0,
    couponDiscount: 0,
    special_offers_discount: 0,
    specialOffersDiscount: 0,
    applied_special_offers: [],
    appliedSpecialOffers: [],
    special_offer_messages: [],
    specialOfferMessages: [],
    special_offer_line_adjustments: [],
    specialOfferLineAdjustments: [],
    lineAdjustments: [],
    payment_method: null,
  };
}

async function loadCartItemsForDisplay(args: {
  ordersDb: any;
  storeDb: any;
  store_id: string;
  cart_id: string;
}) {
  const itemsR = await args.ordersDb
    .from("cart_items")
    .select(
      "id,cart_id,store_id,product_id,variant_id,qty,currency,unit_price,selected_option_value_ids,selected_options,line_key,created_at,updated_at",
    )
    .eq("cart_id", args.cart_id)
    .eq("store_id", args.store_id)
    .order("created_at", { ascending: true });

  if (itemsR.error) throw new Error(itemsR.error.message);

  const items = Array.isArray(itemsR.data) ? itemsR.data : [];

  const productIds = Array.from(
    new Set(
      items
        .map((item: any) => s(item?.product_id))
        .filter((id: string) => Boolean(id)),
    ),
  );

  const variantIds = Array.from(
    new Set(
      items
        .map((item: any) => s(item?.variant_id))
        .filter((id: string) => Boolean(id)),
    ),
  );

  const [productsR, pricingR, variantsR] =
    productIds.length === 0
      ? await Promise.all([
          Promise.resolve({ data: [], error: null } as any),
          Promise.resolve({ data: [], error: null } as any),
          Promise.resolve({ data: [], error: null } as any),
        ])
      : await Promise.all([
          args.storeDb
            .from("products")
            .select("id,name,require_shipping,store_id,status,metadata")
            .in("id", productIds)
            .eq("store_id", args.store_id),

          args.storeDb
            .from("product_pricing")
            .select("product_id,currency,price,sale_price")
            .in("product_id", productIds),

          variantIds.length
            ? args.storeDb
                .from("product_variants")
                .select("id,product_id,sku,price,sale_price")
                .in("id", variantIds)
            : Promise.resolve({ data: [], error: null } as any),
        ]);

  if (productsR.error) throw new Error(productsR.error.message);
  if (pricingR.error) throw new Error(pricingR.error.message);
  if (variantsR.error) throw new Error(variantsR.error.message);

  const productById = new Map<string, any>();
  for (const product of Array.isArray(productsR.data) ? productsR.data : []) {
    productById.set(String(product.id), product);
  }

  const pricingByProduct = new Map<string, any>();
  for (const pricing of Array.isArray(pricingR.data) ? pricingR.data : []) {
    if (!pricingByProduct.has(String(pricing.product_id))) {
      pricingByProduct.set(String(pricing.product_id), pricing);
    }
  }

  const variantById = new Map<string, any>();
  for (const variant of Array.isArray(variantsR.data) ? variantsR.data : []) {
    variantById.set(String(variant.id), variant);
  }

  return items.map((item: any) => {
    const productId = s(item?.product_id);
    const variantId = s(item?.variant_id);

    const product = productById.get(productId) ?? null;
    const variant = variantId ? variantById.get(variantId) ?? null : null;
    const pricing = pricingByProduct.get(productId) ?? null;

    const unit =
      item?.unit_price != null
        ? n(item.unit_price)
        : n(variant?.sale_price) > 0
          ? n(variant.sale_price)
          : n(variant?.price) > 0
            ? n(variant.price)
            : n(pricing?.sale_price) > 0
              ? n(pricing.sale_price)
              : n(pricing?.price);

    const qty = Math.max(1, Math.floor(n(item?.qty) || 1));

    return {
      ...item,
      product,
      variant,
      computed_unit_price: unit,
      line_total: unit * qty,
    };
  });
}

async function loadCheckoutStaticData(args: {
  ordersDb: any;
  storeDb: any;
  store_id: string;
  customer_id: string | null;
}) {
  const [settingsR, paymentsR, carriersR, addressesR] = await Promise.all([
    args.storeDb
      .from("store_checkout_settings")
      .select("*")
      .eq("store_id", args.store_id)
      .maybeSingle(),

    args.storeDb
      .from("store_payment_methods")
      .select("id,provider_code,enabled,status,config,sort_order")
      .eq("store_id", args.store_id)
      .eq("enabled", true)
      .eq("status", "active")
      .order("sort_order", { ascending: true }),

    args.storeDb
      .from("store_shipping_carriers")
      .select("id,type,display_name,enabled,is_enabled,status,carrier_id")
      .eq("store_id", args.store_id)
      .eq("status", "active")
      .order("created_at", { ascending: true }),

    args.customer_id
      ? args.ordersDb
          .from("customer_addresses")
          .select(
            "id,label,recipient_name,phone_e164,country_id,city_id,district_id,address_line1,address_line2,postal_code,notes,lat,lng,is_default,created_at,updated_at",
          )
          .eq("customer_id", args.customer_id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  if (settingsR.error) throw new Error(settingsR.error.message);
  if (paymentsR.error) throw new Error(paymentsR.error.message);
  if (carriersR.error) throw new Error(carriersR.error.message);
  if (addressesR.error) throw new Error(addressesR.error.message);

  const carriers = (Array.isArray(carriersR.data) ? carriersR.data : []).filter(
    (carrier: any) => {
      const enabled =
        carrier?.enabled === true ||
        carrier?.is_enabled === true ||
        carrier?.enabled === 1 ||
        carrier?.is_enabled === 1;

      return enabled && s(carrier?.status) === "active";
    },
  );

  const carrierIds = carriers
    .map((carrier: any) => s(carrier?.id))
    .filter(Boolean);

  const ratesR = carrierIds.length
    ? await args.storeDb
        .from("store_shipping_rates")
        .select(
          "id,store_shipping_carrier_id,scope,excluded_city_ids,included_city_ids,pricing_type,merchant_cost,customer_price,first_weight_kg,additional_kg_cost,eta_text,cod_enabled,cod_fee_customer,cod_fee_include_tax,currency,enabled,status",
        )
        .eq("store_id", args.store_id)
        .eq("enabled", true)
        .eq("status", "active")
        .in("store_shipping_carrier_id", carrierIds)
    : ({ data: [], error: null } as any);

  if (ratesR.error) throw new Error(ratesR.error.message);

  return {
    settings: settingsR.data ?? null,
    payments: Array.isArray(paymentsR.data) ? paymentsR.data : [],
    shipping: {
      carriers,
      rates: Array.isArray(ratesR.data) ? ratesR.data : [],
    },
    addresses: Array.isArray(addressesR.data) ? addressesR.data : [],
  };
}

async function loadCartCoupon(args: {
  ordersDb: any;
  store_id: string;
  cart_id: string;
}) {
  const cartCouponR = await args.ordersDb
    .from("cart_coupons")
    .select("id,coupon_id,code,discount_amount")
    .eq("cart_id", args.cart_id)
    .eq("store_id", args.store_id)
    .limit(1)
    .maybeSingle();

  if (cartCouponR.error) throw new Error(cartCouponR.error.message);

  return cartCouponR.data ?? null;
}

export async function GET() {
  try {
    const store_id = await getStoreIdOrThrow();
    const session_id = await getCartSessionIdFromCookie();

    const ordersDb: any = await getOrdersDb(store_id);
    const storeDb: any = await getStoreDb(store_id);

    const [cart, currencyInfo] = await Promise.all([
      getExistingOpenCart({
        store_id,
        session_id,
      }),
      getStoreCurrencyInfo(store_id),
    ]);

    const customer_id = cart?.user_id ? String(cart.user_id) : null;

    const staticData = await loadCheckoutStaticData({
      ordersDb,
      storeDb,
      store_id,
      customer_id,
    });

    if (!cart?.id) {
      const res = NextResponse.json(
        {
          ok: true,
          store_id,
          cart: null,
          items: [],
          coupon: null,
          addresses: staticData.addresses,
          shipping: staticData.shipping,
          payments: staticData.payments,
          settings: staticData.settings,
          summary: emptySummary(currencyInfo),
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );

      return withCartCookie(res, session_id);
    }

    const cartId = String(cart.id);

    const [items, coupon, summary] = await Promise.all([
      loadCartItemsForDisplay({
        ordersDb,
        storeDb,
        store_id,
        cart_id: cartId,
      }),

      loadCartCoupon({
        ordersDb,
        store_id,
        cart_id: cartId,
      }),

      buildCartSummary({
        store_id,
        cart_id: cartId,
      }),
    ]);

    const res = NextResponse.json(
      {
        ok: true,
        store_id,
        cart,
        items,
        coupon,
        addresses: staticData.addresses,
        shipping: staticData.shipping,
        payments: staticData.payments,
        settings: staticData.settings,
        summary,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );

    return withCartCookie(res, session_id);
  } catch (e: any) {
    return jsonError(e?.message || "CHECKOUT_BOOTSTRAP_FAILED", 500);
  }
}
