// FILE: apps/storefront/src/app/(store)/api/_cart/cart.server.ts
import "server-only";

import crypto from "crypto";
import { cookies } from "next/headers";

import { controlDb } from "@/data/db/control-db.server";
import { getOrdersDb } from "@/data/db/orders-db.server";
import { getStoreDb } from "@/data/db/store-db.server";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { verifySession } from "@/lib/auth/session";

const CART_COOKIE = "darb_cart_session";
const SESSION_COOKIE = "elyaia_session";

function cryptoRandomId() {
  return crypto.randomUUID();
}

export async function getStoreIdOrThrow() {
  const ctx = await resolveStoreContext();
  const store = ctx.store;

  if (!store?.id) throw new Error("STORE_NOT_FOUND");

  return store.id as string;
}

export type StoreCurrencyInfo = {
  code: string;
  symbol: string;
  decimal_digits: number;
  name_ar?: string | null;
  name_en?: string | null;
};

function cleanCurrencyCode(value: any, fallback = "SAR") {
  const code = String(value ?? "").trim().toUpperCase();
  return code || fallback;
}

function cleanDecimalDigits(value: any) {
  const n = Number(value ?? 2);
  if (!Number.isFinite(n)) return 2;
  return Math.max(0, Math.min(4, Math.floor(n)));
}

function cleanCurrencySymbol(value: any, fallback: string) {
  return String(value ?? "").trim() || fallback;
}

async function readSelectedCurrencyCodeFromCookies() {
  try {
    const jar = await cookies();

    const names = [
      "mk_selected_currency",
      "mk_currency",
      "malak_currency",
      "currency",
      "store_currency",
      "selected_currency",
    ];

    for (const name of names) {
      const code = cleanCurrencyCode(jar.get(name)?.value, "");
      if (code) return code;
    }

    return "";
  } catch {
    return "";
  }
}

export async function getStoreCurrencyInfo(
  store_id?: string,
): Promise<StoreCurrencyInfo> {
  const fallbackCode = "SAR";
  const storeId = String(store_id ?? "").trim();

  let defaultCode = fallbackCode;

  try {
    const ctx = await resolveStoreContext();

    const ctxStoreId = String(ctx.store?.id ?? "").trim();
    const ctxCurrency = cleanCurrencyCode(ctx.store?.default_currency, "");

    if (ctxCurrency && (!storeId || ctxStoreId === storeId)) {
      defaultCode = ctxCurrency;
    }
  } catch {
    //
  }

  if (!storeId) {
    return {
      code: defaultCode,
      symbol: defaultCode,
      decimal_digits: 2,
      name_ar: null,
      name_en: null,
    };
  }

  try {
    const storeDb: any = await getStoreDb(storeId);

    if (!defaultCode || defaultCode === fallbackCode) {
      const control: any = await controlDb();

      const storeR = await control
        .from("stores")
        .select("default_currency")
        .eq("id", storeId)
        .limit(1)
        .maybeSingle();

      const storeCurrency = cleanCurrencyCode(
        storeR.data?.default_currency,
        "",
      );

      if (storeCurrency) defaultCode = storeCurrency;
    }

    const selectedCode = await readSelectedCurrencyCodeFromCookies();

    const wantedCodes = Array.from(
      new Set(
        [selectedCode, defaultCode]
          .map((code) => cleanCurrencyCode(code, ""))
          .filter(Boolean),
      ),
    );

    for (const code of wantedCodes) {
      const rowR = await storeDb
        .from("store_currencies")
        .select("currency_code,symbol,decimal_digits,name_ar,name_en")
        .eq("store_id", storeId)
        .eq("currency_code", code)
        .eq("is_enabled", true)
        .limit(1)
        .maybeSingle();

      if (!rowR.error && rowR.data?.currency_code) {
        const row = rowR.data;

        return {
          code: cleanCurrencyCode(row.currency_code, code),
          symbol: cleanCurrencySymbol(row.symbol, code),
          decimal_digits: cleanDecimalDigits(row.decimal_digits),
          name_ar: row.name_ar ?? null,
          name_en: row.name_en ?? null,
        };
      }
    }

    const defaultR = await storeDb
      .from("store_currencies")
      .select("currency_code,symbol,decimal_digits,name_ar,name_en")
      .eq("store_id", storeId)
      .eq("is_default", true)
      .eq("is_enabled", true)
      .limit(1)
      .maybeSingle();

    if (!defaultR.error && defaultR.data?.currency_code) {
      const row = defaultR.data;
      const code = cleanCurrencyCode(row.currency_code, defaultCode);

      return {
        code,
        symbol: cleanCurrencySymbol(row.symbol, code),
        decimal_digits: cleanDecimalDigits(row.decimal_digits),
        name_ar: row.name_ar ?? null,
        name_en: row.name_en ?? null,
      };
    }

    return {
      code: defaultCode,
      symbol: defaultCode,
      decimal_digits: 2,
      name_ar: null,
      name_en: null,
    };
  } catch {
    return {
      code: defaultCode,
      symbol: defaultCode,
      decimal_digits: 2,
      name_ar: null,
      name_en: null,
    };
  }
}

