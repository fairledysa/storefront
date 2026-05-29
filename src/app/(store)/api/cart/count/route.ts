// FILE: apps/storefront/src/app/(store)/api/cart/count/route.ts

import { NextResponse } from "next/server";
import {
  getCartSessionIdFromCookie,
  getExistingOpenCartsForInitialCount,
  getStoreIdOrThrow,
} from "../../_cart/cart.server";

export const dynamic = "force-dynamic";

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
}

function sumCartItemCount(carts: any[]) {
  if (!Array.isArray(carts) || carts.length === 0) return 0;

  const seen = new Set<string>();
  let total = 0;

  for (const cart of carts) {
    const id = String(cart?.id ?? "").trim();
    if (!id || seen.has(id)) continue;

    seen.add(id);
    total += n(cart?.item_count);
  }

  return total;
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

    const carts = await getExistingOpenCartsForInitialCount({
      store_id: storeId,
      session_id: sessionId,
    });

    return countResponse(sumCartItemCount(carts));
  } catch {
    return countResponse(0);
  }
}