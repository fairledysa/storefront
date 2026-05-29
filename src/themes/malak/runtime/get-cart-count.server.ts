// FILE: apps/storefront/src/themes/malak/runtime/get-cart-count.server.ts
import "server-only";

import {
  getCartSessionIdFromCookie,
  getExistingOpenCartsForInitialCount,
} from "@/app/(store)/api/_cart/cart.server";

function n(value: any) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? Math.max(0, Math.floor(num)) : 0;
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

export async function getInitialCartCount(storeId: string) {
  try {
    const store_id = String(storeId ?? "").trim();
    if (!store_id) return 0;

    /**
     * قراءة فقط:
     * لا ننشئ cart session جديد للهيدر.
     * إذا ما فيه cookie ولا عميل مسجل، يرجع 0 بدون ضغط زائد.
     */
    const sessionId = await getCartSessionIdFromCookie();

    const carts = await getExistingOpenCartsForInitialCount({
      store_id,
      session_id: sessionId,
    });

    return sumCartItemCount(carts);
  } catch {
    return 0;
  }
}