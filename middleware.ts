// FILE: apps/storefront/src/middleware.ts

import { NextRequest, NextResponse } from "next/server";

function getHost(req: NextRequest) {
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";

  return host.split(":")[0].toLowerCase();
}

function isLocalRoot(host: string) {
  return host === "localhost" || host === "127.0.0.1";
}

function isLocalSubdomain(host: string) {
  return host.endsWith(".localhost") && host !== "localhost";
}

function getRootDomain() {
  return (
    process.env.ROOT_DOMAIN ||
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ||
    "elyaia.com"
  )
    .toLowerCase()
    .trim();
}

function isRootOrWww(host: string, root: string) {
  return host === root || host === `www.${root}`;
}

function isSubdomainOf(host: string, root: string) {
  return host.endsWith(`.${root}`) && host !== root && host !== `www.${root}`;
}

function isPlatformStandalonePath(pathname: string) {
  return (
    pathname === "/terms" ||
    pathname.startsWith("/terms/") ||
    pathname === "/privacy" ||
    pathname.startsWith("/privacy/")
  );
}

function rewriteToPlatform(req: NextRequest) {
  const url = req.nextUrl;

  if (isPlatformStandalonePath(url.pathname)) {
    return NextResponse.next();
  }

  if (url.pathname.startsWith("/platform")) {
    return NextResponse.next();
  }

  const next = url.clone();

  if (url.pathname === "/") {
    next.pathname = "/platform";
  } else {
    next.pathname = `/platform${url.pathname}`;
  }

  return NextResponse.rewrite(next);
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = getHost(req);
  const ROOT_DOMAIN = getRootDomain();

  if (
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/favicon") ||
    url.pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  /* ------------------------------ Local dev ------------------------------ */

  if (isLocalRoot(host)) {
    return rewriteToPlatform(req);
  }

  if (isLocalSubdomain(host)) {
    return NextResponse.next();
  }

  /* ------------------------------ Production ----------------------------- */

  if (isRootOrWww(host, ROOT_DOMAIN)) {
    return rewriteToPlatform(req);
  }

  if (isSubdomainOf(host, ROOT_DOMAIN)) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|xml|woff|woff2|ttf|eot)).*)",
  ],
};