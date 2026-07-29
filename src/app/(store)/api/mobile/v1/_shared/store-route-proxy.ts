import { controlDb } from "@/data/db/control-db.server";
import { resolveActiveMobileStoreApp } from "@/data/mobile/store-app.server";

import { withMobileCors } from "./cors";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function bearerToken(request: Request) {
  const authorization = clean(request.headers.get("authorization"));
  return authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";
}

async function resolveStoreHost(publicAppId: string) {
  const app = await resolveActiveMobileStoreApp(publicAppId);
  const db: any = controlDb();

  const domainResult = await db
    .from("store_domains")
    .select("domain,is_primary,verified_at")
    .eq("store_id", app.storeId)
    .not("verified_at", "is", null)
    .order("is_primary", { ascending: false })
    .limit(1)
    .maybeSingle();

  const verifiedDomain = clean(domainResult.data?.domain).toLowerCase();
  if (verifiedDomain) return verifiedDomain;

  const storeResult = await db
    .from("stores")
    .select("slug")
    .eq("id", app.storeId)
    .limit(1)
    .maybeSingle();

  const slug = clean(storeResult.data?.slug).toLowerCase();
  if (!slug) throw new Error("STORE_NOT_FOUND");

  return `${slug}.elyaia.com`;
}

function appendCookie(source: string, name: string, value: string) {
  if (!value) return source;
  const entry = `${name}=${encodeURIComponent(value)}`;
  return source ? `${source}; ${entry}` : entry;
}

export async function proxyStoreRoute(
  request: Request,
  targetPath: string,
) {
  const publicAppId = clean(request.headers.get("x-store-app-id"));
  if (!publicAppId) {
    return withMobileCors(
      request,
      Response.json(
        { ok: false, error: "STORE_APP_ID_REQUIRED" },
        { status: 400 },
      ),
    );
  }

  try {
    const host = await resolveStoreHost(publicAppId);
    const targetUrl = new URL(targetPath, request.url);
    const headers = new Headers(request.headers);

    headers.delete("content-length");
    headers.delete("connection");
    headers.delete("host");
    headers.set("x-forwarded-host", host);
    headers.set("x-forwarded-proto", targetUrl.protocol.replace(":", ""));
    headers.set("cache-control", "no-store");

    // Mobile API identity comes only from the verified bearer/cart headers.
    // Never forward a caller-supplied Cookie header into the internal store route.
    let cookie = "";
    cookie = appendCookie(cookie, "elyaia_session", bearerToken(request));
    cookie = appendCookie(
      cookie,
      "darb_cart_session",
      clean(request.headers.get("x-cart-session-id")),
    );

    const currencyCode = clean(
      request.headers.get("x-currency-code"),
    ).toUpperCase();
    if (/^[A-Z]{3}$/.test(currencyCode)) {
      cookie = appendCookie(
        cookie,
        "mk_selected_currency",
        currencyCode,
      );
      cookie = appendCookie(cookie, "malak_currency", currencyCode);
    }

    if (cookie) headers.set("cookie", cookie);

    const method = request.method.toUpperCase();
    const body = ["GET", "HEAD"].includes(method)
      ? undefined
      : await request.arrayBuffer();

    const upstream = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
    });

    return withMobileCors(request, upstream);
  } catch (error: any) {
    console.error("MOBILE_PROXY_FAILED", {
      message: clean(error?.message) || "MOBILE_PROXY_FAILED",
      targetPath,
    });
    return withMobileCors(
      request,
      Response.json(
        {
          ok: false,
          error: "MOBILE_PROXY_FAILED",
        },
        { status: 500 },
      ),
    );
  }
}
