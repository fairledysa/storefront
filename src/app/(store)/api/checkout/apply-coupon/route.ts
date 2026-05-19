// FILE: apps/storefront/src/app/(store)/api/checkout/apply-coupon/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/data/store/supabase.server";
import {
  cartSessionCookie,
  getCartSessionId,
  getOrCreateOpenCart,
  getStoreIdOrThrow,
} from "../../_cart/cart.server";
import { buildCartSummary } from "../lib/summary";
import { findValidCouponByCode } from "../lib/checkout.server";

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function round2(x: number) {
  return Math.round(x * 100) / 100;
}

export const dynamic = "force-dynamic";

/* ------------------------------ Error mapping ----------------------------- */

function couponErrorArabic(code: string) {
  switch (code) {
    case "CODE_REQUIRED":
      return "اكتب رمز الكوبون أولاً.";

    case "COUPON_NOT_FOUND_OR_INVALID":
      return "رمز الكوبون غير صحيح. تأكد من الرمز وحاول مرة أخرى.";

    case "COUPON_EXPIRED":
      return "انتهت صلاحية هذا الكوبون.";

    case "MINIMUM_AMOUNT_NOT_MET":
      return "قيمة الطلب لا تحقق الحد الأدنى لتطبيق الكوبون.";

    case "USAGE_LIMIT_REACHED":
      return "تم الوصول للحد الأقصى لاستخدام هذا الكوبون.";

    case "LOGIN_REQUIRED_FOR_THIS_COUPON":
      return "لاستخدام هذا الكوبون يجب تسجيل الدخول أولاً.";

    case "USAGE_LIMIT_PER_USER_REACHED":
      return "لقد استخدمت هذا الكوبون من قبل ولا يمكن استخدامه مرة أخرى.";

    case "COUPON_NOT_APPLICABLE":
      return "هذا الكوبون لا ينطبق على محتويات سلتك.";

    default:
      return "تعذر تطبيق الكوبون. حاول مرة أخرى.";
  }
}

function jsonError(code: string, status = 400, extra?: any) {
  return NextResponse.json(
    {
      ok: false,
      error: code, // ✅ كود ثابت للفرونت/الديباق
      message_ar: couponErrorArabic(code), // ✅ نص عربي للمستخدم
      ...(extra ? { extra } : {}),
    },
    { status },
  );
}

/* --------------------------------- Logic -------------------------------- */

