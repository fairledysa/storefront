// FILE: apps/storefront/src/app/(store)/api/auth/oauth/start/route.ts

import { NextRequest, NextResponse } from "next/server";

import { supabaseSSR } from "@/data/store/supabase.ssr";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";

import {
  getPlatformOriginForRequest,
  getRequestHost,
  getRequestHostWithPort,
  getRequestOrigin,
  isPlatformHost,
  redirectWithAuthError,
  resolveOAuthStoreFromHost,
  safeNextPath,
  safeStoreOrigin,
} from "../_lib/oauth-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OAuthProvider = "google" | "facebook";

function isAllowedProvider(value: string): value is OAuthProvider {
  return value === "google" || value === "facebook";
}

export async function GET(request: NextRequest) {
  const providerRaw = String(
    request.nextUrl.searchParams.get("provider") || "",
  ).trim();

  if (!isAllowedProvider(providerRaw)) {
    return NextResponse.json(
      { error: "INVALID_PROVIDER" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const currentHost = getRequestHost(request);
  const currentHostWithPort = getRequestHostWithPort(request);

  /*
    مهم جدًا:
    لو الطلب جاء من دومين متجر، لا نبدأ Supabase OAuth من المتجر.
    نحوله أولًا إلى منصة elyaia.com حتى تكون PKCE cookies على نفس دومين callback.
  */
  if (!isPlatformHost(currentHost)) {
    const ctx = await resolveStoreContext();

    if (!ctx?.store?.id) {
      return NextResponse.json(
        { error: "STORE_NOT_FOUND" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    const platformOrigin = getPlatformOriginForRequest(request);
    const url = new URL("/api/auth/oauth/start", platformOrigin);

    url.searchParams.set("provider", providerRaw);
    url.searchParams.set("next", next);
    url.searchParams.set("store_host", currentHostWithPort);
    url.searchParams.set("store_origin", getRequestOrigin(request));

    return NextResponse.redirect(url);
  }

  /*
    هنا نحن على المنصة الأساسية:
    https://elyaia.com/api/auth/oauth/start
  */
  const storeHostRaw = request.nextUrl.searchParams.get("store_host") || "";
  const storeOriginRaw = request.nextUrl.searchParams.get("store_origin");

  const store = await resolveOAuthStoreFromHost(storeHostRaw);

  if (!store?.storeId) {
    return NextResponse.json(
      { error: "STORE_NOT_FOUND_FOR_OAUTH" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const storeOrigin = safeStoreOrigin({
    storeOriginRaw,
    storeHostRaw,
  });

  if (!storeOrigin) {
    return NextResponse.json(
      { error: "INVALID_STORE_ORIGIN" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const platformOrigin = getRequestOrigin(request);

  const callbackUrl = new URL("/api/auth/oauth/callback", platformOrigin);
  callbackUrl.searchParams.set("store_host", storeHostRaw);
  callbackUrl.searchParams.set("store_origin", storeOrigin);
  callbackUrl.searchParams.set("next", next);

  const supabase = await supabaseSSR();

  const options: any = {
    redirectTo: callbackUrl.toString(),
  };

  if (providerRaw === "google") {
    options.queryParams = {
      access_type: "offline",
      prompt: "consent",
    };
  }

  const result = await supabase.auth.signInWithOAuth({
    provider: providerRaw,
    options,
  });

  if (result.error || !result.data?.url) {
    return redirectWithAuthError({
      origin: storeOrigin,
      next,
      error: result.error?.message || "OAUTH_START_FAILED",
    });
  }

  return NextResponse.redirect(result.data.url);
}