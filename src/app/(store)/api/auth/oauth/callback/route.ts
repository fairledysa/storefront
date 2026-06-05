// FILE: apps/storefront/src/app/(store)/api/auth/oauth/start/route.ts

import { NextRequest, NextResponse } from "next/server";

import { supabaseSSR } from "@/data/store/supabase.ssr";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OAuthProvider = "google" | "facebook";

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

function normalizeProvider(value: string | null): OAuthProvider | null {
  const raw = s(value).toLowerCase();

  if (raw === "google") return "google";
  if (raw === "facebook") return "facebook";

  return null;
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

function redirectBackWithError(args: {
  request: NextRequest;
  next: string;
  error: string;
}) {
  const origin = getRequestOrigin(args.request);
  const url = new URL(args.next, origin);

  url.searchParams.set("auth_error", args.error);

  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const provider = normalizeProvider(request.nextUrl.searchParams.get("provider"));
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));

  if (!provider) {
    return redirectBackWithError({
      request,
      next,
      error: "OAUTH_PROVIDER_INVALID",
    });
  }

  const ctx = await resolveStoreContext();

  if (!ctx?.store?.id) {
    return redirectBackWithError({
      request,
      next,
      error: "STORE_NOT_FOUND",
    });
  }

  const origin = getRequestOrigin(request);

  const callbackUrl = new URL("/api/auth/oauth/callback", origin);
  callbackUrl.searchParams.set("next", next);

  try {
    const supabase = await supabaseSSR();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl.toString(),
        queryParams:
          provider === "google"
            ? {
                access_type: "offline",
                prompt: "consent",
              }
            : undefined,
      },
    });

    if (error || !data?.url) {
      return redirectBackWithError({
        request,
        next,
        error: error?.message || "OAUTH_START_FAILED",
      });
    }

    return NextResponse.redirect(data.url);
  } catch (error: any) {
    return redirectBackWithError({
      request,
      next,
      error: error?.message || "OAUTH_START_FAILED",
    });
  }
}