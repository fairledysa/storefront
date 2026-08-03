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

function safeRecord(value: unknown): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, any>;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, any>;
      }
    } catch {}
  }

  return {};
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }

  return "";
}

function readOneRecord(value: unknown) {
  const row = Array.isArray(value) ? value[0] : value;
  return safeRecord(row);
}

function readRecordShortCode(...values: unknown[]) {
  for (const value of values) {
    const code = cleanShortCode(value).split(/[?#]/, 1)[0];

    // الرابط المختصر للمنتج مقطع واحد فقط. لا نحول رابطًا قديمًا كاملًا
    // إلى short code لأن ذلك ينتج مسارًا مشفرًا وغير قابل للفتح.
    if (code && !code.includes("/")) return code;
  }

  return "";
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

/**
 * يبني رابط المنتج من سجل قاعدة البيانات حسب نمط المتجر الحالي.
 * لا يثق في product.href لأنه قد يكون محفوظًا قبل تغيير seo.url_mode.
 */
export function buildProductHrefFromRecord(args: {
  mode: SeoUrlMode | any;
  product: unknown;
  fallbackHref?: string | null;
}) {
  const product = safeRecord(args.product);
  const metadata = safeRecord(product.metadata);
  const seo = safeRecord(product.seo);
  const productMetadata = readOneRecord(product.product_metadata);

  const publicNo = positivePublicNo(
    product.public_no ??
      product.publicNo ??
      product.public_number ??
      product.publicNumber ??
      metadata.public_no ??
      metadata.publicNo,
  );

  const shortCode = readRecordShortCode(
    product.short_url,
    product.shortUrl,
    product.short_code,
    product.shortCode,
    metadata.short_url,
    metadata.shortUrl,
    metadata.short_code,
    metadata.shortCode,
    seo.short_url,
    seo.shortUrl,
    productMetadata.url,
  );

  if (!publicNo && !shortCode) {
    return firstText(args.fallbackHref) || "#";
  }

  const name = firstText(product.name, product.title, productMetadata.title);
  const slugAr = firstText(
    product.seo_slug_ar,
    product.seo_slug,
    metadata.seo_slug_ar,
    metadata.seo_slug,
    seo.slug_ar,
    seo.slug,
    name,
    "product",
  );
  const slugEn = firstText(
    product.seo_slug_en,
    product.slug,
    metadata.seo_slug_en,
    metadata.slug,
    seo.slug_en,
    seo.slug,
    name,
    "product",
  );

  return buildProductHref({
    mode: args.mode,
    slugNameAr: slugAr,
    slugNameEn: slugEn,
    publicNo,
    shortCode: shortCode || null,
  });
}
