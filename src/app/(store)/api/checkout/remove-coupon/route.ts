// FILE: apps/storefront/src/app/(store)/api/checkout/remove-coupon/route.ts
import { NextResponse } from "next/server";
import {
  cartSessionCookie,
  getCartSessionId,
  getOrCreateOpenCart,
  getStoreIdOrThrow,
} from "../../_cart/cart.server";
import { supabaseAdmin } from "@/data/store/supabase.server";
import { buildCartSummary } from "../lib/summary";

export const dynamic = "force-dynamic";

export async function POST() {
  const store_id = await getStoreIdOrThrow();
  const session_id = await getCartSessionId();
  const cart = await getOrCreateOpenCart({ store_id, session_id });

  const sb: any = supabaseAdmin();

  await sb
    .from("cart_coupons")
    .delete()
    .eq("store_id", store_id)
    .eq("cart_id", cart.id);

  await sb
    .from("carts")
    .update({
      coupon_id: null,
      coupon_discount: 0,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", cart.id);

  const summary = await buildCartSummary({ store_id, cart_id: cart.id });

  const res = NextResponse.json({ ok: true, summary });
  res.cookies.set(cartSessionCookie(session_id));
  return res;
}
