// FILE: apps/storefront/src/app/(store)/api/auth/oauth/_lib/oauth-shared.ts

import { NextRequest, NextResponse } from "next/server";

import { controlDb } from "@/data/db/control-db.server";

export type OAuthResolvedStore = {
  host: string;
  storeId: string;
  storeSlug: string;
};

export function s(value: unknown) {
  return String(value ?? "").trim();
}

export function cleanHost(raw: string) {
  return String(raw || "")
    .toLowerCase()
    .trim()
    .replace(/:\d+$/, "");
}

export function getRootDomain() {
  return (
    process.env.ROOT_DOMAIN ||
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ||
    "elyaia.com"
  )
    .toLowerCase()
    .trim();
}

export function getRequestHostWithPort(request: NextRequest) {
  return s(
    request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      request.nextUrl.host,
  ).toLowerCase();
}

export function getRequestHost(request: NextRequest) {
  return cleanHost(getRequestHostWithPort(request));
}

export function getRequestOrigin(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  const host = forwardedHost || request.headers.get("host");
  const proto =
    forwardedProto ||
    (process.env.NODE_ENV === "production" ? "https" : "http");

  if (host) return `${proto}://${host}`;

  return request.nextUrl.origin;
}

export function isPlatformHost(host: string) {
  const clean = cleanHost(host);
  const root = getRootDomain();

  return (
    clean === "localhost" ||
    clean === "127.0.0.1" ||
    clean === root ||
    clean === `www.${root}`
  );
}

export function getPlatformOriginForRequest(request: NextRequest) {
  const hostWithPort = getRequestHostWithPort(request);
  const clean = cleanHost(hostWithPort);
  const root = getRootDomain();

  if (clean === "localhost" || clean === "127.0.0.1") {
    return getRequestOrigin(request);
  }

  if (clean.endsWith(".localhost")) {
    const port = hostWithPort.includes(":")
      ? `:${hostWithPort.split(":").pop()}`
      : "";

    return `${request.nextUrl.protocol}//localhost${port}`;
  }

  return `https://${root}`;
}

export function safeNextPath(value: string | null) {
  const raw = s(value);

  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  if (raw.startsWith("/api/")) return "/";

  return raw;
}

export function safeStoreOrigin(args: {
  storeOriginRaw: string | null;
  storeHostRaw: string;
}) {
  const storeHost = cleanHost(args.storeHostRaw);
  const rawOrigin = s(args.storeOriginRaw);

  if (rawOrigin) {
    try {
      const url = new URL(rawOrigin);
      const originHost = cleanHost(url.host);

      if (originHost !== storeHost) return "";

      const isLocal =
        originHost === "localhost" ||
        originHost === "127.0.0.1" ||
        originHost.endsWith(".localhost");

      if (url.protocol !== "https:" && !(isLocal && url.protocol === "http:")) {
        return "";
      }

      return `${url.protocol}//${url.host}`;
    } catch {
      return "";
    }
  }

  if (!storeHost) return "";

  if (
    storeHost === "localhost" ||
    storeHost === "127.0.0.1" ||
    storeHost.endsWith(".localhost")
  ) {
    return `http://${args.storeHostRaw}`;
  }

  return `https://${storeHost}`;
}

export function redirectWithAuthError(args: {
  origin: string;
  next: string;
  error: string;
}) {
  const url = new URL(args.next || "/", args.origin);
  url.searchParams.set("auth_error", args.error);

  return NextResponse.redirect(url);
}

export function redirectWithAuthSuccess(args: { origin: string; next: string }) {
  const url = new URL(args.next || "/", args.origin);
  url.searchParams.set("auth", "success");

  return NextResponse.redirect(url);
}

function localSubdomainSlug(host: string) {
  if (!host.endsWith(".localhost")) return "";
  if (host === "localhost") return "";

  return host.split(".")[0] || "";
}

function platformSubdomainSlug(host: string) {
  const root = getRootDomain();

  if (!host.endsWith(`.${root}`)) return "";
  if (host === root || host === `www.${root}`) return "";

  return host.split(".")[0] || "";
}

async function fetchStoreBySlug(slug: string) {
  const sb = controlDb();

  const r = await sb
    .from("stores")
    .select("id,slug,status")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();

  if (r.error) {
    throw new Error(r.error.message);
  }

  return r.data ?? null;
}

async function fetchStoreById(storeId: string) {
  const sb = controlDb();

  const r = await sb
    .from("stores")
    .select("id,slug,status")
    .eq("id", storeId)
    .limit(1)
    .maybeSingle();

  if (r.error) {
    throw new Error(r.error.message);
  }

  return r.data ?? null;
}

async function fetchStoreIdByVerifiedDomain(host: string) {
  const sb = controlDb();

  const r = await sb
    .from("store_domains")
    .select("store_id,domain,verified_at,is_primary")
    .eq("domain", host)
    .not("verified_at", "is", null)
    .order("is_primary", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (r.error) {
    throw new Error(r.error.message);
  }

  return r.data?.store_id ? String(r.data.store_id) : "";
}

export async function resolveOAuthStoreFromHost(
  rawHost: string,
): Promise<OAuthResolvedStore | null> {
  const host = cleanHost(rawHost);

  if (!host || isPlatformHost(host)) {
    return null;
  }

  const slug = localSubdomainSlug(host) || platformSubdomainSlug(host);

  if (slug) {
    const store = await fetchStoreBySlug(slug);

    if (!store?.id) return null;

    return {
      host,
      storeId: String(store.id),
      storeSlug: String(store.slug || slug),
    };
  }

  const storeId = await fetchStoreIdByVerifiedDomain(host);

  if (!storeId) return null;

  const store = await fetchStoreById(storeId);

  if (!store?.id) return null;

  return {
    host,
    storeId: String(store.id),
    storeSlug: String(store.slug || ""),
  };
}