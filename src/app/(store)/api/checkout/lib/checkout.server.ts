// FILE: apps/storefront/src/app/(store)/api/checkout/lib/checkout.server.ts

import { supabaseAdmin } from "@/data/store/supabase.server";
import { isProductVisibleInWeb } from "@/data/catalog/products";

/* -------------------------------- Types --------------------------------- */

export type CartRow = {
  id: string;
  store_id: string;
  user_id: string | null;
  session_id: string | null;
  status: "open" | "converted" | "abandoned";
  currency: string;
  coupon_id: string | null;
  coupon_discount: number | null;
};

type CartItemRow = {
  id: string;
  cart_id: string;
  store_id: string;
  product_id: string;
  variant_id: string | null;
  qty: number;
  currency: string;
  unit_price: number | null;
  selected_option_value_ids: string[];
  line_key: string;
};

export type CouponRow = {
  id: string;
  store_id: string;
  code: string;
  discount_type: "P" | "F";
  amount: number;
  maximum_amount: number | null;
  show_maximum_amount: boolean;
  start_at: string | null;
  end_at: string | null;
  free_shipping: boolean;
  exclude_sale_products: boolean;
  minimum_amount: number | null;
  usage_limit: number | null;
  usage_limit_per_user: number | null;
  status: "active" | "inactive";
};

export type PricingLine = {
  item_id: string;
  product_id: string;
  variant_id: string | null;
  qty: number;
  unit_price: number;
  line_total: number;
};

export type CheckoutPrepared = {
  cart_id: string;
  currency: string;
  lines: PricingLine[];
  subtotal: number;
  discount: number;
  shipping_amount: number;
  tax_amount: number;
  total: number;
  coupon: null | {
    id: string;
    code: string;
    discount_type: "P" | "F";
    amount: number;
    maximum_amount: number | null;
    free_shipping: boolean;
  };
};

/* -------------------------------- Utils --------------------------------- */

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function clampMoney(x: number) {
  return Math.max(0, Math.round(x * 100) / 100);
}

async function cleanupHiddenProductsFromCart(args: {
  sb: any;
  cart_id: string;
  store_id: string;
  items: CartItemRow[];
}) {
  const { sb, cart_id, store_id, items } = args;

  if (!items.length) return items;

  const productIds = Array.from(
    new Set(items.map((x) => String(x.product_id)).filter(Boolean)),
  );

  if (!productIds.length) return items;

  const productsR = await sb
    .from("products")
    .select("id,status,metadata")
    .eq("store_id", store_id)
    .in("id", productIds);

  if (productsR.error) throw new Error(productsR.error.message);

  const visibleIds = new Set<string>();
  for (const row of Array.isArray(productsR.data) ? productsR.data : []) {
    if (
      isProductVisibleInWeb({
        status: row?.status,
        metadata: row?.metadata,
      })
    ) {
      visibleIds.add(String(row.id));
    }
  }

  const hiddenItemIds = items
    .filter((it) => !visibleIds.has(String(it.product_id)))
    .map((it) => String(it.id));

  if (hiddenItemIds.length) {
    const delR = await sb
      .from("cart_items")
      .delete()
      .eq("cart_id", cart_id)
      .in("id", hiddenItemIds);

    if (delR.error) throw new Error(delR.error.message);
  }

  return items.filter((it) => visibleIds.has(String(it.product_id)));
}

/* ------------------------------ Pricing --------------------------------- */

async function resolveUnitPrice(args: {
  sb: any;
  product_id: string;
  variant_id: string | null;
  currency: string;
}): Promise<number> {
  const { sb, product_id, variant_id, currency } = args;

  if (variant_id) {
    const vR = await sb
      .from("product_variants")
      .select("price,sale_price")
      .eq("id", variant_id)
      .limit(1)
      .maybeSingle();

    if (vR.error) throw new Error(vR.error.message);

    const price = n(vR.data?.price);
    const sale = n(vR.data?.sale_price);
    return sale > 0 ? sale : price;
  }

  const pR = await sb
    .from("product_pricing")
    .select("price,sale_price")
    .eq("product_id", product_id)
    .eq("currency", currency)
    .limit(1)
    .maybeSingle();

  if (pR.error) throw new Error(pR.error.message);

  const price = n(pR.data?.price);
  const sale = n(pR.data?.sale_price);
  return sale > 0 ? sale : price;
}

