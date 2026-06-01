// FILE: apps/storefront/src/app/(store)/api/checkout/confirm/route.ts

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getOrdersDb } from "@/data/db/orders-db.server";
import { getStoreDb } from "@/data/db/store-db.server";
import { verifySession } from "@/lib/auth/session";
import {
  cartSessionCookie,
  getCartSessionId,
  getStoreIdOrThrow,
} from "../../_cart/cart.server";
import { evaluateCodRestrictions } from "../lib/cod-restrictions";

export const dynamic = "force-dynamic";

const SESSION_COOKIE = "elyaia_session";

function s(x: any) {
  return String(x ?? "").trim();
}

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function round2(x: number) {
  return Math.round(x * 100) / 100;
}

function jsonError(error: string, status = 400, extra?: any) {
  return NextResponse.json(
    { ok: false, error, ...(extra ? { extra } : {}) },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

function jsonOkWithCartCookie(args: {
  session_id: string;
  payload: Record<string, any>;
}) {
  const res = NextResponse.json(args.payload, {
    headers: { "Cache-Control": "no-store" },
  });

  res.cookies.set(cartSessionCookie(args.session_id));
  return res;
}

function isUuidLike(x: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(x || "").trim(),
  );
}

async function getCheckoutCustomerId(args: { sb: any; store_id: string }) {
  try {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value || "";

    if (!token) {
      return {
        ok: false as const,
        status: 401,
        error: "LOGIN_REQUIRED",
      };
    }

    const payload: any = await Promise.resolve(verifySession(token) as any);
    const customerId = payload?.customer_id ? String(payload.customer_id) : "";

    if (!customerId) {
      return {
        ok: false as const,
        status: 401,
        error: "LOGIN_REQUIRED",
      };
    }

    const linkR = await args.sb
      .from("store_customers")
      .select("store_id,customer_id")
      .eq("store_id", args.store_id)
      .eq("customer_id", customerId)
      .limit(1)
      .maybeSingle();

    if (linkR.error) {
      return {
        ok: false as const,
        status: 500,
        error: linkR.error.message,
      };
    }

    if (!linkR.data?.customer_id) {
      return {
        ok: false as const,
        status: 401,
        error: "LOGIN_REQUIRED",
      };
    }

    return {
      ok: true as const,
      customer_id: customerId,
    };
  } catch {
    return {
      ok: false as const,
      status: 401,
      error: "LOGIN_REQUIRED",
    };
  }
}

async function getCheckoutCart(args: {
  sb: any;
  store_id: string;
  customer_id: string;
  session_id: string;
}) {
  const customerCartR = await args.sb
    .from("carts")
    .select("id,store_id,status,address_id,shipping_id,payment_method,user_id")
    .eq("store_id", args.store_id)
    .eq("user_id", args.customer_id)
    .eq("status", "open")
    .order("last_activity_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (customerCartR.error) {
    return {
      ok: false as const,
      status: 500,
      error: customerCartR.error.message,
      cart: null,
    };
  }

  if (customerCartR.data?.id) {
    return {
      ok: true as const,
      cart: customerCartR.data,
    };
  }

  const sessionId = s(args.session_id);

  if (!sessionId) {
    return {
      ok: false as const,
      status: 404,
      error: "CART_NOT_FOUND",
      cart: null,
    };
  }

  const sessionCartR = await args.sb
    .from("carts")
    .select("id,store_id,status,address_id,shipping_id,payment_method,user_id")
    .eq("store_id", args.store_id)
    .eq("session_id", sessionId)
    .eq("status", "open")
    .order("last_activity_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sessionCartR.error) {
    return {
      ok: false as const,
      status: 500,
      error: sessionCartR.error.message,
      cart: null,
    };
  }

  if (!sessionCartR.data?.id) {
    return {
      ok: false as const,
      status: 404,
      error: "CART_NOT_FOUND",
      cart: null,
    };
  }

  const claimR = await args.sb
    .from("carts")
    .update({
      user_id: args.customer_id,
      session_id: null,
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", String(sessionCartR.data.id))
    .eq("store_id", args.store_id)
    .eq("status", "open")
    .select("id,store_id,status,address_id,shipping_id,payment_method,user_id")
    .maybeSingle();

  if (claimR.error) {
    return {
      ok: false as const,
      status: 500,
      error: claimR.error.message,
      cart: null,
    };
  }

  if (!claimR.data?.id) {
    return {
      ok: false as const,
      status: 404,
      error: "CART_NOT_FOUND",
      cart: null,
    };
  }

  return {
    ok: true as const,
    cart: claimR.data,
  };
}

function pickByCityScope(rate: any, cityId: string) {
  const scope = s(rate?.scope);

  const included: string[] = Array.isArray(rate?.included_city_ids)
    ? rate.included_city_ids.map((x: any) => String(x))
    : [];

  const excluded: string[] = Array.isArray(rate?.excluded_city_ids)
    ? rate.excluded_city_ids.map((x: any) => String(x))
    : [];

  if (!cityId) return false;
  if (excluded.includes(cityId)) return false;

  if (scope === "include_cities") return included.includes(cityId);

  return true;
}

async function getAddressCity(args: {
  sb: any;
  address_id: string;
  customer_id: string;
}) {
  const r = await args.sb
    .from("customer_addresses")
    .select("id,city_id,customer_id")
    .eq("id", args.address_id)
    .eq("customer_id", args.customer_id)
    .limit(1)
    .maybeSingle();

  if (r.error) {
    return { ok: false as const, error: r.error.message, city_id: null };
  }

  if (!r.data?.id) {
    return { ok: false as const, error: "ADDRESS_NOT_FOUND", city_id: null };
  }

  return {
    ok: true as const,
    error: null,
    city_id: s(r.data.city_id) || null,
  };
}

type ShippingValidationResult =
  | {
      ok: true;
      kind: "rate";
      carrier_id: string;
      shipping_id: string;
    }
  | {
      ok: true;
      kind: "pickup";
      carrier_id: string;
      pickup_point_id: string;
      shipping_id: string;
    }
  | {
      ok: false;
      error: string;
    };

async function validateShippingSelection(args: {
  shippingDb: any;
  store_id: string;
  shipping_id: string;
  city_id: string | null;
}): Promise<ShippingValidationResult> {
  const { shippingDb, store_id, shipping_id, city_id } = args;

  if (!shipping_id || !isUuidLike(shipping_id)) {
    return { ok: false, error: "SHIPPING_NOT_FOUND" };
  }

  if (!city_id) {
    return { ok: false, error: "NEED_ADDRESS_FOR_SHIPPING" };
  }

  const rateR = await shippingDb
    .from("store_shipping_rates")
    .select(
      "id,store_id,store_shipping_carrier_id,scope,included_city_ids,excluded_city_ids,enabled,status",
    )
    .eq("id", shipping_id)
    .eq("store_id", store_id)
    .limit(1)
    .maybeSingle();

  if (rateR.error) {
    return { ok: false, error: rateR.error.message };
  }

  if (rateR.data?.id) {
    const rateEnabled = rateR.data.enabled === true || rateR.data.enabled === 1;

    if (!rateEnabled || s(rateR.data.status) !== "active") {
      return { ok: false, error: "SHIPPING_NOT_AVAILABLE" };
    }

    if (!pickByCityScope(rateR.data, city_id)) {
      return { ok: false, error: "SHIPPING_NOT_AVAILABLE_FOR_CITY" };
    }

    const carrierId = s(rateR.data.store_shipping_carrier_id);

    const carrierR = await shippingDb
      .from("store_shipping_carriers")
      .select("id,store_id,type,enabled,is_enabled,status")
      .eq("id", carrierId)
      .eq("store_id", store_id)
      .limit(1)
      .maybeSingle();

    if (carrierR.error) {
      return { ok: false, error: carrierR.error.message };
    }

    if (!carrierR.data?.id) {
      return { ok: false, error: "SHIPPING_NOT_FOUND" };
    }

    const carrierEnabled =
      carrierR.data.enabled === true ||
      carrierR.data.is_enabled === true ||
      carrierR.data.enabled === 1 ||
      carrierR.data.is_enabled === 1;

    if (!carrierEnabled || s(carrierR.data.status) !== "active") {
      return { ok: false, error: "SHIPPING_NOT_AVAILABLE" };
    }

    return {
      ok: true,
      kind: "rate",
      carrier_id: carrierId,
      shipping_id,
    };
  }

  const pointR = await shippingDb
    .from("store_pickup_points")
    .select(
      "id,store_id,store_shipping_carrier_id,city_id,title,address,status",
    )
    .eq("id", shipping_id)
    .eq("store_id", store_id)
    .limit(1)
    .maybeSingle();

  if (pointR.error) {
    return { ok: false, error: pointR.error.message };
  }

  if (!pointR.data?.id) {
    return { ok: false, error: "SHIPPING_NOT_FOUND" };
  }

  if (s(pointR.data.status) !== "active") {
    return { ok: false, error: "PICKUP_POINT_NOT_AVAILABLE" };
  }
 

  const carrierId = s(pointR.data.store_shipping_carrier_id);

  const carrierR = await shippingDb
    .from("store_shipping_carriers")
    .select("id,store_id,type,enabled,is_enabled,status")
    .eq("id", carrierId)
    .eq("store_id", store_id)
    .limit(1)
    .maybeSingle();

  if (carrierR.error) {
    return { ok: false, error: carrierR.error.message };
  }

  if (!carrierR.data?.id) {
    return { ok: false, error: "SHIPPING_NOT_FOUND" };
  }

  const carrierEnabled =
    carrierR.data.enabled === true ||
    carrierR.data.is_enabled === true ||
    carrierR.data.enabled === 1 ||
    carrierR.data.is_enabled === 1;

  if (
    !carrierEnabled ||
    s(carrierR.data.status) !== "active" ||
    s(carrierR.data.type) !== "pickup"
  ) {
    return { ok: false, error: "PICKUP_NOT_AVAILABLE" };
  }

  return {
    ok: true,
    kind: "pickup",
    carrier_id: carrierId,
    pickup_point_id: shipping_id,
    shipping_id,
  };
}

async function validateShippingRate(args: {
  shippingDb: any;
  store_id: string;
  shipping_id: string;
  city_id: string | null;
}) {
  const result = await validateShippingSelection(args);

  if (!result.ok) return result;

  if (result.kind !== "rate") {
    return { ok: false as const, error: "SHIPPING_RATE_REQUIRED" };
  }

  return { ok: true as const };
}

function isProviderMethod(pm: string) {
  return pm.startsWith("provider:");
}

function providerCode(pm: string) {
  return pm.replace("provider:", "").trim();
}

async function loadCartProductsSubtotal(args: {
  sb: any;
  store_id: string;
  cart_id: string;
}) {
  const r = await args.sb
    .from("cart_items")
    .select("qty,unit_price")
    .eq("store_id", args.store_id)
    .eq("cart_id", args.cart_id);

  if (r.error) throw new Error(r.error.message);

  let subtotal = 0;

  for (const item of Array.isArray(r.data) ? r.data : []) {
    const qty = Math.max(1, Math.floor(n(item?.qty) || 1));
    const unitPrice = Math.max(0, n(item?.unit_price));

    subtotal += qty * unitPrice;
  }

  return round2(Math.max(0, subtotal));
}

async function validatePaymentMethod(args: {
  sb: any;
  shippingDb: any;
  store_id: string;
  cart_id: string;
  customer_id: string;
  payment_method: string;
  shipping_id: string;
  city_id: string;
}) {
  const {
    sb,
    shippingDb,
    store_id,
    cart_id,
    customer_id,
    payment_method,
    shipping_id,
    city_id,
  } = args;

  const pm = s(payment_method);

  if (!pm) return { ok: false as const, error: "PAYMENT_METHOD_REQUIRED" };

  const shippingValid = await validateShippingSelection({
    shippingDb,
    store_id,
    shipping_id,
    city_id,
  });

  if (!shippingValid.ok) {
    return shippingValid;
  }

  if (pm === "cod") {
    if (shippingValid.kind === "pickup") {
      return { ok: false as const, error: "COD_NOT_AVAILABLE_FOR_PICKUP" };
    }

    const rateR = await shippingDb
      .from("store_shipping_rates")
      .select(
        "id,store_shipping_carrier_id,scope,included_city_ids,excluded_city_ids,enabled,status,cod_enabled",
      )
      .eq("id", shipping_id)
      .eq("store_id", store_id)
      .limit(1)
      .maybeSingle();

    if (rateR.error) return { ok: false as const, error: rateR.error.message };
    if (!rateR.data?.id) return { ok: false as const, error: "COD_NOT_AVAILABLE" };

    if (rateR.data.cod_enabled !== true) {
      return { ok: false as const, error: "COD_NOT_ENABLED" };
    }

    const carrierR = await shippingDb
      .from("store_shipping_carriers")
      .select("id,type,enabled,is_enabled,status")
      .eq("id", String(rateR.data.store_shipping_carrier_id))
      .eq("store_id", store_id)
      .limit(1)
      .maybeSingle();

    if (carrierR.error) {
      return { ok: false as const, error: carrierR.error.message };
    }

    if (!carrierR.data?.id) {
      return { ok: false as const, error: "COD_NOT_AVAILABLE" };
    }

    const carrierEnabled =
      carrierR.data.enabled === true ||
      carrierR.data.is_enabled === true ||
      carrierR.data.enabled === 1;

    if (!carrierEnabled || s(carrierR.data.status) !== "active") {
      return { ok: false as const, error: "COD_NOT_AVAILABLE" };
    }

    if (s(carrierR.data.type) === "pickup") {
      return { ok: false as const, error: "COD_NOT_AVAILABLE_FOR_PICKUP" };
    }

    const cartSubtotal = await loadCartProductsSubtotal({
      sb,
      store_id,
      cart_id,
    });

    const codRestrictions = await evaluateCodRestrictions({
      sb,
      storeId: store_id,
      cartId: cart_id,
      cartSubtotal,
      customerId: customer_id || null,
      toCartCurrency: (amount) => round2(Math.max(0, n(amount))),
    });

    if (!codRestrictions.allowed) {
      return {
        ok: false as const,
        error: codRestrictions.reason || "COD_RESTRICTED",
      };
    }

    return { ok: true as const };
  }

  if (pm === "bank_transfer") {
    const banksR = await sb
      .from("store_bank_accounts")
      .select("id,status")
      .eq("store_id", store_id);

    if (banksR.error) {
      return { ok: false as const, error: banksR.error.message };
    }

    const hasActive = (banksR.data ?? []).some(
      (b: any) => s(b.status) === "active",
    );

    if (!hasActive) {
      return { ok: false as const, error: "BANK_TRANSFER_NOT_AVAILABLE" };
    }

    return { ok: true as const };
  }

  if (isProviderMethod(pm)) {
    const code = providerCode(pm);

    if (!code) {
      return { ok: false as const, error: "PROVIDER_NOT_AVAILABLE" };
    }

    const pmR = await sb
      .from("store_payment_methods")
      .select("id,provider_code,enabled,status")
      .eq("store_id", store_id)
      .eq("provider_code", code)
      .limit(1)
      .maybeSingle();

    if (pmR.error) {
      return { ok: false as const, error: pmR.error.message };
    }

    const row = pmR.data;

    if (!row?.id) {
      return { ok: false as const, error: "PROVIDER_NOT_AVAILABLE" };
    }

    if (!Boolean(row.enabled) || s(row.status) !== "active") {
      return { ok: false as const, error: "PROVIDER_NOT_AVAILABLE" };
    }

    return { ok: true as const };
  }

  return { ok: false as const, error: "PAYMENT_METHOD_INVALID" };
}

export async function POST(req: Request) {
  try {
    const store_id = await getStoreIdOrThrow();
    const sb: any = await getOrdersDb(store_id);
    const shippingDb: any = await getStoreDb(store_id);
    const session_id = await getCartSessionId();

    const customer = await getCheckoutCustomerId({
      sb,
      store_id,
    });

    if (!customer.ok) {
      return jsonError(customer.error, customer.status);
    }

    const body = await req.json().catch(() => ({}));

    const address_id_in = s(body?.address_id) || null;
    const shipping_id_in = s(body?.shipping_id) || null;
    const payment_method_in = s(body?.payment_method) || null;

    if (!address_id_in && !shipping_id_in && !payment_method_in) {
      return jsonError("PATCH_REQUIRED", 400);
    }

    const cartResult = await getCheckoutCart({
      sb,
      store_id,
      customer_id: customer.customer_id,
      session_id,
    });

    if (!cartResult.ok) {
      return jsonError(cartResult.error, cartResult.status);
    }

    const cart = cartResult.cart;
    const cart_id = s(cart?.id) || "";

    if (!cart_id) {
      return jsonError("CART_NOT_FOUND", 404);
    }

    if (s(cart.status) !== "open") {
      return jsonError("CART_NOT_OPEN", 400);
    }

    const currentAddressId = cart.address_id ? String(cart.address_id) : null;
    const currentShippingId = cart.shipping_id ? String(cart.shipping_id) : null;
    const currentPaymentMethod = cart.payment_method
      ? String(cart.payment_method)
      : null;

    const addressChanged = Boolean(
      address_id_in && s(currentAddressId) !== s(address_id_in),
    );

    const shippingChanged = Boolean(
      shipping_id_in && s(currentShippingId) !== s(shipping_id_in),
    );

    const finalAddressId = address_id_in ?? currentAddressId;
    const finalShippingId =
      shipping_id_in ?? (addressChanged ? null : currentShippingId);
    const finalPaymentMethod =
      payment_method_in ??
      (addressChanged || shippingChanged ? null : currentPaymentMethod);

    let city_id: string | null = null;

    if (finalAddressId) {
      const addr = await getAddressCity({
        sb,
        address_id: finalAddressId,
        customer_id: customer.customer_id,
      });

      if (!addr.ok) {
        return jsonError(addr.error || "ADDRESS_NOT_FOUND", 400);
      }

      city_id = addr.city_id;
    }

    if (shipping_id_in) {
      const v = await validateShippingSelection({
        shippingDb,
        store_id,
        shipping_id: shipping_id_in,
        city_id,
      });

      if (!v.ok) {
        return jsonError(v.error || "SHIPPING_NOT_AVAILABLE", 400);
      }
    }

    if (payment_method_in) {
      if (!finalAddressId || !city_id) {
        return jsonError("NEED_ADDRESS_FOR_PAYMENT", 400);
      }

      if (!finalShippingId) {
        return jsonError("NEED_SHIPPING_FOR_PAYMENT", 400);
      }

      const v = await validatePaymentMethod({
        sb,
        shippingDb,
        store_id,
        cart_id,
        customer_id: customer.customer_id,
        payment_method: payment_method_in,
        shipping_id: finalShippingId,
        city_id,
      });

      if (!v.ok) {
        return jsonError(v.error || "PAYMENT_METHOD_NOT_AVAILABLE", 400);
      }
    }

    const patch: Record<string, any> = {
      updated_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    };

    if (address_id_in) {
      patch.address_id = address_id_in;
    }

    if (addressChanged && !shipping_id_in) {
      patch.shipping_id = null;
    }

    if (shipping_id_in) {
      patch.shipping_id = shipping_id_in;
    }

    if ((addressChanged || shippingChanged) && !payment_method_in) {
      patch.payment_method = null;
    }

    if (payment_method_in) {
      patch.payment_method = payment_method_in;
    }

    const uR = await sb
      .from("carts")
      .update(patch)
      .eq("id", cart_id)
      .eq("store_id", store_id)
      .eq("user_id", customer.customer_id)
      .eq("status", "open")
      .select("id,address_id,shipping_id,payment_method")
      .maybeSingle();

    if (uR.error) {
      return jsonError("CONFIRM_UPDATE_FAILED", 500, {
        error: uR.error.message,
        cart_id,
        patch,
      });
    }

    if (!uR.data?.id) {
      return jsonError("CART_NOT_FOUND", 404);
    }

    return jsonOkWithCartCookie({
      session_id,
      payload: {
        ok: true,
        cart: uR.data,
        summary: null,
        summary_pending: true,
        state: {
          address_id: uR.data.address_id ?? null,
          shipping_id: uR.data.shipping_id ?? null,
          payment_method: uR.data.payment_method ?? null,
          payment_ready: Boolean(uR.data.payment_method),
        },
      },
    });
  } catch (e: any) {
    return jsonError(e?.message || "CONFIRM_FAILED", 500);
  }
}