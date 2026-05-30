// FILE: apps/storefront/src/app/(store)/api/cart/coupon/route.ts

import { NextResponse } from "next/server";
import { getOrdersDb } from "@/data/db/orders-db.server";
import { getStoreDb } from "@/data/db/store-db.server";

import {
  cartSessionCookie,
  getCartSessionId,
  getOrCreateOpenCart,
  getStoreIdOrThrow,
} from "../../_cart/cart.server";

import { buildCartSummary } from "../../checkout/lib/summary";

export const dynamic = "force-dynamic";

const COOKIE_DOMAIN = process.env.SESSION_COOKIE_DOMAIN || undefined;

function n(value: any) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function s(value: any) {
  return String(value ?? "").trim();
}

function jsonError(error: string, message: string, status = 400, extra?: any) {
  return NextResponse.json(
    {
      error,
      message,
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

function withCartCookie(res: NextResponse, sid: string) {
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
}

async function clearCartCoupon(args: {
  ordersDb: any;
  store_id: string;
  cart_id: string;
}) {
  const now = new Date().toISOString();

  await Promise.all([
    args.ordersDb
      .from("cart_coupons")
      .delete()
      .eq("store_id", args.store_id)
      .eq("cart_id", args.cart_id),

    args.ordersDb
      .from("carts")
      .update({
        coupon_discount: 0,
        last_activity_at: now,
        updated_at: now,
      })
      .eq("id", args.cart_id)
      .eq("store_id", args.store_id),
  ]);
}

async function validateUsageLimit(args: {
  ordersDb: any;
  store_id: string;
  coupon_id: string;
  usage_limit: any;
}) {
  const usageLimit = Math.floor(n(args.usage_limit));

  if (!(usageLimit > 0)) {
    return {
      ok: true as const,
      used: 0,
      usageLimit,
    };
  }

  const usedR = await args.ordersDb
    .from("coupon_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("store_id", args.store_id)
    .eq("coupon_id", args.coupon_id);

  if (usedR.error) {
    return {
      ok: false as const,
      error: usedR.error.message,
      used: 0,
      usageLimit,
    };
  }

  const used = Number(usedR.count ?? 0);

  if (used >= usageLimit) {
    return {
      ok: false as const,
      error: "USAGE_LIMIT_REACHED",
      used,
      usageLimit,
    };
  }

  return {
    ok: true as const,
    used,
    usageLimit,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { code?: string };
    const code = s(body?.code);

    if (!code) {
      return jsonError("MISSING_CODE", "أدخل كود الخصم.", 400);
    }

    const store_id = await getStoreIdOrThrow();
    const sid = await getCartSessionId();

    const [ordersDb, storeDb] = await Promise.all([
      getOrdersDb(store_id),
      getStoreDb(store_id),
    ]);

    const cart = await getOrCreateOpenCart({
      store_id,
      session_id: sid,
    });

    const cartId = s(cart?.id);

    if (!cartId) {
      return jsonError("CART_NOT_FOUND", "تعذر العثور على السلة.", 404);
    }

    const couponR = await storeDb
      .from("coupons")
      .select("*")
      .eq("store_id", store_id)
      .eq("code", code)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (couponR.error) {
      throw new Error(couponR.error.message);
    }

    const coupon = couponR.data ?? null;

    if (!coupon?.id) {
      return jsonError("COUPON_NOT_FOUND", "الكوبون غير صحيح.", 400);
    }

    const nowMs = Date.now();

    const startMs = coupon.start_at ? Date.parse(String(coupon.start_at)) : null;
    const endMs = coupon.end_at ? Date.parse(String(coupon.end_at)) : null;

    if (startMs && Number.isFinite(startMs) && startMs > nowMs) {
      return jsonError("COUPON_NOT_STARTED", "هذا الكوبون لم يبدأ بعد.", 400);
    }

    if (endMs && Number.isFinite(endMs) && endMs < nowMs) {
      return jsonError("COUPON_EXPIRED", "هذا الكوبون منتهي.", 400);
    }

    const usage = await validateUsageLimit({
      ordersDb,
      store_id,
      coupon_id: String(coupon.id),
      usage_limit: coupon.usage_limit,
    });

    if (!usage.ok) {
      if (usage.error === "USAGE_LIMIT_REACHED") {
        return jsonError(
          "USAGE_LIMIT_REACHED",
          "تم الوصول لحد استخدام هذا الكوبون.",
          400,
        );
      }

      throw new Error(usage.error || "USAGE_LIMIT_CHECK_FAILED");
    }

    const nowIso = new Date().toISOString();

    const upR = await ordersDb
      .from("cart_coupons")
      .upsert(
        {
          store_id,
          cart_id: cartId,
          coupon_id: coupon.id,
          code: coupon.code,
          discount_amount: 0,
          updated_at: nowIso,
        },
        { onConflict: "cart_id" },
      )
      .select("id,code,discount_amount,coupon_id")
      .single();

    if (upR.error) {
      throw new Error(upR.error.message);
    }

    await ordersDb
      .from("carts")
      .update({
        coupon_discount: 0,
        last_activity_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", cartId)
      .eq("store_id", store_id);

    const summary = await buildCartSummary({
      store_id,
      cart_id: cartId,
    });

    const summaryCoupon = summary?.coupon ?? null;

    if (!summaryCoupon?.code) {
      await clearCartCoupon({
        ordersDb,
        store_id,
        cart_id: cartId,
      });

      return jsonError(
        "COUPON_NOT_APPLICABLE",
        "لا تنطبق شروط هذا الكوبون على السلة الحالية.",
        400,
      );
    }

    const discount = Math.max(0, n(summaryCoupon.discount));

    if (n(upR.data?.discount_amount) !== discount) {
      await Promise.all([
        ordersDb
          .from("cart_coupons")
          .update({
            discount_amount: discount,
            updated_at: new Date().toISOString(),
          })
          .eq("store_id", store_id)
          .eq("cart_id", cartId),

        ordersDb
          .from("carts")
          .update({
            coupon_discount: discount,
            last_activity_at: new Date().toISOString(),
          })
          .eq("id", cartId)
          .eq("store_id", store_id),
      ]);
    }

    const res = NextResponse.json(
      {
        data: {
          cart_id: cartId,
          coupon: {
            id: String(upR.data.id),
            coupon_id: String(upR.data.coupon_id),
            code: String(summaryCoupon.code || upR.data.code || coupon.code),
            discount_amount: discount,
          },
          summary,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );

    return withCartCookie(res, sid);
  } catch (e: any) {
    return jsonError(
      "COUPON_APPLY_FAILED",
      e?.message || "تعذر تطبيق الكوبون.",
      500,
    );
  }
}

export async function DELETE() {
  try {
    const store_id = await getStoreIdOrThrow();
    const sid = await getCartSessionId();
    const ordersDb = await getOrdersDb(store_id);

    const cart = await getOrCreateOpenCart({
      store_id,
      session_id: sid,
    });

    const cartId = s(cart?.id);

    if (!cartId) {
      return jsonError("CART_NOT_FOUND", "تعذر العثور على السلة.", 404);
    }

    await clearCartCoupon({
      ordersDb,
      store_id,
      cart_id: cartId,
    });

    const summary = await buildCartSummary({
      store_id,
      cart_id: cartId,
    });

    const res = NextResponse.json(
      {
        data: {
          cart_id: cartId,
          removed: true,
          summary,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );

    return withCartCookie(res, sid);
  } catch (e: any) {
    return jsonError(
      "COUPON_REMOVE_FAILED",
      e?.message || "تعذر إزالة الكوبون.",
      500,
    );
  }
}