async function getCouponUsageCounts(
  sb: any,
  args: {
    store_id: string;
    coupon_id: string;
    customer_id: string | null;
  },
) {
  const totalR = await sb
    .from("coupon_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("store_id", args.store_id)
    .eq("coupon_id", args.coupon_id);

  if (totalR.error) throw new Error(totalR.error.message);

  let perUser = 0;
  if (args.customer_id) {
    const userR = await sb
      .from("coupon_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("store_id", args.store_id)
      .eq("coupon_id", args.coupon_id)
      .eq("customer_id", args.customer_id);

    if (userR.error) throw new Error(userR.error.message);
    perUser = Number(userR.count ?? 0);
  }

  return { total: Number(totalR.count ?? 0), perUser };
}

function computeDiscountFromCoupon(args: {
  coupon: any;
  eligibleSubtotal: number;
}) {
  const { coupon, eligibleSubtotal } = args;

  if (eligibleSubtotal <= 0) return 0;

  let discount = 0;

  if (String(coupon.discount_type) === "P") {
    const pct = Math.max(0, n(coupon.amount));
    discount = (eligibleSubtotal * pct) / 100;

    const max =
      coupon.maximum_amount == null
        ? null
        : Math.max(0, n(coupon.maximum_amount));
    if (max != null && max > 0) discount = Math.min(discount, max);
  } else {
    // "F"
    discount = Math.max(0, n(coupon.amount));
  }

  discount = Math.min(discount, eligibleSubtotal);
  return round2(discount);
}

export async function POST(req: Request) {
  const sb: any = supabaseAdmin();

  const store_id = await getStoreIdOrThrow();
  const session_id = await getCartSessionId();
  const cart = await getOrCreateOpenCart({ store_id, session_id });

  const body = await req.json().catch(() => ({}));
  const codeRaw = String(body?.code ?? "").trim();
  if (!codeRaw) {
    return jsonError("CODE_REQUIRED", 400);
  }

  // ✅ coupon (status + dates)
  const coupon = await findValidCouponByCode({ store_id, code: codeRaw });

  // ⚠️ إذا تقدر تعدّل findValidCouponByCode لاحقاً يرجّع سبب (expired وغيره)
  // الآن نعتبرها: غير موجود/غير صالح
  if (!coupon?.id) {
    return jsonError("COUPON_NOT_FOUND_OR_INVALID", 400);
  }

  // ✅ subtotal الحقيقي قبل الخصم
  const baseSummary = await buildCartSummary({ store_id, cart_id: cart.id });
  const subtotal = n(baseSummary.subtotal);

  if (coupon.minimum_amount != null && subtotal < n(coupon.minimum_amount)) {
    return jsonError("MINIMUM_AMOUNT_NOT_MET", 400, {
      minimum_amount: n(coupon.minimum_amount),
      subtotal,
    });
  }

  // ✅ usage limits
  const customer_id = cart.user_id ? String(cart.user_id) : null;
  const counts = await getCouponUsageCounts(sb, {
    store_id,
    coupon_id: coupon.id,
    customer_id,
  });

  if (coupon.usage_limit != null && counts.total >= n(coupon.usage_limit)) {
    return jsonError("USAGE_LIMIT_REACHED", 400);
  }

  // لو فيه حد لكل مستخدم ولا يوجد customer_id -> نرفض
  if (coupon.usage_limit_per_user != null && !customer_id) {
    return jsonError("LOGIN_REQUIRED_FOR_THIS_COUPON", 400);
  }
  if (
    coupon.usage_limit_per_user != null &&
    customer_id &&
    counts.perUser >= n(coupon.usage_limit_per_user)
  ) {
    return jsonError("USAGE_LIMIT_PER_USER_REACHED", 400);
  }

  // ✅ eligible subtotal (exclude_sale_products)
  let eligibleSubtotal = subtotal;
  if (coupon.exclude_sale_products) {
    const items = baseSummary.items || [];
    const productIds = Array.from(
      new Set(items.map((x: any) => String(x.product_id)).filter(Boolean)),
    );
    const variantIds = Array.from(
      new Set(
        items
          .map((x: any) => (x.variant_id ? String(x.variant_id) : ""))
          .filter(Boolean),
      ),
    );

    const pricingR =
      productIds.length === 0
        ? { data: [], error: null }
        : await sb
            .from("product_pricing")
            .select("product_id,currency,price,sale_price")
            .in("product_id", productIds)
            .eq("currency", baseSummary.currency);

    if (pricingR.error) throw new Error(pricingR.error.message);

    const variantsR =
      variantIds.length === 0
        ? { data: [], error: null }
        : await sb
            .from("product_variants")
            .select("id,price,sale_price")
            .in("id", variantIds);

    if (variantsR.error) throw new Error(variantsR.error.message);

    const pricingByProduct = new Map<string, any>();
    for (const pr of pricingR.data ?? [])
      pricingByProduct.set(String(pr.product_id), pr);

    const variantById = new Map<string, any>();
    for (const v of variantsR.data ?? []) variantById.set(String(v.id), v);

    let eligible = 0;
    for (const it of items) {
      const qty = Math.max(1, n(it.qty));
      const unit = n(it.unit_price);
      const pid = String(it.product_id);
      const vid = it.variant_id ? String(it.variant_id) : null;

      let basePrice = 0;
      let salePrice = 0;

      if (vid) {
        const v = variantById.get(vid);
        basePrice = n(v?.price);
        salePrice = n(v?.sale_price);
      } else {
        const pr = pricingByProduct.get(pid);
        basePrice = n(pr?.price);
        salePrice = n(pr?.sale_price);
      }

      const isSale = salePrice > 0 && unit > 0 && unit === round2(salePrice);
      if (!isSale) eligible += unit * qty;
    }

    eligibleSubtotal = round2(eligible);
  }

  const discountAmount = computeDiscountFromCoupon({
    coupon,
    eligibleSubtotal,
  });

  // ✅ upsert into cart_coupons (cart_id UNIQUE) + خزّن الخصم
  const up = await sb
    .from("cart_coupons")
    .upsert(
      {
        store_id,
        cart_id: cart.id,
        coupon_id: coupon.id,
        code: String(coupon.code),
        discount_amount: discountAmount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "cart_id" },
    )
    .select("id")
    .single();

  if (up.error) {
    return NextResponse.json(
      { ok: false, error: up.error.message },
      { status: 500 },
    );
  }

  // snapshot في carts (مو مصدر الحقيقة)
  await sb
    .from("carts")
    .update({
      coupon_id: coupon.id,
      coupon_discount: discountAmount,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", cart.id);

  const summary = await buildCartSummary({ store_id, cart_id: cart.id });

  const res = NextResponse.json({ ok: true, summary });
  res.cookies.set(cartSessionCookie(session_id));
  return res;
}
