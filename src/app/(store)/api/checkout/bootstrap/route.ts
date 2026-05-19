// apps/storefront/src/app/(store)/api/checkout/bootstrap/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/data/store/supabase.server";

import {
  cartSessionCookie,
  getCartSessionId,
  getOrCreateOpenCart,
  getStoreIdOrThrow,
} from "../../_cart/cart.server";

import { buildCartSummary } from "../lib/summary";

export const dynamic = "force-dynamic";

function pickUnitPrice(args: { variant?: any | null; pricing?: any | null }) {
  const v = args.variant ?? null;
  const p = args.pricing ?? null;

  const vSale = Number(v?.sale_price ?? 0);
  const vPrice = Number(v?.price ?? 0);

  const pSale = Number(p?.sale_price ?? 0);
  const pPrice = Number(p?.price ?? 0);

  if (vSale > 0) return vSale;
  if (vPrice > 0) return vPrice;
  if (pSale > 0) return pSale;
  return pPrice > 0 ? pPrice : 0;
}

export async function GET() {
  const sb: any = supabaseAdmin();

  const store_id = await getStoreIdOrThrow();
  const session_id = await getCartSessionId();
  const cart = await getOrCreateOpenCart({ store_id, session_id });

  // ✅ عناصر السلة
  const itemsR = await sb
    .from("cart_items")
    .select(
      "id,cart_id,store_id,product_id,variant_id,qty,currency,unit_price,selected_option_value_ids,line_key,created_at,updated_at",
    )
    .eq("cart_id", cart.id)
    .eq("store_id", store_id);

  if (itemsR.error) {
    return NextResponse.json(
      { ok: false, error: itemsR.error.message },
      { status: 500 },
    );
  }

  const items = Array.isArray(itemsR.data) ? itemsR.data : [];
  const productIds = Array.from(
    new Set(items.map((x: any) => String(x.product_id))),
  );
  const variantIds = Array.from(
    new Set(items.map((x: any) => (x.variant_id ? String(x.variant_id) : ""))),
  ).filter(Boolean);

  // ✅ المنتجات
  const productsR =
    productIds.length === 0
      ? { data: [], error: null }
      : await sb
          .from("products")
          .select("id,name,require_shipping,store_id,status")
          .in("id", productIds)
          .eq("store_id", store_id);

  if (productsR.error) {
    return NextResponse.json(
      { ok: false, error: productsR.error.message },
      { status: 500 },
    );
  }

  // ✅ تسعير المنتجات
  const pricingR =
    productIds.length === 0
      ? { data: [], error: null }
      : await sb
          .from("product_pricing")
          .select("product_id,currency,price,sale_price")
          .in("product_id", productIds)
          .eq("currency", String(cart.currency ?? "SAR"));

  if (pricingR.error) {
    return NextResponse.json(
      { ok: false, error: pricingR.error.message },
      { status: 500 },
    );
  }

  // ✅ الفيرنت
  const variantsR =
    variantIds.length === 0
      ? { data: [], error: null }
      : await sb
          .from("product_variants")
          .select("id,product_id,sku,price,sale_price")
          .in("id", variantIds);

  if (variantsR.error) {
    return NextResponse.json(
      { ok: false, error: variantsR.error.message },
      { status: 500 },
    );
  }

  const prodById = new Map<string, any>();
  for (const p of productsR.data || []) prodById.set(String(p.id), p);

  const pricingByProduct = new Map<string, any>();
  for (const pr of pricingR.data || [])
    pricingByProduct.set(String(pr.product_id), pr);

  const variantById = new Map<string, any>();
  for (const v of variantsR.data || []) variantById.set(String(v.id), v);

  // ✅ كوبون السلة (للواجهة فقط)
  const cartCouponR = await sb
    .from("cart_coupons")
    .select("id,coupon_id,code,discount_amount")
    .eq("cart_id", cart.id)
    .eq("store_id", store_id)
    .maybeSingle();

  if (cartCouponR.error) {
    return NextResponse.json(
      { ok: false, error: cartCouponR.error.message },
      { status: 500 },
    );
  }

  // ✅ إعدادات صفحة الدفع
  const settingsR = await sb
    .from("store_checkout_settings")
    .select("*")
    .eq("store_id", store_id)
    .maybeSingle();

  if (settingsR.error) {
    return NextResponse.json(
      { ok: false, error: settingsR.error.message },
      { status: 500 },
    );
  }

  // ✅ طرق الدفع المفعلة
  const paymentsR = await sb
    .from("store_payment_methods")
    .select("id,provider_code,enabled,status,config,sort_order")
    .eq("store_id", store_id)
    .eq("enabled", true)
    .eq("status", "active")
    .order("sort_order", { ascending: true });

  if (paymentsR.error) {
    return NextResponse.json(
      { ok: false, error: paymentsR.error.message },
      { status: 500 },
    );
  }

  // ✅ شركات الشحن + الأسعار
  const carriersR = await sb
    .from("store_shipping_carriers")
    .select("id,type,display_name,enabled,status,carrier_id")
    .eq("store_id", store_id)
    .eq("enabled", true)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (carriersR.error) {
    return NextResponse.json(
      { ok: false, error: carriersR.error.message },
      { status: 500 },
    );
  }

  const carrierIds = (carriersR.data || []).map((c: any) => String(c.id));

  const ratesR =
    carrierIds.length === 0
      ? { data: [], error: null }
      : await sb
          .from("store_shipping_rates")
          .select(
            "id,store_shipping_carrier_id,scope,excluded_city_ids,included_city_ids,pricing_type,merchant_cost,customer_price,first_weight_kg,additional_kg_cost,eta_text,cod_enabled,cod_fee_customer,currency,enabled,status",
          )
          .eq("store_id", store_id)
          .eq("enabled", true)
          .eq("status", "active")
          .in("store_shipping_carrier_id", carrierIds);

  if (ratesR.error) {
    return NextResponse.json(
      { ok: false, error: ratesR.error.message },
      { status: 500 },
    );
  }

  // ✅ عناوين العميل (إن كان مسجل)
  const customer_id = cart.user_id ? String(cart.user_id) : null;

  const addressesR = customer_id
    ? await sb
        .from("customer_addresses")
        .select(
          "id,label,recipient_name,phone_e164,country_id,city_id,district_id,address_line1,address_line2,postal_code,notes,lat,lng,is_default,created_at,updated_at",
        )
        .eq("customer_id", customer_id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  if (addressesR.error) {
    return NextResponse.json(
      { ok: false, error: addressesR.error.message },
      { status: 500 },
    );
  }

  // ✅ items enriched (للعرض فقط)
  const currency = String(cart.currency || "SAR");
  const enriched = items.map((it: any) => {
    const p = prodById.get(String(it.product_id)) ?? null;
    const v = it.variant_id ? variantById.get(String(it.variant_id)) : null;
    const pr = pricingByProduct.get(String(it.product_id)) ?? null;

    const unit =
      it.unit_price != null
        ? Number(it.unit_price)
        : pickUnitPrice({ variant: v, pricing: pr });

    const qty = Math.max(1, Number(it.qty ?? 1));
    const line_total = unit * qty;

    return {
      ...it,
      product: p,
      variant: v,
      computed_unit_price: unit,
      line_total,
    };
  });

  // ✅ Summary موحّد (مصدر الحقيقة)
  const summary = await buildCartSummary({ store_id, cart_id: cart.id });

  const res = NextResponse.json({
    ok: true,
    store_id,
    cart,
    items: enriched,
    coupon: cartCouponR.data ?? null, // للعرض فقط
    addresses: addressesR.data || [],
    shipping: {
      carriers: carriersR.data || [],
      rates: ratesR.data || [],
    },
    payments: paymentsR.data || [],
    settings: settingsR.data ?? null,
    summary, // ✅ هذا اللي تعتمد عليه الواجهة
  });

  res.cookies.set(cartSessionCookie(session_id));
  return res;
}
