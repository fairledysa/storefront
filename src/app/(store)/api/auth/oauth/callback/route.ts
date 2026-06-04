// FILE: apps/storefront/src/app/(store)/api/auth/oauth/callback/route.ts

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { getOrdersDb } from "@/data/db/orders-db.server";
import { getStoreDb } from "@/data/db/store-db.server";
import { supabaseSSR } from "@/data/store/supabase.ssr";
import { signSession } from "@/lib/auth/session";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CART_COOKIE = "darb_cart_session";
const SESSION_COOKIE = "elyaia_session";

function s(value: unknown) {
  return String(value ?? "").trim();
}

function safeNextPath(value: string | null) {
  const raw = s(value);

  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  if (raw.startsWith("/api/")) return "/";

  return raw;
}

function getRequestOrigin(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  const host = forwardedHost || request.headers.get("host");
  const proto =
    forwardedProto ||
    (process.env.NODE_ENV === "production" ? "https" : "http");

  if (host) return `${proto}://${host}`;

  return request.nextUrl.origin;
}

function redirectWithError(args: {
  request: NextRequest;
  next: string;
  error: string;
}) {
  const origin = getRequestOrigin(args.request);
  const url = new URL(args.next, origin);

  url.searchParams.set("auth_error", args.error);

  return NextResponse.redirect(url);
}

function redirectSuccess(args: { request: NextRequest; next: string }) {
  const origin = getRequestOrigin(args.request);
  const url = new URL(args.next, origin);

  url.searchParams.set("auth", "success");

  return NextResponse.redirect(url);
}

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

function extractFullName(user: any) {
  return (
    s(user?.user_metadata?.full_name) ||
    s(user?.user_metadata?.name) ||
    s(user?.user_metadata?.user_name) ||
    s(user?.user_metadata?.preferred_username) ||
    ""
  );
}

function extractAvatarUrl(user: any) {
  return (
    s(user?.user_metadata?.avatar_url) ||
    s(user?.user_metadata?.picture) ||
    ""
  );
}

async function ensureCustomerFromOAuth(args: {
  sb: any;
  storeId: string;
  user: any;
}) {
  const { sb, storeId, user } = args;

  const authUserId = s(user?.id);
  const email = s(user?.email).toLowerCase();
  const fullName = extractFullName(user);
  const avatarUrl = extractAvatarUrl(user);

  if (!authUserId) {
    throw new Error("OAUTH_USER_ID_MISSING");
  }

  if (!email) {
    throw new Error("OAUTH_EMAIL_MISSING");
  }

  const byAuthUser = await sb
    .from("customers")
    .select("id,email,auth_user_id,full_name,birth_date,gender,city_id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (byAuthUser.error) {
    throw new Error(byAuthUser.error.message);
  }

  let customer = byAuthUser.data ?? null;

  if (!customer?.id) {
    const byEmail = await sb
      .from("customers")
      .select("id,email,auth_user_id,full_name,birth_date,gender,city_id")
      .eq("email", email)
      .maybeSingle();

    if (byEmail.error) {
      throw new Error(byEmail.error.message);
    }

    customer = byEmail.data ?? null;
  }

  const patch: any = {
    auth_user_id: authUserId,
    email,
  };

  if (fullName && !s(customer?.full_name)) {
    patch.full_name = fullName;
  }

  if (avatarUrl) {
    patch.avatar_url = avatarUrl;
  }

  let customerId = "";

  if (customer?.id) {
    const updated = await sb
      .from("customers")
      .update(patch)
      .eq("id", customer.id)
      .select("id,email,auth_user_id,full_name,birth_date,gender,city_id")
      .single();

    if (updated.error || !updated.data?.id) {
      throw new Error(updated.error?.message || "CUSTOMER_UPDATE_FAILED");
    }

    customerId = String(updated.data.id);
  } else {
    const created = await sb
      .from("customers")
      .insert({
        ...patch,
        full_name: fullName || null,
      })
      .select("id,email,auth_user_id,full_name,birth_date,gender,city_id")
      .single();

    if (created.error || !created.data?.id) {
      throw new Error(created.error?.message || "CUSTOMER_CREATE_FAILED");
    }

    customerId = String(created.data.id);
  }

  const link = await sb.from("store_customers").upsert(
    {
      store_id: storeId,
      customer_id: customerId,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "store_id,customer_id" },
  );

  if (link.error) {
    throw new Error(link.error.message);
  }

  return customerId;
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
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));

  const providerError =
    request.nextUrl.searchParams.get("error_description") ||
    request.nextUrl.searchParams.get("error");

  if (providerError) {
    return redirectWithError({
      request,
      next,
      error: providerError,
    });
  }

  const code = s(request.nextUrl.searchParams.get("code"));

  if (!code) {
    return redirectWithError({
      request,
      next,
      error: "OAUTH_CODE_MISSING",
    });
  }

  const ctx = await resolveStoreContext();

  if (!ctx?.store?.id) {
    return redirectWithError({
      request,
      next,
      error: "STORE_NOT_FOUND",
    });
  }

  const storeId = String(ctx.store.id);

  try {
    const supabase = await supabaseSSR();

    const exchanged = await supabase.auth.exchangeCodeForSession(code);

    if (exchanged.error) {
      throw new Error(exchanged.error.message || "OAUTH_EXCHANGE_FAILED");
    }

    let user = exchanged.data?.user ?? null;

    if (!user?.id) {
      const userResult = await supabase.auth.getUser();

      if (userResult.error) {
        throw new Error(userResult.error.message || "OAUTH_USER_FAILED");
      }

      user = userResult.data?.user ?? null;
    }

    if (!user?.id) {
      throw new Error("OAUTH_USER_MISSING");
    }

    const storeDb: any = await getStoreDb(storeId);
    const ordersDb: any = await getOrdersDb(storeId);

    const customerId = await ensureCustomerFromOAuth({
      sb: storeDb,
      storeId,
      user,
    });

    const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
    const session = signSession({ customer_id: customerId, exp });

    await setSessionCookie(session);

    const jar = await cookies();
    const sid = jar.get(CART_COOKIE)?.value || "";

    try {
      await mergeCartAfterLogin({
        sb: ordersDb,
        store_id: storeId,
        customer_id: customerId,
        session_id: sid,
      });
    } catch {
      // لا نكسر تسجيل الدخول لو دمج السلة فشل
    }

    return redirectSuccess({ request, next });
  } catch (error: any) {
    return redirectWithError({
      request,
      next,
      error: error?.message || "OAUTH_CALLBACK_FAILED",
    });
  }
}