// FILE: apps/storefront/src/app/(store)/api/checkout/apply-coupon/route.ts

import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/data/store/supabase.server";
import {
  cartSessionCookie,
  getCartSessionIdFromCookie,
  getExistingOpenCart,
  getStoreIdOrThrow,
} from "../../_cart/cart.server";
import { buildCartSummary } from "../lib/summary";
import {
  findCouponByCodeWithReason,
  normalizeCouponCode,
  type CouponLookupError,
} from "../lib/checkout.server";

export const dynamic = "force-dynamic";

/* --------------------------------- Utils -------------------------------- */

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

/* ------------------------------ Error mapping ----------------------------- */

function couponErrorArabic(code: string) {
  switch (code) {
    case "CODE_REQUIRED":
      return "اكتب رمز الكوبون أولًا.";

    case "COUPON_NOT_FOUND_OR_INVALID":
      return "رمز الكوبون غير صحيح. تأكد من الرمز وحاول مرة أخرى.";

    case "COUPON_INACTIVE":
      return "هذا الكوبون غير مفعل حاليًا.";

    case "COUPON_NOT_STARTED":
      return "هذا الكوبون لم يبدأ بعد.";

    case "COUPON_EXPIRED":
      return "انتهت صلاحية هذا الكوبون.";

    case "MINIMUM_AMOUNT_NOT_MET":
      return "قيمة الطلب لا تحقق الحد الأدنى لتطبيق الكوبون.";

    case "USAGE_LIMIT_REACHED":
      return "تم الوصول للحد الأقصى لاستخدام هذا الكوبون.";

    case "LOGIN_REQUIRED_FOR_THIS_COUPON":
      return "لاستخدام هذا الكوبون يجب تسجيل الدخول أولًا.";

    case "USAGE_LIMIT_PER_USER_REACHED":
      return "لقد استخدمت هذا الكوبون من قبل ولا يمكن استخدامه مرة أخرى.";

    case "COUPON_NOT_APPLICABLE":
      return "هذا الكوبون لا ينطبق على محتويات سلتك.";

    case "CART_NOT_FOUND":
      return "تعذر العثور على السلة.";

    case "CART_EMPTY":
      return "سلة المشتريات فارغة.";

    default:
      return "تعذر تطبيق الكوبون. حاول مرة أخرى.";
  }
}

