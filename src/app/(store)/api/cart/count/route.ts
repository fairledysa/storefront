// FILE: apps/storefront/src/app/(store)/api/cart/count/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/data/store/supabase.server";
import {
  getCartSessionId,
  getStoreIdOrThrow,
} from "../../_cart/cart.server";

export const dynamic = "force-dynamic";

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v : 0;
}

export async function GET() {
  try {
    const storeId = await getStoreIdOrThrow();
    const sessionId = await getCartSessionId();

    if (!storeId || !sessionId) {
      return NextResponse.json(
        { ok: true, count: 0 },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const sb: any = await Promise.resolve(supabaseAdmin());

    /**
     * مهم:
     * لا نستخدم getOrCreateOpenCart هنا.
     * لأن الهيدر فقط يقرأ الرقم، ما نبيه ينشئ سلة جديدة ويثقل.
     */
    const cartR = await sb
      .from("carts")
      .select("id")
      .eq("store_id", storeId)
      .eq("session_id", sessionId)
      .eq("status", "open")
      .maybeSingle();

    if (cartR.error || !cartR.data?.id) {
      return NextResponse.json(
        { ok: true, count: 0 },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const itemsR = await sb
      .from("cart_items")
      .select("qty")
      .eq("store_id", storeId)
      .eq("cart_id", cartR.data.id);

    if (itemsR.error || !Array.isArray(itemsR.data)) {
      return NextResponse.json(
        { ok: true, count: 0 },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const count = itemsR.data.reduce((sum: number, item: any) => {
      return sum + n(item?.qty);
    }, 0);

    return NextResponse.json(
      { ok: true, count },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: true, count: 0 },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}