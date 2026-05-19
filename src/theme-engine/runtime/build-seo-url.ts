// FILE: apps/storefront/src/theme-engine/runtime/build-seo-url.ts
import type { SeoUrlMode } from "@/data/store/settings";
import {
  buildCategoryHref,
  buildProductHref,
} from "@/lib/seo/build-store-href";

function s(value: unknown) {
  return String(value ?? "").trim();
}

function toPositiveNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function slugifyAr(value: string) {
  return s(value)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\u0600-\u06FFa-z0-9\-]+/g, "")
    .replace(/\-+/g, "-")
    .replace(/^\-|\-$/g, "");
}

function fallbackNamedHref(args: {
  kind: "category" | "product";
  mode: SeoUrlMode;
  name_ar?: string | null;
  name_en?: string | null;
  code: string;
}) {
  const name =
    args.mode === "named_en"
      ? s(args.name_en) || s(args.name_ar)
      : s(args.name_ar) || s(args.name_en);

  const slug = slugifyAr(name) || args.kind;
  const prefix = args.kind === "category" ? "c" : "p";

  return `/${encodeURIComponent(slug)}/${prefix}${encodeURIComponent(args.code)}`;
}

export function categoryUrl(args: {
  mode: SeoUrlMode;
  name_ar?: string | null;
  name_en?: string | null;
  short_url: string;
}) {
  const code = s(args.short_url);
  const publicNo = toPositiveNumber(code);

  if (args.mode === "short") {
    return buildCategoryHref({
      mode: args.mode,
      slugNameAr: args.name_ar,
      slugNameEn: args.name_en,
      publicNo,
      shortCode: code,
    });
  }

  if (!publicNo && code) {
    return fallbackNamedHref({
      kind: "category",
      mode: args.mode,
      name_ar: args.name_ar,
      name_en: args.name_en,
      code,
    });
  }

  return buildCategoryHref({
    mode: args.mode,
    slugNameAr: args.name_ar,
    slugNameEn: args.name_en,
    publicNo,
    shortCode: code,
  });
}

export function productUrl(args: {
  mode: SeoUrlMode;
  name_ar?: string | null;
  name_en?: string | null;
  short_url: string;
}) {
  const code = s(args.short_url);
  const publicNo = toPositiveNumber(code);

  if (args.mode === "short") {
    return buildProductHref({
      mode: args.mode,
      slugNameAr: args.name_ar,
      slugNameEn: args.name_en,
      publicNo,
      shortCode: code,
    });
  }

  if (!publicNo && code) {
    return fallbackNamedHref({
      kind: "product",
      mode: args.mode,
      name_ar: args.name_ar,
      name_en: args.name_en,
      code,
    });
  }

  return buildProductHref({
    mode: args.mode,
    slugNameAr: args.name_ar,
    slugNameEn: args.name_en,
    publicNo,
    shortCode: code,
  });
}