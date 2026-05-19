// FILE: apps/storefront/src/app/api/cart/coupon/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/data/store/supabase.server";

import {
  cartSessionCookie,
  getCartSessionId,
  getOrCreateOpenCart,
  getStoreIdOrThrow,
} from "../../_cart/cart.server";

export const dynamic = "force-dynamic";

const COOKIE_DOMAIN = process.env.SESSION_COOKIE_DOMAIN || undefined;

/* ----------------------- money helpers ----------------------- */

function toNumber(x: any): number {
  const n = Number(x ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function pickSaleOrPrice(row: any): number {
  const sale = toNumber(row?.sale_price);
  if (sale > 0) return sale;

  return toNumber(row?.price);
}

/** نحسب subtotal زي /api/cart (نفس القاعدة) */
async function computeCartSubtotal(
  sb: any,
  args: { store_id: string; cart_id: string },
) {
  const itemsR = await sb
    .from("cart_items")
    .select("product_id,variant_id,qty,selected_option_value_ids")
    .eq("cart_id", args.cart_id);

  if (itemsR.error) throw new Error(itemsR.error.message);

  const items = Array.isArray(itemsR.data) ? itemsR.data : [];
  if (items.length === 0) return 0;

  const productIds = Array.from(
    new Set(items.map((x: any) => String(x.product_id)).filter(Boolean)),
  );

  if (!productIds.length) return 0;

  const pricingR = await sb
    .from("product_pricing")
    .select("product_id,price,sale_price")
    .in("product_id", productIds);

  if (pricingR.error) throw new Error(pricingR.error.message);

  const pricingMap = new Map<string, any>();

  for (const pr of (pricingR.data || []) as any[]) {
    pricingMap.set(String(pr.product_id), pr);
  }

  const variantIds = Array.from(
    new Set(
      items
        .map((x: any) => (x?.variant_id ? String(x.variant_id) : ""))
        .filter(Boolean),
    ),
  );

  const variantsR =
    variantIds.length > 0
      ? await sb
          .from("product_variants")
          .select("id,price,sale_price")
          .in("id", variantIds)
      : { data: [], error: null };

  if ((variantsR as any).error) {
    throw new Error((variantsR as any).error.message);
  }

  const variantById = new Map<string, any>();

  for (const v of ((variantsR as any).data || []) as any[]) {
    variantById.set(String(v.id), v);
  }

  const allSelected = new Set<string>();

  for (const it of items) {
    if (it?.variant_id) continue;

    const selected = Array.isArray(it.selected_option_value_ids)
      ? it.selected_option_value_ids.map(String).filter(Boolean)
      : [];

    for (const vid of selected) {
      allSelected.add(vid);
    }
  }

  const selectedIds = Array.from(allSelected);

  const valuesR =
    selectedIds.length > 0
      ? await sb
          .from("product_option_values")
          .select("id,extra_price")
          .in("id", selectedIds)
      : { data: [], error: null };

  if ((valuesR as any).error) {
    throw new Error((valuesR as any).error.message);
  }

  const valueById = new Map<string, any>();

  for (const v of ((valuesR as any).data || []) as any[]) {
    valueById.set(String(v.id), v);
  }

  let subtotal = 0;

  for (const it of items) {
    const pid = String(it.product_id);
    const qty = Math.max(1, Math.floor(toNumber(it.qty)));
    const variant_id = it.variant_id ? String(it.variant_id) : null;

    let unit_price = 0;

    if (variant_id && variantById.has(variant_id)) {
      unit_price = pickSaleOrPrice(variantById.get(variant_id));
    } else {
      unit_price = pickSaleOrPrice(pricingMap.get(pid));
    }

    if (!variant_id) {
      const selected = Array.isArray(it.selected_option_value_ids)
        ? it.selected_option_value_ids.map(String).filter(Boolean)
        : [];

      let extra = 0;

      for (const vid of selected) {
        const v = valueById.get(String(vid));
        if (v) extra += toNumber(v.extra_price);
      }

      unit_price += extra;
    }

    subtotal += unit_price * qty;
  }

  return subtotal;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { code?: string };
    const code = String(body?.code ?? "").trim();

    if (!code) {
      return NextResponse.json({ error: "MISSING_CODE" }, { status: 400 });
    }

    const store_id = await getStoreIdOrThrow();
    const sid = await getCartSessionId();
    const sb: any = supabaseAdmin();

    const cart = await getOrCreateOpenCart({ store_id, session_id: sid });

    const couponR = await sb
      .from("coupons")
      .select("*")
      .eq("store_id", store_id)
      .eq("code", code)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (couponR.error) throw new Error(couponR.error.message);

    const coupon = couponR.data ?? null;

    if (!coupon?.id) {
      return NextResponse.json(
        { error: "COUPON_NOT_FOUND", message: "الكوبون غير صحيح." },
        { status: 400 },
      );
    }

    const now = new Date();

    if (coupon.start_at && new Date(coupon.start_at) > now) {
      return NextResponse.json(
        { error: "COUPON_NOT_STARTED", message: "هذا الكوبون لم يبدأ بعد." },
        { status: 400 },
      );
    }

    if (coupon.end_at && new Date(coupon.end_at) < now) {
      return NextResponse.json(
        { error: "COUPON_EXPIRED", message: "هذا الكوبون منتهي." },
        { status: 400 },
      );
    }

    const subtotal = await computeCartSubtotal(sb, {
      store_id,
      cart_id: cart.id,
    });

    const minAmount = toNumber(coupon.minimum_amount);

    if (minAmount > 0 && subtotal < minAmount) {
      return NextResponse.json(
        {
          error: "MIN_ORDER_NOT_MET",
          message: `الحد الأدنى للطلب لهذا الكوبون هو ${minAmount}.`,
        },
        { status: 400 },
      );
    }

    if (typeof coupon.usage_limit === "number" && coupon.usage_limit > 0) {
      const usedR = await sb
        .from("coupon_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("store_id", store_id)
        .eq("coupon_id", coupon.id);

      if (usedR.error) throw new Error(usedR.error.message);

      const used = usedR.count ?? 0;

      if (used >= coupon.usage_limit) {
        return NextResponse.json(
          {
            error: "USAGE_LIMIT_REACHED",
            message: "تم الوصول لحد استخدام هذا الكوبون.",
          },
          { status: 400 },
        );
      }
    }

    let discount = 0;

    const dtype = String(coupon.discount_type);
    const amount = toNumber(coupon.amount);
    const maxCap =
      coupon.maximum_amount == null ? null : toNumber(coupon.maximum_amount);

    if (dtype === "P") {
      discount = subtotal * (amount / 100);
    } else {
      discount = amount;
    }

    if (maxCap !== null && maxCap > 0) {
      discount = Math.min(discount, maxCap);
    }

    discount = Math.max(0, Math.min(discount, subtotal));

    const upR = await sb
      .from("cart_coupons")
      .upsert(
        {
          store_id,
          cart_id: cart.id,
          coupon_id: coupon.id,
          code: coupon.code,
          discount_amount: discount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "cart_id" },
      )
      .select("id,code,discount_amount,coupon_id")
      .single();

    if (upR.error) throw new Error(upR.error.message);

    const res = NextResponse.json({
      data: {
        cart_id: cart.id,
        coupon: {
          id: String(upR.data.id),
          coupon_id: String(upR.data.coupon_id),
          code: String(upR.data.code),
          discount_amount: Number(upR.data.discount_amount ?? 0),
        },
      },
    });

    const c = cartSessionCookie(sid);

    res.cookies.set(c.name, c.value, {
      httpOnly: c.httpOnly,
      sameSite: c.sameSite,
      path: c.path,
      secure: c.secure,
      maxAge: c.maxAge,
      ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
    });

    return res;
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const store_id = await getStoreIdOrThrow();
    const sid = await getCartSessionId();
    const sb: any = supabaseAdmin();

    const cart = await getOrCreateOpenCart({ store_id, session_id: sid });

    const delR = await sb.from("cart_coupons").delete().eq("cart_id", cart.id);

    if (delR.error) throw new Error(delR.error.message);

    const res = NextResponse.json({
      data: { cart_id: cart.id, removed: true },
    });

    const c = cartSessionCookie(sid);

    res.cookies.set(c.name, c.value, {
      httpOnly: c.httpOnly,
      sameSite: c.sameSite,
      path: c.path,
      secure: c.secure,
      maxAge: c.maxAge,
      ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
    });

    return res;
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}