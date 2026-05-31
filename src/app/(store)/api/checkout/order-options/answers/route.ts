// FILE: apps/storefront/src/app/(store)/api/checkout/order-options/answers/route.ts

import { NextResponse } from "next/server";

import { getOrdersDb } from "@/data/db/orders-db.server";
import {
  cartSessionCookie,
  getCartSessionId,
  getOrCreateOpenCart,
  getStoreIdOrThrow,
} from "../../../_cart/cart.server";
import { buildCartSummary } from "../../lib/summary";
import { saveCartOrderOptionsFromPayload } from "../../lib/order-options";

export const dynamic = "force-dynamic";

function s(x: any) {
  return String(x ?? "").trim();
}

function jsonError(error: string, status = 400, extra?: any) {
  return NextResponse.json(
    {
      ok: false,
      error,
      ...(extra ? extra : {}),
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(req: Request) {
  try {
    const store_id = await getStoreIdOrThrow();
    const session_id = await getCartSessionId();
    const sb: any = await getOrdersDb(store_id);

    const cart = await getOrCreateOpenCart({ store_id, session_id });
    const cartId = s(cart?.id);

    if (!cartId) {
      return jsonError("CART_NOT_FOUND", 404, {
        message_ar: "تعذر العثور على السلة.",
      });
    }

    if (s(cart?.status) !== "open") {
      return jsonError("CART_NOT_OPEN", 400, {
        message_ar: "السلة غير قابلة للتعديل.",
      });
    }

    const body = await req.json().catch(() => ({}));
    const answers = Array.isArray(body?.answers) ? body.answers : [];

    /**
     * مهم للسرعة:
     * لا نبني summary الثقيل إلا إذا طلبه العميل صراحة.
     * CheckoutOrderOptions يرسل include_summary:false ويحدث الإجمالي محليًا فورًا.
     */
    const includeSummary =
      body?.include_summary === true || body?.includeSummary === true;

    const currency = s(cart?.currency) || "SAR";

    const saved = await saveCartOrderOptionsFromPayload({
      sb,
      storeId: store_id,
      cartId,
      answers,
      currency,
    });

    if (!saved.ok) {
      return jsonError(saved.error || "ORDER_OPTIONS_SAVE_FAILED", 400, {
        message_ar:
          saved.message_ar ||
          "تعذر حفظ خيارات الطلب. تأكد من تعبئة الخيارات المطلوبة بشكل صحيح.",
      });
    }

    const summary = includeSummary
      ? await buildCartSummary({
          store_id,
          cart_id: cartId,
        })
      : null;

    const res = NextResponse.json(
      {
        ok: true,
        ...(summary ? { summary } : {}),
        summary_pending: !includeSummary,
        saved_count: Array.isArray(saved.rows) ? saved.rows.length : 0,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );

    res.cookies.set(cartSessionCookie(session_id));

    return res;
  } catch (e: any) {
    return jsonError(e?.message || "ORDER_OPTIONS_ANSWERS_FAILED", 500, {
      message_ar: "تعذر حفظ خيارات الطلب حاليًا.",
    });
  }
}