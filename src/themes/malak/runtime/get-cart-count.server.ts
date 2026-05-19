// FILE: apps/storefront/src/themes/malak/runtime/get-cart-count.server.ts
import "server-only";

import { supabaseAdmin } from "@/data/store/supabase.server";
import {
  getCartSessionId,
  getExistingOpenCartsForInitialCount,
} from "@/app/(store)/api/_cart/cart.server";

function n(value: any) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

export async function getInitialCartCount(storeId: string) {
  try {
    const sid = await getCartSessionId();

    const carts = await getExistingOpenCartsForInitialCount({
      store_id: storeId,
      session_id: sid,
    });

    const cartIds = Array.from(
      new Set(
        (Array.isArray(carts) ? carts : [])
          .map((cart: any) => String(cart?.id ?? "").trim())
          .filter(Boolean),
      ),
    );

    if (!cartIds.length) return 0;

    const sb: any = supabaseAdmin();

    const itemsR = await sb
      .from("cart_items")
      .select("cart_id,qty")
      .eq("store_id", storeId)
      .in("cart_id", cartIds);

    if (itemsR.error || !Array.isArray(itemsR.data)) {
      return 0;
    }

    return itemsR.data.reduce((sum: number, item: any) => {
      return sum + n(item?.qty);
    }, 0);
  } catch {
    return 0;
  }
}