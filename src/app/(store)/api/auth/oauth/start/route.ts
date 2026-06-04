// FILE: apps/storefront/src/app/(store)/api/auth/oauth/start/route.ts

import { NextRequest, NextResponse } from "next/server";

import { supabaseSSR } from "@/data/store/supabase.ssr";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OAuthProvider = "google" | "facebook";

function isAllowedProvider(value: string): value is OAuthProvider {
  return value === "google" || value === "facebook";
}

function safeNextPath(value: string | null) {
  const raw = String(value || "").trim();

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

export async function GET(request: NextRequest) {
  const ctx = await resolveStoreContext();

  if (!ctx?.store?.id) {
    return NextResponse.json(
      { error: "STORE_NOT_FOUND" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

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
  const origin = getRequestOrigin(request);

  const callbackUrl = new URL("/api/auth/oauth/callback", origin);
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
    const failUrl = new URL(next, origin);
    failUrl.searchParams.set(
      "auth_error",
      result.error?.message || "OAUTH_START_FAILED",
    );

    return NextResponse.redirect(failUrl);
  }

  return NextResponse.redirect(result.data.url);
}