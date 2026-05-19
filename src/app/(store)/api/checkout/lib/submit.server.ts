// FILE: apps/storefront/src/app/api/cart/checkout/lib/submit.server.ts
import crypto from "crypto";
import { cookies } from "next/headers";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { verifySession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/data/store/supabase.server";

export type SubmitCheckoutInput = {
  payment_method?: string | null;
};

export type SubmitCheckoutResult =
  | {
      ok: true;
      order: {
        id: string;
        public_no: number | null;
        order_number: number;
        public_token: string;
        status: string;
        payment_status: string;
        currency: string;
        subtotal: number;
        discount_amount: number;
        shipping_amount: number;
        tax_amount: number;
        total_amount: number;
        created_at: string;
      };
    }
  | {
      ok: false;
      error: string;
      detail?: string;
    };

function getSb() {
  return typeof (supabaseAdmin as any) === "function"
    ? (supabaseAdmin as any)()
    : (supabaseAdmin as any);
}

function pickToken(jar: Awaited<ReturnType<typeof cookies>>) {
  return (
    jar.get("elyaia_session")?.value ||
    jar.get("session")?.value ||
    jar.get("elyaiaSession")?.value ||
    ""
  );
}

async function resolveCustomerId(
  sb: any,
  token: string,
): Promise<string | null> {
  const session = await Promise.resolve(verifySession(token) as any);

  // إذا كان السيشن يعطي customer_id جاهز
  if (session?.customer_id) return String(session.customer_id);

  // شائع: auth_user_id أو user_id
  const authUserId = session?.auth_user_id || session?.user_id || null;
  if (!authUserId) return null;

  const res = await sb
    .from("customers")
    .select("id")
    .eq("auth_user_id", String(authUserId))
    .maybeSingle();

  if (res.error) throw new Error(res.error.message);
  return res.data?.id ? String(res.data.id) : null;
}

function token32() {
  return crypto.randomBytes(16).toString("hex");
}

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v : 0;
}

