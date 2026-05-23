// FILE: apps/storefront/src/themes/malak/screens-mobile/product/_components/MobileRecommendedProducts.tsx
"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, type MouseEvent } from "react";
import { useRouter } from "next/navigation";

import type { SeoUrlMode } from "@/data/store/settings";
import { buildProductHref } from "@/lib/seo/build-store-href";
import { startMobileNavigation } from "../../../app-navigation/mobile-navigation";

const ProductsSlider = dynamic(
  () => import("../../../screens/home/_components/ProductsSlider"),
  {
    ssr: false,
    loading: () => null,
  },
);

type Props = {
  items: any[];
  mode: SeoUrlMode;
  storeOptions: any;
  title?: string;
  currencies?: any;
  tax?: any;
};

function s(value: any) {
  return String(value ?? "").trim();
}

function safePublicNo(value: any) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function normalizeMode(mode: SeoUrlMode | any): SeoUrlMode {
  const value = s(mode);

  if (value === "short" || value === "named_ar" || value === "named_en") {
    return value;
  }

  return "named_ar";
}

function unwrapProduct(item: any) {
  return item?.product && typeof item.product === "object" ? item.product : item;
}

function getPublicNo(product: any) {
  return safePublicNo(
    product?.public_no ??
      product?.publicNo ??
      product?.seo?.public_no ??
      product?.seo?.publicNo ??
      product?.metadata?.public_no ??
      product?.metadata?.publicNo,
  );
}

function getShortCode(product: any) {
  return (
    s(product?.short_url) ||
    s(product?.shortUrl) ||
    s(product?.seo?.short_url) ||
    s(product?.seo?.shortUrl) ||
    s(product?.metadata?.short_url) ||
    s(product?.metadata?.shortUrl) ||
    null
  );
}

function getSlugNameAr(product: any) {
  return (
    s(product?.slug_name_ar) ||
    s(product?.slugNameAr) ||
    s(product?.seo?.slug_name_ar) ||
    s(product?.seo?.slugNameAr) ||
    s(product?.metadata?.slug_name_ar) ||
    s(product?.metadata?.slugNameAr) ||
    s(product?.name) ||
    s(product?.title)
  );
}

function getSlugNameEn(product: any) {
  return (
    s(product?.slug_name_en) ||
    s(product?.slugNameEn) ||
    s(product?.slug) ||
    s(product?.seo?.slug_name_en) ||
    s(product?.seo?.slugNameEn) ||
    s(product?.seo?.slug) ||
    s(product?.metadata?.slug_name_en) ||
    s(product?.metadata?.slugNameEn) ||
    s(product?.metadata?.slug) ||
    s(product?.name) ||
    s(product?.title)
  );
}

function buildHref(product: any, mode: SeoUrlMode) {
  const existing =
    s(product?.href) ||
    s(product?.url) ||
    s(product?.permalink) ||
    s(product?.link);

  if (existing && existing !== "#") return existing;

  const publicNo = getPublicNo(product);
  const shortCode = getShortCode(product);

  if (!publicNo && !shortCode) return "#";

  return buildProductHref({
    mode,
    slugNameAr: getSlugNameAr(product),
    slugNameEn: getSlugNameEn(product),
    publicNo,
    shortCode,
  });
}

function normalizeProductsForSlider(args: {
  items: any[];
  mode: SeoUrlMode;
  showDashInstead: boolean;
}) {
  return args.items
    .map((item: any, index: number) => {
      const product = unwrapProduct(item);
      if (!product || typeof product !== "object") return null;

      const id =
        s(product?.id) ||
        s(product?.product_id) ||
        s(product?.productId) ||
        s(product?.public_no) ||
        s(product?.publicNo) ||
        `recommended-${index}`;

      const name = s(product?.name) || s(product?.title);
      const title = s(product?.title) || name;

      if (!title && !name) return null;

      return {
        ...product,
        id,
        product_id: s(product?.product_id) || s(product?.productId) || id,
        productId: s(product?.productId) || s(product?.product_id) || id,
        name: name || title,
        title: title || name,
        href: buildHref(product, args.mode),
        showDashInstead: args.showDashInstead,
      };
    })
    .filter(Boolean);
}

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function resolveInternalHref(rawHref: string) {
  const href = s(rawHref);

  if (!href || href === "#") return "";
  if (href.startsWith("mailto:") || href.startsWith("tel:")) return "";

  if (href.startsWith("/")) return href;

  if (typeof window === "undefined") return "";

  try {
    const url = new URL(href, window.location.origin);

    if (url.origin !== window.location.origin) return "";

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "";
  }
}

export default function MobileRecommendedProducts({
  items,
  mode,
  storeOptions,
  title = "منتجات ربما تعجبك",
  currencies,
  tax,
}: Props) {
  const router = useRouter();

  const enabled = storeOptions?.productRecommendations?.enabled ?? true;
  const seoMode = normalizeMode(mode);
  const showDashInstead = storeOptions?.switches?.showDashInstead ?? true;

  const products = useMemo(() => {
    if (!enabled) return [];
    if (!Array.isArray(items) || items.length === 0) return [];

    return normalizeProductsForSlider({
      items,
      mode: seoMode,
      showDashInstead,
    });
  }, [enabled, items, seoMode, showDashInstead]);

  const handleRecommendedClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (event.defaultPrevented) return;
      if (isModifiedClick(event)) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;

      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;

      const href = resolveInternalHref(anchor.getAttribute("href") || "");
      if (!href) return;

      event.preventDefault();

      try {
        router.prefetch(href);
      } catch {
        // ignore
      }

      startMobileNavigation({
        href,
        source: "programmatic",
      });

      router.push(href);
    },
    [router],
  );

  if (!enabled) return null;
  if (!products.length) return null;

  return (
    <section
      className="mk-mrecommended"
      dir="rtl"
      aria-label={title}
      onClickCapture={handleRecommendedClick}
    >
      <ProductsSlider
        title={title}
        viewAllText=""
        viewAllHref="#"
        products={products}
        showHeader
        showEmpty={false}
        currencies={currencies}
        tax={tax}
      />
    </section>
  );
}