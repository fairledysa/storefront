// FILE: apps/storefront/src/lib/seo/build-store-href.ts
import { toBase62 } from "@/lib/seo/base62";
import type { SeoUrlMode } from "@/data/store/settings";

function normalizeMode(value: any): SeoUrlMode {
  const mode = String(value?.mode ?? value ?? "").trim();

  if (mode === "short" || mode === "named_ar" || mode === "named_en") {
    return mode;
  }

  return "named_ar";
}

function positivePublicNo(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function cleanShortCode(value: unknown) {
  return String(value ?? "").trim().replace(/^\/+/, "").replace(/\/+$/, "");
}

function cleanSlugSegment(value: unknown, fallback: string) {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[ـ]+/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/[\\/?#%]+/g, "-")
    .replace(/[^\u0600-\u06FFa-z0-9-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return raw || fallback;
}

/** CATEGORY */
export function buildCategoryHref(args: {
  mode: SeoUrlMode | any;
  slugNameAr?: string | null;
  slugNameEn?: string | null;
  publicNo: number;
  shortCode?: string | null;
}) {
  const mode = normalizeMode(args.mode);
  const publicNo = positivePublicNo(args.publicNo);
  const shortCode = cleanShortCode(args.shortCode);

  if (mode === "short") {
    const code = shortCode || (publicNo ? toBase62(publicNo) : "");

    return code
      ? `/category/${encodeURIComponent(code)}`
      : `/categories/${encodeURIComponent(String(publicNo || ""))}`;
  }

  if (!publicNo) {
    return "/categories";
  }

  const rawSlug = mode === "named_en" ? args.slugNameEn : args.slugNameAr;
  const slug = cleanSlugSegment(rawSlug, "category");

  return `/${encodeURIComponent(slug)}/c${encodeURIComponent(
    String(publicNo),
  )}`;
}

/** PRODUCT */
export function buildProductHref(args: {
  mode: SeoUrlMode | any;
  slugNameAr?: string | null;
  slugNameEn?: string | null;
  publicNo: number;
  shortCode?: string | null;
}) {
  const mode = normalizeMode(args.mode);
  const publicNo = positivePublicNo(args.publicNo);
  const shortCode = cleanShortCode(args.shortCode);

  if (mode === "short") {
    const code = shortCode || (publicNo ? toBase62(publicNo) : "");

    return code
      ? `/${encodeURIComponent(code)}`
      : `/product/${encodeURIComponent(String(publicNo || ""))}`;
  }

  if (!publicNo) {
    return "/product";
  }

  const rawSlug = mode === "named_en" ? args.slugNameEn : args.slugNameAr;
  const slug = cleanSlugSegment(rawSlug, "product");

  return `/${encodeURIComponent(slug)}/p${encodeURIComponent(
    String(publicNo),
  )}`;
}