export async function submitCheckout(
  input: SubmitCheckoutInput = {},
): Promise<SubmitCheckoutResult> {
  try {
    // 1) store
    const storeCtx = await resolveStoreContext();
    const storeId = storeCtx?.store?.id;
    if (!storeId) return { ok: false, error: "STORE_NOT_FOUND" };

    // 2) auth
    const jar = await cookies();
    const token = pickToken(jar);
    if (!token) return { ok: false, error: "UNAUTHENTICATED" };

    const sb = getSb();

    const customerId = await resolveCustomerId(sb, token);
    if (!customerId) return { ok: false, error: "UNAUTHENTICATED" };

    // 3) cart المفتوح لهذا العميل
    // ملاحظة: عندك carts.user_id ممكن يكون null، وفي مشروعك تربط العميل بـ customer_id غالباً عبر user_id/auth.
    // بما أن السكيمة ما فيها customer_id داخل carts، نربط عبر session_id أو user_id بحسب مشروعك.
    //
    // هنا نعتمد على أن cart.user_id = auth_user_id (أو user id من session) إن كان عندكم كذلك.
    // وإذا ما عندكم user_id مضبوط، لازم تعدل ربط cart بالعميل (أو تستخدم session_id).
    const session = await Promise.resolve(verifySession(token) as any);
    const authUserId = session?.auth_user_id || session?.user_id || null;

    // حاول نجيب cart حسب user_id أولاً، وإذا ما حصل جرّب session_id (لو عندكم)
    const cartQuery = sb
      .from("carts")
      .select(
        "id,store_id,user_id,session_id,status,currency,coupon_discount,payment_method,shipping_id,address_id",
      )
      .eq("store_id", storeId)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1);

    let cartRes: any = null;

    if (authUserId) {
      cartRes = await cartQuery.eq("user_id", String(authUserId)).maybeSingle();
    } else {
      cartRes = await cartQuery.maybeSingle();
    }

    // fallback: لو ما حصل cart مع user_id، جرّب session_id من كرت كوكي (إن كان عندكم)
    if (!cartRes?.data?.id && cartRes?.error == null) {
      const sid =
        jar.get("darb_cart_session")?.value ||
        jar.get("cart_session")?.value ||
        "";
      if (sid) {
        cartRes = await cartQuery.eq("session_id", sid).maybeSingle();
      }
    }

    if (cartRes?.error) {
      return {
        ok: false,
        error: "CART_LOOKUP_FAILED",
        detail: cartRes.error.message,
      };
    }

    const cart = cartRes?.data;
    if (!cart?.id) return { ok: false, error: "CART_NOT_FOUND" };

    // 4) منع إنشاء طلب مكرر لنفس cart_id
    const existingOrderRes = await sb
      .from("orders")
      .select(
        "id,public_no,order_number,public_token,status,payment_status,currency,subtotal,discount_amount,shipping_amount,tax_amount,total_amount,created_at",
      )
      .eq("store_id", storeId)
      .eq("cart_id", cart.id)
      .maybeSingle();

    if (existingOrderRes.error) {
      return {
        ok: false,
        error: "ORDER_LOOKUP_FAILED",
        detail: existingOrderRes.error.message,
      };
    }

    if (existingOrderRes.data?.id) {
      return { ok: true, order: existingOrderRes.data };
    }

    // 5) cart_items
    const itemsRes = await sb
      .from("cart_items")
      .select(
        "id,cart_id,store_id,product_id,variant_id,qty,currency,unit_price,created_at,selected_option_value_ids",
      )
      .eq("store_id", storeId)
      .eq("cart_id", cart.id)
      .order("created_at", { ascending: true });

    if (itemsRes.error) {
      return {
        ok: false,
        error: "CART_ITEMS_LOOKUP_FAILED",
        detail: itemsRes.error.message,
      };
    }

    const cartItems: any[] = Array.isArray(itemsRes.data) ? itemsRes.data : [];
    if (cartItems.length === 0) return { ok: false, error: "CART_EMPTY" };

    // 6) جلب أسماء المنتجات + sku للـ variant
    const productIds = Array.from(
      new Set(cartItems.map((x) => x.product_id).filter(Boolean)),
    );
    const variantIds = Array.from(
      new Set(cartItems.map((x) => x.variant_id).filter(Boolean)),
    );

    const productsRes = await sb
      .from("products")
      .select("id,name")
      .eq("store_id", storeId)
      .in("id", productIds);

    if (productsRes.error) {
      return {
        ok: false,
        error: "PRODUCTS_LOOKUP_FAILED",
        detail: productsRes.error.message,
      };
    }

    const prodName = new Map<string, string>();
    for (const p of productsRes.data ?? []) {
      if (p?.id) prodName.set(String(p.id), String(p.name ?? ""));
    }

    const variantSku = new Map<string, string>();
    if (variantIds.length) {
      const variantsRes = await sb
        .from("product_variants")
        .select("id,sku")
        .in("id", variantIds);

      if (variantsRes.error) {
        return {
          ok: false,
          error: "VARIANTS_LOOKUP_FAILED",
          detail: variantsRes.error.message,
        };
      }

      for (const v of variantsRes.data ?? []) {
        if (v?.id) variantSku.set(String(v.id), v.sku ? String(v.sku) : "");
      }
    }

    // 7) totals
    const currency = String(cart.currency ?? "SAR");
    const subtotal = cartItems.reduce(
      (sum, it) => sum + n(it.unit_price) * n(it.qty),
      0,
    );
    const discount_amount = n(cart.coupon_discount);
    const shipping_amount = 0; // لاحقاً من shipping step
    const tax_amount = 0; // لاحقاً
    const total_amount = Math.max(
      0,
      subtotal - discount_amount + shipping_amount + tax_amount,
    );

    // 8) create order
    const public_token = token32();
    const payment_method = input.payment_method ?? cart.payment_method ?? null;

    const orderInsert = await sb
      .from("orders")
      .insert({
        store_id: storeId,
        cart_id: cart.id,
        customer_id: customerId,
        status: "pending",
        currency,
        subtotal,
        shipping_amount,
        tax_amount,
        discount_amount,
        total_amount,
        payment_method,
        payment_status: "unpaid",
        shipping_address: null,
        address_id: cart.address_id ?? null,
        shipping_id: cart.shipping_id ?? null,
        public_token,
      })
      .select(
        "id,public_no,order_number,public_token,status,payment_status,currency,subtotal,discount_amount,shipping_amount,tax_amount,total_amount,created_at",
      )
      .single();

    if (orderInsert.error) {
      return {
        ok: false,
        error: "ORDER_CREATE_FAILED",
        detail: orderInsert.error.message,
      };
    }

    const order = orderInsert.data;

    // 9) insert order_items
    const orderItemsPayload = cartItems.map((it) => {
      const pid = String(it.product_id);
      const vid = it.variant_id ? String(it.variant_id) : null;

      const name = prodName.get(pid) || "منتج";
      const sku = vid ? variantSku.get(vid) || null : null;

      const qty = Math.max(1, Math.floor(n(it.qty)));
      const unit_price = n(it.unit_price);
      const total_price = unit_price * qty;

      return {
        order_id: order.id,
        store_id: storeId,
        product_id: pid,
        variant_id: vid,
        name,
        sku,
        qty,
        currency: String(it.currency ?? currency),
        unit_price,
        total_price,
        selected_option_value_ids: Array.isArray(it.selected_option_value_ids)
          ? it.selected_option_value_ids
          : [],
      };
    });

    const orderItemsInsert = await sb
      .from("order_items")
      .insert(orderItemsPayload);

    if (orderItemsInsert.error) {
      // لو فشل إدخال العناصر، نسقط الطلب لتجنب طلب فاضي
      await sb
        .from("orders")
        .delete()
        .eq("id", order.id)
        .eq("store_id", storeId);
      return {
        ok: false,
        error: "ORDER_ITEMS_CREATE_FAILED",
        detail: orderItemsInsert.error.message,
      };
    }

    // 10) update cart status -> converted
    const cartUpdate = await sb
      .from("carts")
      .update({ status: "converted" })
      .eq("id", cart.id)
      .eq("store_id", storeId);

    if (cartUpdate.error) {
      // ما نكسر العملية، لكن نسجل خطأ
      // ممكن تضيف audit_log لاحقاً
    }

    return { ok: true, order };
  } catch (e: any) {
    return { ok: false, error: "UNHANDLED", detail: e?.message ?? String(e) };
  }
}
