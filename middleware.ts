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
  // darb.localhost
  return host.endsWith(".localhost") && host !== "localhost";
}

function getRootDomain() {
  // الأفضل تخليه من env في الإنتاج
  // مثال: ROOT_DOMAIN=madrar-ye.com
  return (
    process.env.ROOT_DOMAIN ||
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ||
    "madrar-ye.com"
  )
    .toLowerCase()
    .trim();
}

function isRootOrWww(host: string, root: string) {
  return host === root || host === `www.${root}`;
}

function isSubdomainOf(host: string, root: string) {
  // store1.madrar-ye.com
  return host.endsWith(`.${root}`) && host !== root && host !== `www.${root}`;
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = getHost(req);
  const ROOT_DOMAIN = getRootDomain();

  // استثناء ملفات ثابتة و API (احتياط)
  if (
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/favicon") ||
    url.pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  /* ------------------------------ Local dev ------------------------------ */

  // ✅ 1) localhost => Platform pages
  if (isLocalRoot(host)) {
    if (!url.pathname.startsWith("/platform")) {
      const next = url.clone();
      if (url.pathname === "/") next.pathname = "/platform";
      else next.pathname = `/platform${url.pathname}`;
      return NextResponse.rewrite(next);
    }
    return NextResponse.next();
  }

  // ✅ 2) darb.localhost => Store (لا نسوي rewrite)
  if (isLocalSubdomain(host)) {
    return NextResponse.next();
  }

  /* ------------------------------ Production ----------------------------- */

  // ✅ 3) madrar-ye.com + www => Platform (Landing/Services)
  if (isRootOrWww(host, ROOT_DOMAIN)) {
    if (!url.pathname.startsWith("/platform")) {
      const next = url.clone();
      if (url.pathname === "/") next.pathname = "/platform";
      else next.pathname = `/platform${url.pathname}`;
      return NextResponse.rewrite(next);
    }
    return NextResponse.next();
  }

  // ✅ 4) *.madrar-ye.com => Store (لا نسوي rewrite)
  if (isSubdomainOf(host, ROOT_DOMAIN)) {
    return NextResponse.next();
  }

  // ✅ 5) أي دومين آخر (Custom Domain) => Store (لا نسوي rewrite)
  return NextResponse.next();
}

export const config = {
  matcher: [
    // شغّل الميدلوير فقط على صفحات الـ HTML (استثناء الأصول الثابتة الشائعة)
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|xml|woff|woff2|ttf|eot)).*)",
  ],
};
