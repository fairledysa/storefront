// FILE: apps/storefront/src/app/(store)/api/auth/oauth/finish/route.ts

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { getOrdersDb } from "@/data/db/orders-db.server";
import { signSession, verifyOAuthTransfer } from "@/lib/auth/session";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { attachPendingReferral } from "@/lib/referrals/attach-referral.server";

import {
  getRequestOrigin,
  redirectWithAuthError,
  redirectWithAuthSuccess,
  safeNextPath,
  s,
} from "../_lib/oauth-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CART_COOKIE = "darb_cart_session";
const SESSION_COOKIE = "elyaia_session";

async function setSessionCookie(token: string) {
  const cookieStore = await cookies();

  cookieStore.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

async function mergeCartAfterLogin(args: {
  sb: any;
  store_id: string;
  customer_id: string;
  session_id: string;
}) {
  const { sb, store_id, customer_id, session_id } = args;

  if (!session_id) return null;

  const sessionCartR = await sb
    .from("carts")
    .select("id,store_id,session_id,user_id,status")
    .eq("store_id", store_id)
    .eq("session_id", session_id)
    .eq("status", "open")
    .limit(1)
    .maybeSingle();

  if (sessionCartR.error) throw new Error(sessionCartR.error.message);

  const sessionCart = sessionCartR.data ?? null;
  if (!sessionCart?.id) return null;

  const customerCartR = await sb
    .from("carts")
    .select("id,store_id,session_id,user_id,status")
    .eq("store_id", store_id)
    .eq("user_id", customer_id)
    .eq("status", "open")
    .limit(1)
    .maybeSingle();

  if (customerCartR.error) throw new Error(customerCartR.error.message);

  const customerCart = customerCartR.data ?? null;

  if (!customerCart?.id) {
    const up = await sb
      .from("carts")
      .update({
        user_id: customer_id,
        session_id: null,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", sessionCart.id)
      .eq("store_id", store_id)
      .select("id,status")
      .single();

    if (up.error) throw new Error(up.error.message);

    return { merged_cart_id: sessionCart.id };
  }

  if (String(customerCart.id) === String(sessionCart.id)) {
    await sb
      .from("carts")
      .update({
        session_id: null,
        user_id: customer_id,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", customerCart.id)
      .eq("store_id", store_id);

    return { merged_cart_id: customerCart.id };
  }

  const sessionItemsR = await sb
    .from("cart_items")
    .select("id,line_key,qty")
    .eq("cart_id", sessionCart.id);

  if (sessionItemsR.error) throw new Error(sessionItemsR.error.message);

  const sessionItems = Array.isArray(sessionItemsR.data)
    ? sessionItemsR.data
    : [];

  const customerItemsR = await sb
    .from("cart_items")
    .select("id,line_key,qty")
    .eq("cart_id", customerCart.id);

  if (customerItemsR.error) throw new Error(customerItemsR.error.message);

  const customerItems = Array.isArray(customerItemsR.data)
    ? customerItemsR.data
    : [];

  const customerByLine = new Map<string, { id: string; qty: number }>();

  for (const it of customerItems) {
    const lineKey = String(it?.line_key ?? "").trim();
    if (!lineKey) continue;

    customerByLine.set(lineKey, {
      id: String(it.id),
      qty: Number(it.qty ?? 0),
    });
  }

  for (const it of sessionItems) {
    const lineKey = String(it?.line_key ?? "").trim();
    const qty = Math.max(1, Number(it?.qty ?? 1));

    if (!lineKey) {
      const del = await sb
        .from("cart_items")
        .delete()
        .eq("id", it.id)
        .eq("cart_id", sessionCart.id);

      if (del.error) throw new Error(del.error.message);
      continue;
    }

    const hit = customerByLine.get(lineKey);

    if (hit?.id) {
      const newQty = Math.max(1, hit.qty + qty);

      const up = await sb
        .from("cart_items")
        .update({ qty: newQty })
        .eq("id", hit.id)
        .eq("cart_id", customerCart.id);

      if (up.error) throw new Error(up.error.message);

      const del = await sb
        .from("cart_items")
        .delete()
        .eq("id", it.id)
        .eq("cart_id", sessionCart.id);

      if (del.error) throw new Error(del.error.message);

      customerByLine.set(lineKey, { id: hit.id, qty: newQty });
    } else {
      const mv = await sb
        .from("cart_items")
        .update({ cart_id: customerCart.id })
        .eq("id", it.id)
        .eq("cart_id", sessionCart.id);

      if (mv.error) throw new Error(mv.error.message);

      customerByLine.set(lineKey, { id: String(it.id), qty });
    }
  }

  await sb
    .from("carts")
    .update({
      status: "abandoned",
      session_id: null,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", sessionCart.id)
    .eq("store_id", store_id);

  await sb
    .from("carts")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", customerCart.id)
    .eq("store_id", store_id);

  return { merged_cart_id: customerCart.id };
}

export async function GET(request: NextRequest) {
  const origin = getRequestOrigin(request);
  const token = s(request.nextUrl.searchParams.get("token"));
  const payload = token ? verifyOAuthTransfer(token) : null;
  const next = safeNextPath(payload?.next || "/");

  if (!payload?.store_id || !payload?.customer_id) {
    return redirectWithAuthError({
      origin,
      next: "/",
      error: "INVALID_OAUTH_TRANSFER",
    });
  }

  const ctx = await resolveStoreContext();

  if (!ctx?.store?.id) {
    return redirectWithAuthError({
      origin,
      next,
      error: "STORE_NOT_FOUND",
    });
  }

  const storeId = String(ctx.store.id);

  if (storeId !== String(payload.store_id)) {
    return redirectWithAuthError({
      origin,
      next,
      error: "STORE_MISMATCH",
    });
  }

  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
  const session = signSession({
    customer_id: String(payload.customer_id),
    exp,
  });

  await setSessionCookie(session);
  await attachPendingReferral(storeId, String(payload.customer_id));

  const jar = await cookies();
  const sid = jar.get(CART_COOKIE)?.value || "";

  try {
    const ordersDb: any = await getOrdersDb(storeId);

    await mergeCartAfterLogin({
      sb: ordersDb,
      store_id: storeId,
      customer_id: String(payload.customer_id),
      session_id: sid,
    });
  } catch {
    // لا نكسر تسجيل الدخول لو فشل دمج السلة
  }

  return redirectWithAuthSuccess({
    origin,
    next,
  });
}