import { supabaseAdmin } from "@/data/store/supabase.server";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";

export type ThankYouOrder = {
  id: string;
  public_no: number | null;
  order_number: number;
  invoice_no: number | null;
  public_token: string;
  status: string;
  payment_status: string;
  payment_method: string | null;
  currency: string;
  subtotal: number;
  shipping_amount: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  created_at: string;
  shipping_address: any | null;
};

export type ThankYouOrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  name: string;
  sku: string | null;
  qty: number;
  currency: string;
  unit_price: number;
  total_price: number;
  selected_option_value_ids: string[];
  created_at: string;
};

function getSb() {
  return typeof (supabaseAdmin as any) === "function"
    ? (supabaseAdmin as any)()
    : (supabaseAdmin as any);
}

export async function readOrderByPublicToken(args: { token: string }) {
  const token = String(args.token ?? "").trim();
  if (!token) {
    return { ok: false as const, error: "MISSING_TOKEN" };
  }

  // store
  const storeCtx = await resolveStoreContext();
  const storeId = storeCtx?.store?.id;
  if (!storeId) {
    return { ok: false as const, error: "STORE_NOT_FOUND" };
  }

  const sb = getSb();

  // order by token (بدون customer شرط)
  const oR = await sb
    .from("orders")
    .select(
      [
        "id",
        "public_no",
        "order_number",
        "invoice_no",
        "public_token",
        "status",
        "payment_status",
        "payment_method",
        "currency",
        "subtotal",
        "shipping_amount",
        "tax_amount",
        "discount_amount",
        "total_amount",
        "created_at",
        "shipping_address",
      ].join(","),
    )
    .eq("store_id", storeId)
    .eq("public_token", token)
    .maybeSingle();

  if (oR.error) {
    return {
      ok: false as const,
      error: "ORDER_LOOKUP_FAILED",
      detail: oR.error.message,
    };
  }

  if (!oR.data?.id) {
    return { ok: false as const, error: "ORDER_NOT_FOUND" };
  }

  const order = oR.data as ThankYouOrder;

  const iR = await sb
    .from("order_items")
    .select(
      [
        "id",
        "order_id",
        "product_id",
        "variant_id",
        "name",
        "sku",
        "qty",
        "currency",
        "unit_price",
        "total_price",
        "selected_option_value_ids",
        "created_at",
      ].join(","),
    )
    .eq("store_id", storeId)
    .eq("order_id", order.id)
    .order("created_at", { ascending: true });

  if (iR.error) {
    return {
      ok: false as const,
      error: "ORDER_ITEMS_LOOKUP_FAILED",
      detail: iR.error.message,
    };
  }

  const items = (Array.isArray(iR.data) ? iR.data : []) as ThankYouOrderItem[];

  return { ok: true as const, order, items };
}
