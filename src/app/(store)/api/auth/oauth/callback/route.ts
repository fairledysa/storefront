// FILE: apps/storefront/src/app/(store)/api/auth/oauth/callback/route.ts

import { NextRequest, NextResponse } from "next/server";

import { getStoreDb } from "@/data/db/store-db.server";
import { supabaseSSR } from "@/data/store/supabase.ssr";
import { signOAuthTransfer } from "@/lib/auth/session";

import {
  redirectWithAuthError,
  resolveOAuthStoreFromHost,
  s,
  safeNextPath,
  safeStoreOrigin,
} from "../_lib/oauth-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extractFullName(user: any) {
  return (
    s(user?.user_metadata?.full_name) ||
    s(user?.user_metadata?.name) ||
    s(user?.user_metadata?.user_name) ||
    s(user?.user_metadata?.preferred_username) ||
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

export async function GET(request: NextRequest) {
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));

  const storeHostRaw = request.nextUrl.searchParams.get("store_host") || "";
  const storeOrigin = safeStoreOrigin({
    storeOriginRaw: request.nextUrl.searchParams.get("store_origin"),
    storeHostRaw,
  });

  const fallbackOrigin = storeOrigin || "https://elyaia.com";

  function fail(error: string) {
    return redirectWithAuthError({
      origin: fallbackOrigin,
      next,
      error,
    });
  }

  const providerError =
    request.nextUrl.searchParams.get("error_description") ||
    request.nextUrl.searchParams.get("error");

  if (providerError) {
    return fail(providerError);
  }

  if (!storeOrigin) {
    return fail("INVALID_STORE_ORIGIN");
  }

  const store = await resolveOAuthStoreFromHost(storeHostRaw);

  if (!store?.storeId) {
    return fail("STORE_NOT_FOUND");
  }

  const code = s(request.nextUrl.searchParams.get("code"));

  if (!code) {
    return fail("OAUTH_CODE_MISSING");
  }

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

    const storeDb: any = await getStoreDb(store.storeId);

    const customerId = await ensureCustomerFromOAuth({
      sb: storeDb,
      storeId: store.storeId,
      user,
    });

    const transfer = signOAuthTransfer({
      store_id: store.storeId,
      customer_id: customerId,
      next,
      exp: Math.floor(Date.now() / 1000) + 60 * 5,
    });

    const finishUrl = new URL("/api/auth/oauth/finish", storeOrigin);
    finishUrl.searchParams.set("token", transfer);

    return NextResponse.redirect(finishUrl);
  } catch (error: any) {
    return fail(error?.message || "OAUTH_CALLBACK_FAILED");
  }
}