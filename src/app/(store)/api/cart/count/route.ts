// FILE: apps/storefront/src/app/(store)/api/cart/count/route.ts

import { NextResponse } from "next/server";
import {
  getCartSessionIdFromCookie,
  getExistingOpenCart,
  getStoreIdOrThrow,
} from "../../_cart/cart.server";

export const dynamic = "force-dynamic";

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
}

function countResponse(count: number) {
  return NextResponse.json(
    { ok: true, count: n(count) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET() {
  try {
    const storeId = await getStoreIdOrThrow();

    /**
     * مهم:
     * لا نستخدم getCartSessionId هنا.
     * getCartSessionId ينشئ session مؤقت إذا ما فيه cookie،
     * وهذا يخلي الزائر الجديد يسوي query غير مفيد على DB.
     */
    const sessionId = await getCartSessionIdFromCookie();

    const cart = await getExistingOpenCart({
      store_id: storeId,
      session_id: sessionId,
    });

    return countResponse(cart?.item_count);
  } catch {
    return countResponse(0);
  }
}