function jsonError(code: string, status = 400, extra?: any) {
  return NextResponse.json(
    {
      ok: false,
      error: code,
      message_ar: couponErrorArabic(code),
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

  return {
    total: Number(totalR.count ?? 0),
    perUser,
  };
}

async function getCartSubtotalFast(args: {
  sb: any;
  store_id: string;
  cart_id: string;
}) {
  const r = await args.sb
    .from("cart_items")
    .select("id,qty,unit_price")
    .eq("store_id", args.store_id)
    .eq("cart_id", args.cart_id);

  if (r.error) throw new Error(r.error.message);

  const rows = Array.isArray(r.data) ? r.data : [];

  let subtotal = 0;
  let hasUnknownPrice = false;

  for (const row of rows) {
    const qty = Math.max(1, Math.floor(n(row?.qty) || 1));

    if (row?.unit_price == null) {
      hasUnknownPrice = true;
      continue;
    }

    subtotal += Math.max(0, n(row.unit_price)) * qty;
  }

  return {
    item_count: rows.length,
    subtotal: round2(Math.max(0, subtotal)),
    has_unknown_price: hasUnknownPrice,
  };
}

async function clearCouponFromCart(args: {
  sb: any;
  store_id: string;
  cart_id: string;
}) {
  const now = new Date().toISOString();

  await Promise.all([
    args.sb
      .from("cart_coupons")
      .delete()
      .eq("store_id", args.store_id)
      .eq("cart_id", args.cart_id),

    args.sb
      .from("carts")
      .update({
        coupon_id: null,
        coupon_discount: 0,
        last_activity_at: now,
        updated_at: now,
      })
      .eq("id", args.cart_id)
      .eq("store_id", args.store_id),
  ]);
}

function needsUsageCheck(coupon: any) {
  return coupon?.usage_limit != null || coupon?.usage_limit_per_user != null;
}

function lookupErrorToStatus(error: CouponLookupError | null | undefined) {
  if (error === "CODE_REQUIRED") return 400;
  if (error === "COUPON_NOT_FOUND_OR_INVALID") return 400;
  if (error === "COUPON_INACTIVE") return 400;
  if (error === "COUPON_NOT_STARTED") return 400;
  if (error === "COUPON_EXPIRED") return 400;

  return 400;
}

export async function POST(req: Request) {
  try {
    const sb: any = supabaseAdmin();

    const store_id = await getStoreIdOrThrow();
    const session_id = await getCartSessionIdFromCookie();

    const cart = await getExistingOpenCart({
      store_id,
      session_id,
    });

    const cart_id = s(cart?.id);

    if (!cart_id) {
      return jsonError("CART_NOT_FOUND", 404);
    }

    const body = await req.json().catch(() => ({}));
    const codeRaw = s(body?.code);

    if (!codeRaw) {
      return jsonError("CODE_REQUIRED", 400);
    }

    const lookup = await findCouponByCodeWithReason({
      store_id,
      code: codeRaw,
    });

    if (!lookup.ok || !lookup.coupon?.id) {
      const code = lookup.error || "COUPON_NOT_FOUND_OR_INVALID";

      return jsonError(code, lookupErrorToStatus(code), {
        code: normalizeCouponCode(codeRaw),
      });
    }

    const coupon = lookup.coupon;

    const fastCart = await getCartSubtotalFast({
      sb,
      store_id,
      cart_id,
    });

    if (fastCart.item_count <= 0) {
      return jsonError("CART_EMPTY", 400);
    }

    if (
      !fastCart.has_unknown_price &&
      coupon.minimum_amount != null &&
      fastCart.subtotal < n(coupon.minimum_amount)
    ) {
      return jsonError("MINIMUM_AMOUNT_NOT_MET", 400, {
        minimum_amount: n(coupon.minimum_amount),
        subtotal: fastCart.subtotal,
      });
    }

    const customer_id = cart?.user_id ? String(cart.user_id) : null;

    if (needsUsageCheck(coupon)) {
      const counts = await getCouponUsageCounts(sb, {
        store_id,
        coupon_id: coupon.id,
        customer_id,
      });

      if (coupon.usage_limit != null && counts.total >= n(coupon.usage_limit)) {
        return jsonError("USAGE_LIMIT_REACHED", 400);
      }

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
    }

    const now = new Date().toISOString();

    const up = await sb
      .from("cart_coupons")
      .upsert(
        {
          store_id,
          cart_id,
          coupon_id: coupon.id,
          code: String(coupon.code),
          discount_amount: 0,
          updated_at: now,
        },
        { onConflict: "cart_id" },
      )
      .select("id")
      .single();

    if (up.error) {
      return jsonError("COUPON_NOT_APPLICABLE", 500, {
        message: up.error.message,
      });
    }

    await sb
      .from("carts")
      .update({
        coupon_id: coupon.id,
        coupon_discount: 0,
        last_activity_at: now,
        updated_at: now,
      })
      .eq("id", cart_id)
      .eq("store_id", store_id);

    const summary = await buildCartSummary({
      store_id,
      cart_id,
    });

    const expectedCode = normalizeCouponCode(coupon.code);
    const appliedCode = normalizeCouponCode(summary?.coupon?.code);

    if (!summary?.coupon?.code || appliedCode !== expectedCode) {
      await clearCouponFromCart({
        sb,
        store_id,
        cart_id,
      });

      const subtotal = n(summary?.subtotal ?? fastCart.subtotal);
      const minimum = n(coupon.minimum_amount);

      if (minimum > 0 && subtotal < minimum) {
        return jsonError("MINIMUM_AMOUNT_NOT_MET", 400, {
          minimum_amount: minimum,
          subtotal,
        });
      }

      return jsonError("COUPON_NOT_APPLICABLE", 400, {
        code: expectedCode,
        subtotal,
      });
    }

    return jsonOk({
      session_id,
      payload: {
        ok: true,
        summary,
      },
    });
  } catch (e: any) {
    console.error("[checkout/apply-coupon]", e);

    return jsonError("APPLY_COUPON_FAILED", 500, {
      message: e?.message || "Unknown error",
    });
  }
}