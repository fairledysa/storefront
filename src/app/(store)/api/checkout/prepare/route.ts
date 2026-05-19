// apps/storefront/src/app/(store)/api/checkout/prepare/route.ts

import { NextResponse } from "next/server";
import {
  cartSessionCookie,
  getCartSessionId,
  getOrCreateOpenCart,
  getStoreIdOrThrow,
} from "../../_cart/cart.server";
import { buildCartSummary } from "../lib/summary";

export const dynamic = "force-dynamic";

function jsonError(error: string, status = 500, extra?: any) {
  return NextResponse.json(
    { ok: false, error, ...(extra ? { extra } : {}) },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export async function GET() {
  try {
    const store_id = await getStoreIdOrThrow();
    const session_id = await getCartSessionId();
    const cart = await getOrCreateOpenCart({ store_id, session_id });

    const summary = await buildCartSummary({ store_id, cart_id: cart.id });

    const res = NextResponse.json(
      { ok: true, summary },
      { headers: { "Cache-Control": "no-store" } },
    );
    res.cookies.set(cartSessionCookie(session_id));
    return res;
  } catch (e: any) {
    return jsonError(e?.message || "PREPARE_FAILED", 500);
  }
}
