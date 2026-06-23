// FILE: apps/storefront/src/themes/malak/screens-mobile/category/_components/MobileProductsGrid.tsx
"use client";

import { useMemo } from "react";
import { buildProductHref } from "@/lib/seo/build-store-href";
import type { SeoUrlMode } from "@/data/store/settings";
import {
  toProductCardVM,
  type ProductCardVM,
} from "@/data/viewmodels/product.vm";

import MobileCategoryProductCard from "./MobileCategoryProductCard";
import { useCategoryInfiniteProducts } from "@/themes/malak/screens/category/_components/useCategoryInfiniteProducts";

type Props = {
  products: any[];
  mode: SeoUrlMode;
  data?: any;
  currencies?: any;
  tax?: any;
  categoryId?: string;
  searchParamsText?: string;
  pageInfo?: {
    hasNextPage?: boolean;
    nextOffset?: number | null;
    pageSize?: number;
  } | null;
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

function getExistingHref(product: any) {
  return (
    s(product?.href) ||
    s(product?.url) ||
    s(product?.permalink) ||
    s(product?.link) ||
    ""
  );
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
  const existing = getExistingHref(product);
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

function resolveCurrenciesFromData(data: any) {
  return (
    data?.bootstrap?.currencies ||
    data?.currencies ||
    data?.store?.currencies ||
    data?.theme?.currencies ||
    data?.settings?.currencies ||
    null
  );
}

function resolveTaxFromData(data: any) {
  return (
    data?.bootstrap?.tax ||
    data?.theme?.bootstrap?.tax ||
    data?.themeData?.bootstrap?.tax ||
    data?.theme_data?.bootstrap?.tax ||
    data?.storefront?.bootstrap?.tax ||
    data?.tax ||
    data?.store?.tax ||
    data?.theme?.tax ||
    data?.settings?.tax ||
    data?.themeOptions?.tax ||
    data?.theme_options?.tax ||
    data?.tax_settings ||
    data?.taxSettings ||
    null
  );
}

function normalizeProductCard(args: {
  product: any;
  mode: SeoUrlMode;
  currencies?: any;
  tax?: any;
}): ProductCardVM | null {
  const product = args.product;
  if (!product || typeof product !== "object") return null;

  const href = buildHref(product, args.mode);

  const vm = toProductCardVM({
    storeSlug: "",
    currencies: args.currencies,
    tax: args.tax,
    product: {
      ...product,
      href,
      showDashInstead: true,
    },
  } as any);

  if (!vm?.id && !vm?.title) return null;

  return vm;
}

function isCartClickTarget(target: EventTarget | null) {
  const el = target instanceof Element ? target : null;
  if (!el) return false;

  return Boolean(
    el.closest(
      ".mkpc-cart-inline, .mkpc-action--cart, [data-mk-cart-product-id]",
    ),
  );
}

function dispatchAddToCart(product: ProductCardVM) {
  const raw: any = product.raw ?? {};
  const item: any = product;

  window.dispatchEvent(
    new CustomEvent("product:add-to-cart", {
      detail: {
        ...raw,
        ...item,

        id: item.id,
        product_id: raw.product_id || raw.productId || raw.id || item.id,
        productId: raw.productId || raw.product_id || raw.id || item.id,

        title: item.title,
        name: item.title,

        imageUrl: item.imageUrl,
        image_url: item.imageUrl,

        price: item.price,
        basePrice: item.basePrice,

        currency: item.currency,
        currency_code: item.currency_code,
        currencyCode: item.currencyCode,

        currency_symbol: item.currency_symbol,
        currencySymbol: item.currencySymbol,

        tax: item.tax,

        qty: 1,
        quickView: false,
      },
    }),
  );
}

export default function MobileProductsGrid({
  products,
  mode,
  data,
  currencies,
  tax,
  categoryId,
  searchParamsText,
  pageInfo,
}: Props) {
  const seoMode = normalizeMode(mode);

  const resolvedCurrencies = useMemo(() => {
    return currencies || resolveCurrenciesFromData(data);
  }, [currencies, data]);

  const resolvedTax = useMemo(() => {
    return tax || resolveTaxFromData(data);
  }, [tax, data]);

  const paginationKey = [
    s(categoryId),
    s(searchParamsText),
    Array.isArray(products)
      ? products.map((product) => s(product?.id)).filter(Boolean).join(",")
      : "",
    String(pageInfo?.nextOffset ?? ""),
    pageInfo?.hasNextPage ? "1" : "0",
  ].join("|");

  const {
    products: pagedProducts,
    hasNextPage,
    isLoadingMore,
    loadError,
    sentinelRef,
  } = useCategoryInfiniteProducts({
    categoryId: s(categoryId),
    initialItems: Array.isArray(products) ? products : [],
    pageInfo,
    searchParamsText: s(searchParamsText),
    requestKey: paginationKey,
    enabled: Boolean(s(categoryId)),
  });

  const normalizedProducts = useMemo<ProductCardVM[]>(() => {
    return pagedProducts
      .map((product) =>
        normalizeProductCard({
          product,
          mode: seoMode,
          currencies: resolvedCurrencies,
          tax: resolvedTax,
        }),
      )
      .filter(Boolean) as ProductCardVM[];
  }, [pagedProducts, seoMode, resolvedCurrencies, resolvedTax]);

  const paginationTail =
    hasNextPage || isLoadingMore || loadError ? (
      <div
        ref={hasNextPage ? sentinelRef : undefined}
        className="mk-mobile-category-products__sentinel"
        aria-live="polite"
      >
        {isLoadingMore ? (
          <span className="mk-mobile-category-products__loading">
            جاري تحميل المزيد…
          </span>
        ) : loadError ? (
          <span className="mk-mobile-category-products__loadError">
            {loadError}
          </span>
        ) : (
          <span className="mk-mobile-category-products__loading" aria-hidden="true" />
        )}
      </div>
    ) : null;

  if (!normalizedProducts.length) {
    return (
      <div className="mk-mobile-category-products">
        <div className="mk-mobile-category-products-empty">
          لا توجد منتجات
        </div>
        {paginationTail}
      </div>
    );
  }

  return (
    <div className="mk-mobile-category-products">
      {normalizedProducts.map((product, index) => {
        const productId = s(product.id);

        return (
          <div
            key={`${productId || "product"}-${index}`}
            className="mk-mobile-category-products__item"
            data-mk-product-card-id={productId}
            onClickCapture={(event) => {
              if (!isCartClickTarget(event.target)) return;

              event.preventDefault();
              event.stopPropagation();
              dispatchAddToCart(product);
            }}
          >
            <MobileCategoryProductCard item={product} />
          </div>
        );
      })}

      {paginationTail}
    </div>
  );
}