export async function getStoreCurrency(store_id?: string) {
  const info = await getStoreCurrencyInfo(store_id);
  return info.code;
}

async function ensureCartCurrency(
  ordersDb: any,
  cart: any,
  currency: string,
  store_id?: string,
) {
  const id = String(cart?.id ?? "").trim();
  const storeId = String(store_id ?? "").trim();
  const current = String(cart?.currency ?? "").trim().toUpperCase();
  const next = cleanCurrencyCode(currency);

  if (!id || current === next) return cart;

  let q = ordersDb
    .from("carts")
    .update({
      currency: next,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (storeId) {
    q = q.eq("store_id", storeId);
  }

  const up = await q.select("*").single();

  if (up.error) throw new Error(up.error.message);

  return up.data;
}

export async function getCartSessionId() {
  const jar = await cookies();
  let sid = jar.get(CART_COOKIE)?.value || "";

  if (!sid) sid = cryptoRandomId();

  return sid;
}

export async function getCartSessionIdFromCookie() {
  const jar = await cookies();
  return String(jar.get(CART_COOKIE)?.value || "").trim();
}

export function cartSessionCookie(sid: string) {
  return {
    name: CART_COOKIE,
    value: sid,
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  };
}

/**
 * مهم للـ multi-store:
 * لا نثق في customer_id من الكوكي مباشرة.
 * لازم نتأكد أن العميل مربوط بنفس المتجر الحالي في store_customers.
 */
async function getCustomerIdMaybe(store_id: string): Promise<string | null> {
  const storeId = String(store_id ?? "").trim();
  if (!storeId) return null;

  try {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value || "";

    if (!token) return null;

    const payload = verifySession(token);
    const customerId = payload?.customer_id ? String(payload.customer_id) : "";

    if (!customerId) return null;

    const ordersDb: any = await getOrdersDb(storeId);

    const linkR = await ordersDb
      .from("store_customers")
      .select("store_id,customer_id")
      .eq("store_id", storeId)
      .eq("customer_id", customerId)
      .limit(1)
      .maybeSingle();

    if (linkR.error || !linkR.data?.customer_id) return null;

    return customerId;
  } catch {
    return null;
  }
}

function readCartActivityTime(cart: any) {
  const values = [cart?.last_activity_at, cart?.updated_at, cart?.created_at];

  for (const value of values) {
    const time = Date.parse(String(value ?? ""));
    if (Number.isFinite(time)) return time;
  }

  return 0;
}

function pickBestExistingCart(carts: any[]) {
  const rows = Array.isArray(carts)
    ? carts.filter((cart) => String(cart?.id ?? "").trim())
    : [];

  if (!rows.length) return null;
  if (rows.length === 1) return rows[0];

  return [...rows].sort((a, b) => {
    const ai = Math.max(0, Number(a?.item_count ?? 0));
    const bi = Math.max(0, Number(b?.item_count ?? 0));

    const aHasItems = ai > 0 ? 1 : 0;
    const bHasItems = bi > 0 ? 1 : 0;

    if (bHasItems !== aHasItems) return bHasItems - aHasItems;
    if (bi !== ai) return bi - ai;

    return readCartActivityTime(b) - readCartActivityTime(a);
  })[0];
}

/**
 * قراءة فقط.
 * لا ينشئ cart.
 * لا يدمج carts.
 * يستخدمه GET /api/cart حتى لا ننشئ carts وهمية للزوار.
 */
export async function getExistingOpenCart(args: {
  store_id: string;
  session_id?: string | null;
}) {
  const storeId = String(args.store_id ?? "").trim();
  const sessionId = String(args.session_id ?? "").trim();

  if (!storeId) throw new Error("STORE_NOT_FOUND");

  const ordersDb: any = await getOrdersDb(storeId);
  const customer_id = await getCustomerIdMaybe(storeId);

  const carts: any[] = [];
  const seen = new Set<string>();

  function pushCart(cart: any) {
    const id = String(cart?.id ?? "").trim();
    if (!id || seen.has(id)) return;

    seen.add(id);
    carts.push(cart);
  }

  if (customer_id) {
    const [customerCartR, sessionCartR] = await Promise.all([
      ordersDb
        .from("carts")
        .select("*")
        .eq("store_id", storeId)
        .eq("user_id", customer_id)
        .eq("status", "open")
        .order("last_activity_at", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      sessionId
        ? ordersDb
            .from("carts")
            .select("*")
            .eq("store_id", storeId)
            .eq("session_id", sessionId)
            .eq("status", "open")
            .order("last_activity_at", { ascending: false, nullsFirst: false })
            .order("updated_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (customerCartR.error) throw new Error(customerCartR.error.message);
    if (sessionCartR.error) throw new Error(sessionCartR.error.message);

    if (customerCartR.data?.id) pushCart(customerCartR.data);
    if (sessionCartR.data?.id) pushCart(sessionCartR.data);

    return pickBestExistingCart(carts);
  }

  if (!sessionId) return null;

  const sessionCartR = await ordersDb
    .from("carts")
    .select("*")
    .eq("store_id", storeId)
    .eq("session_id", sessionId)
    .eq("status", "open")
    .order("last_activity_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sessionCartR.error) throw new Error(sessionCartR.error.message);

  return sessionCartR.data?.id ? sessionCartR.data : null;
}

/** ---------- Stock helpers ---------- */

type StockInfo =
  | {
      ok: true;
      unlimited: boolean;
      available_qty: number;
      max_per_order: number | null;
    }
  | {
      ok: false;
      reason:
        | "PRODUCT_NOT_FOUND"
        | "VARIANT_NOT_FOUND"
        | "INVALID_VARIANT_FOR_PRODUCT";
    };

async function getStockInfo(
  storeDb: any,
  args: { store_id: string; product_id: string; variant_id: string | null },
): Promise<StockInfo> {
  const pR = await storeDb
    .from("products")
    .select("id,store_id,metadata")
    .eq("id", args.product_id)
    .eq("store_id", args.store_id)
    .limit(1)
    .maybeSingle();

  if (pR.error) throw new Error(pR.error.message);

  if (!pR.data?.id) {
    return { ok: false, reason: "PRODUCT_NOT_FOUND" };
  }

  const meta = pR.data?.metadata ?? null;
  const metaUnlimited = Boolean(meta?.qtyUnlimited ?? false);

  if (metaUnlimited) {
    const psR0 = await storeDb
      .from("product_stock")
      .select("maximum_quantity_per_order")
      .eq("product_id", args.product_id)
      .limit(1)
      .maybeSingle();

    const max_per_order =
      !psR0.error && typeof psR0.data?.maximum_quantity_per_order === "number"
        ? Math.max(1, Math.floor(psR0.data.maximum_quantity_per_order))
        : null;

    return {
      ok: true,
      unlimited: true,
      available_qty: 999999,
      max_per_order,
    };
  }

  const psR = await storeDb
    .from("product_stock")
    .select("quantity,unlimited_quantity,maximum_quantity_per_order")
    .eq("product_id", args.product_id)
    .limit(1)
    .maybeSingle();

  if (psR.error) throw new Error(psR.error.message);

  const stockRow = psR.data ?? null;

  const max_per_order =
    typeof stockRow?.maximum_quantity_per_order === "number"
      ? Math.max(1, Math.floor(stockRow.maximum_quantity_per_order))
      : null;

  if (args.variant_id) {
    const vR = await storeDb
      .from("product_variants")
      .select("id,product_id,stock_quantity,unlimited_quantity")
      .eq("id", args.variant_id)
      .limit(1)
      .maybeSingle();

    if (vR.error) throw new Error(vR.error.message);

    const v = vR.data ?? null;

    if (v?.id) {
      if (String(v.product_id) !== String(args.product_id)) {
        return { ok: false, reason: "INVALID_VARIANT_FOR_PRODUCT" };
      }

      const unlimited = Boolean(v.unlimited_quantity ?? false);

      if (unlimited) {
        return {
          ok: true,
          unlimited: true,
          available_qty: 999999,
          max_per_order,
        };
      }

      return {
        ok: true,
        unlimited: false,
        available_qty: Math.max(0, Number(v.stock_quantity ?? 0)),
        max_per_order,
      };
    }

    const metaVariants = Array.isArray(meta?.variants) ? meta.variants : [];
    const mv = metaVariants.find(
      (x: any) => String(x?.id) === String(args.variant_id),
    );

    if (mv) {
      return {
        ok: true,
        unlimited: false,
        available_qty: Math.max(0, Number(mv?.qty ?? 0)),
        max_per_order,
      };
    }

    return { ok: false, reason: "VARIANT_NOT_FOUND" };
  }

  const optionsEnabled = Boolean(meta?.optionsEnabled ?? false);

  if (optionsEnabled) {
    return {
      ok: true,
      unlimited: false,
      available_qty: 0,
      max_per_order,
    };
  }

  const unlimited = Boolean(stockRow?.unlimited_quantity ?? false);

  if (unlimited) {
    return {
      ok: true,
      unlimited: true,
      available_qty: 999999,
      max_per_order,
    };
  }

  return {
    ok: true,
    unlimited: false,
    available_qty: Math.max(0, Number(stockRow?.quantity ?? 0)),
    max_per_order,
  };
}

function clampToAllowedQty(
  desiredQty: number,
  stock: Extract<StockInfo, { ok: true }>,
) {
  const desired = Math.max(1, Math.floor(desiredQty));

  const maxByStock = stock.unlimited
    ? 999999
    : Math.max(0, stock.available_qty);

  const maxByPolicy =
    stock.max_per_order === null ? 999999 : Math.max(1, stock.max_per_order);

  const hardMax = Math.max(0, Math.min(maxByStock, maxByPolicy));
  const finalQty = Math.max(1, Math.min(desired, hardMax));

  return { finalQty, hardMax };
}

/** ---------- Line Key ---------- */

export function buildLineKey(input: {
  product_id: string;
  variant_id: string | null;
  selected_option_value_ids: string[];
}) {
  const selected = [...(input.selected_option_value_ids || [])]
    .map(String)
    .filter(Boolean)
    .sort();

  return `${input.product_id}:${input.variant_id || "base"}:${selected.join(
    ",",
  )}`;
}

/** ---------- resolve variant_id from selected options ---------- */

async function resolveVariantIdFromOptions(
  storeDb: any,
  args: { product_id: string; selected_option_value_ids: string[] },
): Promise<string | null> {
  const selected = Array.isArray(args.selected_option_value_ids)
    ? args.selected_option_value_ids.map(String).filter(Boolean)
    : [];

  if (!selected.length) return null;

  const vR = await storeDb
    .from("product_variants")
    .select("id")
    .eq("product_id", args.product_id);

  if (vR.error) throw new Error(vR.error.message);

  const variants = Array.isArray(vR.data) ? vR.data : [];
  if (!variants.length) return null;

  const variantIds = variants.map((v: any) => v.id).filter(Boolean);
  if (!variantIds.length) return null;

  const linksR = await storeDb
    .from("variant_option_values")
    .select("variant_id,option_value_id")
    .in("variant_id", variantIds);

  if (linksR.error) throw new Error(linksR.error.message);

  const links = Array.isArray(linksR.data) ? linksR.data : [];
  const map = new Map<string, Set<string>>();

  for (const row of links) {
    const vid = String(row?.variant_id ?? "");
    const oid = String(row?.option_value_id ?? "");

    if (!vid || !oid) continue;

    if (!map.has(vid)) {
      map.set(vid, new Set());
    }

    map.get(vid)!.add(oid);
  }

  const selectedSet = new Set(selected);

  for (const vid of variantIds) {
    const set = map.get(String(vid)) ?? new Set<string>();
    let ok = true;

    for (const oid of selectedSet) {
      if (!set.has(String(oid))) {
        ok = false;
        break;
      }
    }

    if (ok) return String(vid);
  }

  return null;
}

/** ---------- Cart merge logic ---------- */

async function mergeSessionCartIntoCustomerCart(args: {
  ordersDb: any;
  storeDb: any;
  store_id: string;
  customer_id: string;
  session_id: string;
  currency: string;
}) {
  const { ordersDb, storeDb, store_id, customer_id, session_id, currency } =
    args;

  const customerCartR = await ordersDb
    .from("carts")
    .select("*")
    .eq("store_id", store_id)
    .eq("user_id", customer_id)
    .eq("status", "open")
    .limit(1)
    .maybeSingle();

  if (customerCartR.error) throw new Error(customerCartR.error.message);

  const customerCart = customerCartR.data ?? null;

  const sessionCartR = session_id
    ? await ordersDb
        .from("carts")
        .select("*")
        .eq("store_id", store_id)
        .eq("session_id", session_id)
        .eq("status", "open")
        .limit(1)
        .maybeSingle()
    : { data: null, error: null };

  if (sessionCartR.error) throw new Error(sessionCartR.error.message);

  const sessionCart = sessionCartR.data ?? null;

  if (sessionCart && !customerCart) {
    const up = await ordersDb
      .from("carts")
      .update({
        user_id: customer_id,
        session_id: null,
        currency,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", sessionCart.id)
      .eq("store_id", store_id)
      .select("*")
      .single();

    if (up.error) throw new Error(up.error.message);

    return up.data;
  }

  if (!sessionCart) {
    if (customerCart) {
      return await ensureCartCurrency(ordersDb, customerCart, currency, store_id);
    }

    const ins = await ordersDb
      .from("carts")
      .insert({
        store_id,
        user_id: customer_id,
        session_id: null,
        status: "open",
        currency,
        last_activity_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (ins.error) throw new Error(ins.error.message);

    return ins.data;
  }

  if (customerCart && String(customerCart.id) === String(sessionCart.id)) {
    return await ensureCartCurrency(ordersDb, customerCart, currency, store_id);
  }

  if (!customerCart) {
    const up = await ordersDb
      .from("carts")
      .update({
        user_id: customer_id,
        session_id: null,
        currency,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", sessionCart.id)
      .eq("store_id", store_id)
      .select("*")
      .single();

    if (up.error) throw new Error(up.error.message);

    return up.data;
  }

  const sessionItemsR = await ordersDb
    .from("cart_items")
    .select("id,product_id,variant_id,qty,selected_option_value_ids,line_key")
    .eq("cart_id", sessionCart.id);

  if (sessionItemsR.error) throw new Error(sessionItemsR.error.message);

  const sessionItems = Array.isArray(sessionItemsR.data)
    ? sessionItemsR.data
    : [];

  const customerItemsR = await ordersDb
    .from("cart_items")
    .select("id,line_key,qty")
    .eq("cart_id", customerCart.id);

  if (customerItemsR.error) throw new Error(customerItemsR.error.message);

  const customerItems = Array.isArray(customerItemsR.data)
    ? customerItemsR.data
    : [];

  const customerByLine = new Map<string, any>();

  for (const item of customerItems) {
    const lineKey = String(item?.line_key ?? "").trim();
    if (lineKey) customerByLine.set(lineKey, item);
  }

  for (const item of sessionItems) {
    const product_id = String(item?.product_id ?? "").trim();

    if (!product_id) {
      await ordersDb
        .from("cart_items")
        .delete()
        .eq("id", item.id)
        .eq("cart_id", sessionCart.id);

      continue;
    }

    const selected_option_value_ids = Array.isArray(
      item?.selected_option_value_ids,
    )
      ? item.selected_option_value_ids.map(String).filter(Boolean)
      : [];

    let variant_id = item?.variant_id ? String(item.variant_id) : null;

    if (!variant_id && selected_option_value_ids.length > 0) {
      const resolved = await resolveVariantIdFromOptions(storeDb, {
        product_id,
        selected_option_value_ids,
      });

      if (resolved) variant_id = resolved;
    }

    const line_key = buildLineKey({
      product_id,
      variant_id,
      selected_option_value_ids,
    });

    const sessionQty = Math.max(1, Number(item?.qty ?? 1));
    const hit = customerByLine.get(line_key);

    const stock = await getStockInfo(storeDb, {
      store_id,
      product_id,
      variant_id,
    });

    if (!stock.ok) {
      await ordersDb
        .from("cart_items")
        .delete()
        .eq("id", item.id)
        .eq("cart_id", sessionCart.id);

      continue;
    }

    if (hit?.id) {
      const desired = Math.max(
        1,
        Math.floor(Number(hit.qty ?? 1) + sessionQty),
      );
      const { finalQty, hardMax } = clampToAllowedQty(desired, stock);

      if (hardMax <= 0) {
        await ordersDb
          .from("cart_items")
          .delete()
          .eq("id", item.id)
          .eq("cart_id", sessionCart.id);

        continue;
      }

      const up = await ordersDb
        .from("cart_items")
        .update({ qty: finalQty })
        .eq("id", hit.id)
        .eq("cart_id", customerCart.id);

      if (up.error) throw new Error(up.error.message);

      const del = await ordersDb
        .from("cart_items")
        .delete()
        .eq("id", item.id)
        .eq("cart_id", sessionCart.id);

      if (del.error) throw new Error(del.error.message);
    } else {
      const { finalQty, hardMax } = clampToAllowedQty(sessionQty, stock);

      if (hardMax <= 0) {
        await ordersDb
          .from("cart_items")
          .delete()
          .eq("id", item.id)
          .eq("cart_id", sessionCart.id);

        continue;
      }

      const mv = await ordersDb
        .from("cart_items")
        .update({
          cart_id: customerCart.id,
          qty: finalQty,
          line_key,
          variant_id,
          selected_option_value_ids,
        })
        .eq("id", item.id)
        .eq("cart_id", sessionCart.id);

      if (mv.error) throw new Error(mv.error.message);

      customerByLine.set(line_key, {
        id: item.id,
        qty: finalQty,
        line_key,
      });
    }
  }

  const close = await ordersDb
    .from("carts")
    .update({
      status: "abandoned",
      session_id: null,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", sessionCart.id)
    .eq("store_id", store_id);

  if (close.error) {
    // ignore
  }

  const updatedCustomerCart = await ensureCartCurrency(
    ordersDb,
    customerCart,
    currency,
    store_id,
  );

  await ordersDb
    .from("carts")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", updatedCustomerCart.id)
    .eq("store_id", store_id);

  return updatedCustomerCart;
}

/**
 * المصدر الوحيد للحصول على السلة المفتوحة عند العمليات التي تحتاج إنشاء/كتابة:
 * - إضافة منتج
 * - checkout
 * - claim
 *
 * لا تستخدمه داخل GET /api/cart الفاضي.
 */
export async function getOrCreateOpenCart(args: {
  store_id: string;
  session_id: string;
}) {
  const storeId = String(args.store_id ?? "").trim();
  const sessionId = String(args.session_id ?? "").trim();

  if (!storeId) throw new Error("STORE_NOT_FOUND");

  const ordersDb: any = await getOrdersDb(storeId);
  const storeDb: any = await getStoreDb(storeId);

  const currency = await getStoreCurrency(storeId);
  const customer_id = await getCustomerIdMaybe(storeId);

  if (customer_id) {
    return await mergeSessionCartIntoCustomerCart({
      ordersDb,
      storeDb,
      store_id: storeId,
      customer_id,
      session_id: sessionId,
      currency,
    });
  }

  const r2 = await ordersDb
    .from("carts")
    .select("*")
    .eq("store_id", storeId)
    .eq("session_id", sessionId)
    .eq("status", "open")
    .limit(1)
    .maybeSingle();

  if (r2.error) throw new Error(r2.error.message);

  if (r2.data) {
    return await ensureCartCurrency(ordersDb, r2.data, currency, storeId);
  }

  const ins = await ordersDb
    .from("carts")
    .insert({
      store_id: storeId,
      user_id: null,
      session_id: sessionId,
      status: "open",
      currency,
      last_activity_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (ins.error) throw new Error(ins.error.message);

  return ins.data;
}

/**
 * للعدد الأولي فقط.
 * لا ينشئ سلة جديدة.
 */
export async function getExistingOpenCartsForInitialCount(args: {
  store_id: string;
  session_id: string;
}) {
  const storeId = String(args.store_id ?? "").trim();
  const sessionId = String(args.session_id ?? "").trim();

  if (!storeId) return [];

  const ordersDb: any = await getOrdersDb(storeId);
  const customer_id = await getCustomerIdMaybe(storeId);

  const carts: any[] = [];
  const seen = new Set<string>();

  function pushCart(cart: any) {
    const id = String(cart?.id ?? "").trim();

    if (!id || seen.has(id)) return;

    seen.add(id);
    carts.push(cart);
  }

  if (customer_id) {
    const [customerCartR, sessionCartR] = await Promise.all([
      ordersDb
        .from("carts")
        .select("id,item_count,updated_at,created_at,last_activity_at")
        .eq("store_id", storeId)
        .eq("user_id", customer_id)
        .eq("status", "open")
        .order("last_activity_at", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      sessionId
        ? ordersDb
            .from("carts")
            .select("id,item_count,updated_at,created_at,last_activity_at")
            .eq("store_id", storeId)
            .eq("session_id", sessionId)
            .eq("status", "open")
            .order("last_activity_at", { ascending: false, nullsFirst: false })
            .order("updated_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (!customerCartR.error && customerCartR.data?.id) {
      pushCart(customerCartR.data);
    }

    if (!sessionCartR.error && sessionCartR.data?.id) {
      pushCart(sessionCartR.data);
    }

    return carts;
  }

  if (!sessionId) return [];

  const sessionCartR = await ordersDb
    .from("carts")
    .select("id,item_count,updated_at,created_at,last_activity_at")
    .eq("store_id", storeId)
    .eq("session_id", sessionId)
    .eq("status", "open")
    .order("last_activity_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sessionCartR.error && sessionCartR.data?.id) {
    pushCart(sessionCartR.data);
  }

  return carts;
}