// FILE: apps/storefront/src/lib/seo/request.ts
import { headers } from "next/headers";

export async function getRequestOrigin() {
  // ✅ لو موجود Origin كامل خذه مباشرة (أفضل للـ deploy)
  const full = process.env.NEXT_PUBLIC_APP_ORIGIN;
  if (full) return full.replace(/\/+$/, "");

  const h = await headers();

  const host =
    h.get("x-forwarded-host") ??
    h.get("host") ??
    process.env.NEXT_PUBLIC_DEV_HOST; // fallback للـ local فقط

  const proto =
    h.get("x-forwarded-proto") ??
    process.env.NEXT_PUBLIC_DEV_PROTOCOL ??
    "http";

  if (!host) {
    throw new Error(
      "Cannot determine request host. Ensure Host/x-forwarded-host header exists, or set NEXT_PUBLIC_DEV_HOST for local dev.",
    );
  }

  return `${proto}://${host}`;
}

export function buildPathFromSlug(slug?: string[]) {
  if (!slug || slug.length === 0) return "/";
  return (
    "/" + slug.map((s) => encodeURIComponent(decodeURIComponent(s))).join("/")
  );
}