/* -------------------------- Coupon Validation --------------------------- */

export async function findValidCouponByCode(args: {
  store_id: string;
  code: string;
}): Promise<CouponRow | null> {
  const sb: any = supabaseAdmin();

  const codeInput = String(args.code || "").trim();
  if (!codeInput) return null;

  const r = await sb
    .from("coupons")
    .select("*")
    .eq("store_id", args.store_id)
    .ilike("code", codeInput)
    .limit(1)
    .maybeSingle();

  if (r.error) throw new Error(r.error.message);

  const c = (r.data as CouponRow | null) ?? null;
  if (!c?.id) return null;

  if (c.status !== "active") return null;

  const now = Date.now();
  if (c.start_at && Date.parse(c.start_at) > now) return null;
  if (c.end_at && Date.parse(c.end_at) < now) return null;

  return c;
}

async function getCouponUsageCounts(args: {
  sb: any;
  store_id: string;
  coupon_id: string;
  customer_id: string | null;
}) {
  const { sb, store_id, coupon_id, customer_id } = args;

  const totalR = await sb
    .from("coupon_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("store_id", store_id)
    .eq("coupon_id", coupon_id);

  if (totalR.error) throw new Error(totalR.error.message);

  let perUser = 0;
  if (customer_id) {
    const userR = await sb
      .from("coupon_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("store_id", store_id)
      .eq("coupon_id", coupon_id)
      .eq("customer_id", customer_id);

    if (userR.error) throw new Error(userR.error.message);
    perUser = Number(userR.count ?? 0);
  }

  return { total: Number(totalR.count ?? 0), perUser };
}

function computeCouponDiscount(args: { coupon: CouponRow; subtotal: number }) {
  const { coupon, subtotal } = args;
  if (subtotal <= 0) return 0;

  let discount = 0;

  if (coupon.discount_type === "P") {
    const pct = Math.max(0, n(coupon.amount));
    discount = (subtotal * pct) / 100;
  } else {
    discount = Math.max(0, n(coupon.amount));
  }

  if (coupon.maximum_amount != null) {
    discount = Math.min(discount, Math.max(0, n(coupon.maximum_amount)));
  }

  discount = Math.min(discount, subtotal);
  return clampMoney(discount);
}

export async function resolveAppliedCoupon(args: {
  sb: any;
  store_id: string;
  cart_id: string;
  customer_id: string | null;
  subtotal: number;
}) {
  const { sb, store_id, cart_id, customer_id, subtotal } = args;

  const ccR = await sb
    .from("cart_coupons")
    .select("coupon_id,code")
    .eq("store_id", store_id)
    .eq("cart_id", cart_id)
    .limit(1)
    .maybeSingle();

  if (ccR.error) throw new Error(ccR.error.message);
  if (!ccR.data?.coupon_id)
    return { coupon: null as CouponRow | null, discount: 0 };

  const couponId = String(ccR.data.coupon_id);

  const cR = await sb
    .from("coupons")
    .select("*")
    .eq("id", couponId)
    .eq("store_id", store_id)
    .limit(1)
    .maybeSingle();

  if (cR.error) throw new Error(cR.error.message);

  const coupon = (cR.data as CouponRow | null) ?? null;
  if (!coupon?.id) return { coupon: null, discount: 0 };

  if (coupon.status !== "active") return { coupon: null, discount: 0 };

  const now = Date.now();
  if (coupon.start_at && Date.parse(coupon.start_at) > now)
    return { coupon: null, discount: 0 };
  if (coupon.end_at && Date.parse(coupon.end_at) < now)
    return { coupon: null, discount: 0 };

  if (coupon.minimum_amount != null && subtotal < n(coupon.minimum_amount)) {
    return { coupon: null, discount: 0 };
  }

  const counts = await getCouponUsageCounts({
    sb,
    store_id,
    coupon_id: coupon.id,
    customer_id,
  });

  if (coupon.usage_limit != null && counts.total >= n(coupon.usage_limit)) {
    return { coupon: null, discount: 0 };
  }

  if (coupon.usage_limit_per_user != null && !customer_id) {
    return { coupon: null, discount: 0 };
  }

  if (
    coupon.usage_limit_per_user != null &&
    customer_id &&
    counts.perUser >= n(coupon.usage_limit_per_user)
  ) {
    return { coupon: null, discount: 0 };
  }

  const discount = computeCouponDiscount({ coupon, subtotal });
  return { coupon, discount };
}

/* ---------------- Shipping (minimal v1) ---------------- */

async function computeShippingAmount(args: {
  sb: any;
  store_id: string;
  cart_id: string;
  city_id?: string | null;
}): Promise<number> {
  const { sb, store_id, city_id } = args;

  const r = await sb
    .from("store_shipping_rates")
    .select("*")
    .eq("store_id", store_id)
    .eq("enabled", true)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(50);

  if (r.error) throw new Error(r.error.message);

  const rates = Array.isArray(r.data) ? r.data : [];
  if (rates.length === 0) return 0;

  function cityAllowed(rate: any) {
    if (!city_id) return rate.scope === "all_cities";
    if (rate.scope === "all_cities") {
      const ex = Array.isArray(rate.excluded_city_ids)
        ? rate.excluded_city_ids
        : [];
      return !ex.map(String).includes(String(city_id));
    }
    if (rate.scope === "include_cities") {
      const inc = Array.isArray(rate.included_city_ids)
        ? rate.included_city_ids
        : [];
      return inc.map(String).includes(String(city_id));
    }
    return true;
  }

  const picked = rates.find(cityAllowed) ?? rates[0];

  if (picked.pricing_type === "flat") {
    return clampMoney(n(picked.customer_price));
  }

  const itemsR = await sb
    .from("cart_items")
    .select("product_id,qty")
    .eq("cart_id", args.cart_id)
    .eq("store_id", store_id);

  if (itemsR.error) throw new Error(itemsR.error.message);
  const itemsRaw = Array.isArray(itemsR.data) ? itemsR.data : [];

  const productIds = Array.from(
    new Set(itemsRaw.map((x: any) => String(x.product_id)).filter(Boolean)),
  );

  let visibleIds = new Set<string>();

  if (productIds.length) {
    const productsR = await sb
      .from("products")
      .select("id,status,metadata")
      .eq("store_id", store_id)
      .in("id", productIds);

    if (productsR.error) throw new Error(productsR.error.message);

    for (const row of Array.isArray(productsR.data) ? productsR.data : []) {
      if (
        isProductVisibleInWeb({
          status: row?.status,
          metadata: row?.metadata,
        })
      ) {
        visibleIds.add(String(row.id));
      }
    }
  }

  const items = itemsRaw.filter((x: any) =>
    visibleIds.has(String(x.product_id)),
  );

  const visibleProductIds = Array.from(
    new Set(items.map((x: any) => String(x.product_id)).filter(Boolean)),
  );

  if (!visibleProductIds.length) return 0;

  const wR = await sb
    .from("product_shipping")
    .select("product_id,weight,weight_unit")
    .in("product_id", visibleProductIds);

  if (wR.error) throw new Error(wR.error.message);

  const wMap = new Map<string, { weight: number; unit: string | null }>();
  for (const row of Array.isArray(wR.data) ? wR.data : []) {
    wMap.set(String(row.product_id), {
      weight: n(row.weight),
      unit: row.weight_unit ?? null,
    });
  }

  let totalKg = 0;
  for (const it of items) {
    const pid = String(it.product_id);
    const qty = Math.max(1, Math.floor(n(it.qty)));
    const w = wMap.get(pid);
    if (!w) continue;

    let kg = w.weight;
    const unit = (w.unit || "kg").toLowerCase();
    if (unit === "g") kg = kg / 1000;
    if (unit === "lb") kg = kg * 0.45359237;
    if (unit === "oz") kg = kg * 0.0283495231;

    totalKg += kg * qty;
  }

  const first = n(picked.first_weight_kg);
  const add = n(picked.additional_kg_cost);
  const base = n(picked.customer_price);

  if (first <= 0) return clampMoney(base);
  if (totalKg <= first) return clampMoney(base);

  const extraKg = Math.ceil(totalKg - first);
  return clampMoney(base + extraKg * add);
}

/* ------------------------------ Prepare --------------------------------- */

export async function prepareCheckout(args: {
  cart: CartRow;
  city_id?: string | null;
}): Promise<CheckoutPrepared> {
  const sb: any = supabaseAdmin();

  const cart_id = String(args.cart.id);
  const store_id = String(args.cart.store_id);
  const currency = String(args.cart.currency || "SAR");
  const customer_id = args.cart.user_id ? String(args.cart.user_id) : null;

  const itemsR = await sb
    .from("cart_items")
    .select(
      "id,cart_id,store_id,product_id,variant_id,qty,currency,unit_price,selected_option_value_ids,line_key",
    )
    .eq("cart_id", cart_id)
    .eq("store_id", store_id);

  if (itemsR.error) throw new Error(itemsR.error.message);

  const rawItems: CartItemRow[] = (
    Array.isArray(itemsR.data) ? itemsR.data : []
  ).map((x: any) => ({
    id: String(x.id),
    cart_id: String(x.cart_id),
    store_id: String(x.store_id),
    product_id: String(x.product_id),
    variant_id: x.variant_id ? String(x.variant_id) : null,
    qty: Math.max(1, Math.floor(n(x.qty))),
    currency: String(x.currency || currency),
    unit_price: x.unit_price == null ? null : n(x.unit_price),
    selected_option_value_ids: Array.isArray(x.selected_option_value_ids)
      ? x.selected_option_value_ids.map(String)
      : [],
    line_key: String(x.line_key),
  }));

  const items = await cleanupHiddenProductsFromCart({
    sb,
    cart_id,
    store_id,
    items: rawItems,
  });

  const lines: PricingLine[] = [];
  let subtotal = 0;

  for (const it of items) {
    const unit =
      it.unit_price != null
        ? n(it.unit_price)
        : await resolveUnitPrice({
            sb,
            product_id: it.product_id,
            variant_id: it.variant_id,
            currency,
          });

    const line_total = clampMoney(unit * it.qty);
    subtotal += line_total;

    lines.push({
      item_id: it.id,
      product_id: it.product_id,
      variant_id: it.variant_id,
      qty: it.qty,
      unit_price: clampMoney(unit),
      line_total,
    });
  }

  subtotal = clampMoney(subtotal);

  const applied = await resolveAppliedCoupon({
    sb,
    store_id,
    cart_id,
    customer_id,
    subtotal,
  });

  const coupon = applied.coupon;
  const discount = applied.discount;

  let shipping_amount = await computeShippingAmount({
    sb,
    store_id,
    cart_id,
    city_id: args.city_id ?? null,
  });

  if (coupon?.free_shipping) shipping_amount = 0;

  const tax_amount = 0;
  const total = clampMoney(subtotal - discount + shipping_amount + tax_amount);

  return {
    cart_id,
    currency,
    lines,
    subtotal,
    discount,
    shipping_amount,
    tax_amount,
    total,
    coupon: coupon
      ? {
          id: String(coupon.id),
          code: String(coupon.code),
          discount_type: coupon.discount_type,
          amount: n(coupon.amount),
          maximum_amount:
            coupon.maximum_amount == null ? null : n(coupon.maximum_amount),
          free_shipping: Boolean(coupon.free_shipping),
        }
      : null,
  };
}