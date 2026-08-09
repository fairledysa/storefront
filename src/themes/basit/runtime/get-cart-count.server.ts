// FILE: apps/storefront/src/themes/basit/runtime/get-cart-count.server.ts
import "server-only";

import {
  getCartSessionIdFromCookie,
  getExistingOpenCart,
} from "@/app/(store)/api/_cart/cart.server";

function n(value: any) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? Math.max(0, Math.floor(num)) : 0;
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

    const cart = await getExistingOpenCart({
      store_id,
      session_id: sessionId,
    });

    return n(cart?.item_count);
  } catch {
    return 0;
  }
}
