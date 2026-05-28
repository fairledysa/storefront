// apps/storefront/src/app/(store)/api/checkout/prepare/route.ts

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

function s(x: any) {
  return String(x ?? "").trim();
}

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
    const sb: any = supabaseAdmin();

    const store_id = await getStoreIdOrThrow();
    const session_id = await getCartSessionId();
    const cart = await getOrCreateOpenCart({ store_id, session_id });

    const cartId = s(cart?.id);
    if (!cartId) return jsonError("CART_NOT_FOUND", 404);

    const cartR = await sb
      .from("carts")
      .select("id,address_id,shipping_id,payment_method,currency,user_id,status")
      .eq("id", cartId)
      .eq("store_id", store_id)
      .limit(1)
      .maybeSingle();

    if (cartR.error) return jsonError(cartR.error.message, 500);
    if (!cartR.data?.id) return jsonError("CART_NOT_FOUND", 404);

    const summary = await buildCartSummary({ store_id, cart_id: cartId });

    const state = {
      address_id: cartR.data.address_id ? String(cartR.data.address_id) : null,
      shipping_id: cartR.data.shipping_id ? String(cartR.data.shipping_id) : null,
      payment_method: cartR.data.payment_method
        ? String(cartR.data.payment_method)
        : null,
      payment_ready: Boolean(cartR.data.payment_method),
    };

    const res = NextResponse.json(
      {
        ok: true,
        cart: {
          id: String(cartR.data.id),
          address_id: state.address_id,
          shipping_id: state.shipping_id,
          payment_method: state.payment_method,
          currency: cartR.data.currency ?? null,
          user_id: cartR.data.user_id ?? null,
          status: cartR.data.status ?? "open",
        },
        state,
        summary,
      },
      { headers: { "Cache-Control": "no-store" } },
    );

    res.cookies.set(cartSessionCookie(session_id));
    return res;
  } catch (e: any) {
    return jsonError(e?.message || "PREPARE_FAILED", 500);
  }
}