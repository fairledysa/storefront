// FILE: apps/storefront/src/lib/seo/urls.ts

import {
  buildCategoryHref as buildStoreCategoryHref,
  buildProductHref as buildStoreProductHref,
} from "@/lib/seo/build-store-href";

export type SeoUrlMode = "short" | "named_ar" | "named_en";

type SeoModeInput =
  | SeoUrlMode
  | {
      mode?: unknown;
    }
  | string
  | null
  | undefined;

function s(value: unknown) {
  return String(value ?? "").trim();
}

function safePublicNo(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function normalizeMode(value: SeoModeInput): SeoUrlMode {
  const mode = s(
    typeof value === "object" && value !== null && "mode" in value
      ? value.mode
      : value,
  );

  if (mode === "short" || mode === "named_ar" || mode === "named_en") {
    return mode;
  }

  return "named_ar";
}

function fallbackProductHref(idFallback?: string | null) {
  const id = s(idFallback);
  return id ? `/p/${encodeURIComponent(id)}` : "/";
}

function fallbackCategoryHref(slugFallback?: string | null) {
  const slug = s(slugFallback);
  return slug ? `/c/${encodeURIComponent(slug)}` : "/";
}

/**
 * Compatibility wrapper.
 *
 * المصدر الرسمي لبناء روابط المنتجات:
 * apps/storefront/src/lib/seo/build-store-href.ts
 *
 * - short:    /CODE
 * - named_*:  /slug/p{public_no}
 */
export function productUrl(args: {
  mode: SeoModeInput;
  name: string;
  short_url?: string | null;
  public_no?: number | null;
  id_fallback?: string;
}) {
  const mode = normalizeMode(args.mode);
  const name = s(args.name) || "product";
  const shortCode = s(args.short_url);
  const publicNo = safePublicNo(args.public_no);

  if (!shortCode && !publicNo) {
    return fallbackProductHref(args.id_fallback);
  }

  return buildStoreProductHref({
    mode,
    slugNameAr: name,
    slugNameEn: name,
    publicNo,
    shortCode: shortCode || null,
  });
}

/**
 * Compatibility wrapper.
 *
 * المصدر الرسمي لبناء روابط الأقسام:
 * apps/storefront/src/lib/seo/build-store-href.ts
 *
 * - short:    /category/CODE
 * - named_*:  /slug/c{public_no}
 */
export function categoryUrl(args: {
  mode: SeoModeInput;
  name: string;
  short_url?: string | null;
  public_no?: number | null;
  slug_fallback?: string;
}) {
  const mode = normalizeMode(args.mode);
  const name = s(args.name) || s(args.slug_fallback) || "category";
  const shortCode = s(args.short_url);
  const publicNo = safePublicNo(args.public_no);

  if (!shortCode && !publicNo) {
    return fallbackCategoryHref(args.slug_fallback);
  }

  return buildStoreCategoryHref({
    mode,
    slugNameAr: name,
    slugNameEn: name,
    publicNo,
    shortCode: shortCode || null,
  });
}