// FILE: apps/storefront/src/themes/basit/screens/categories/CategoriesScreen.tsx
"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { buildProductHref } from "@/lib/seo/build-store-href";
import type { SeoUrlMode } from "@/data/store/settings";
import { parseStoreOptions } from "@/lib/store-options";
import {
  toProductCardVM,
  type ProductCardVM,
} from "@/data/viewmodels/product.vm";
import ProductCard from "@/themes/basit/components/product-card/ProductCard";

import { useCategoryInfiniteProducts } from "../category/_components/useCategoryInfiniteProducts";

type Props = {
  data?: any;
  mode?: SeoUrlMode;
  seoMode?: SeoUrlMode;
};

type SortKey = "" | "latest" | "popular" | "price_asc" | "price_desc";

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "", label: "التوصية" },
  { value: "latest", label: "الأحدث" },
  { value: "popular", label: "الأكثر طلبًا" },
  { value: "price_asc", label: "السعر ↑" },
  { value: "price_desc", label: "السعر ↓" },
];

function s(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeMode(value: unknown): SeoUrlMode {
  const mode = s(value);

  if (mode === "short" || mode === "named_ar" || mode === "named_en") {
    return mode;
  }

  return "named_ar";
}

function normalizeSort(value: unknown): SortKey {
  const text = s(value).toLowerCase();

  if (text === "latest" || text === "newest" || text === "new") {
    return "latest";
  }

  if (text === "popular" || text === "best_selling" || text === "best-selling") {
    return "popular";
  }

  if (text === "price_asc" || text === "price-asc" || text === "low_price") {
    return "price_asc";
  }

  if (text === "price_desc" || text === "price-desc" || text === "high_price") {
    return "price_desc";
  }

  return "";
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
    data?.tax ||
    data?.store?.tax ||
    data?.theme?.tax ||
    data?.settings?.tax ||
    data?.tax_settings ||
    data?.taxSettings ||
    null
  );
}

function buildProductCard(args: {
  product: any;
  mode: SeoUrlMode;
  showDashInstead: boolean;
  currencies?: any;
  tax?: any;
}): ProductCardVM {
  const product = args.product ?? {};
  const href =
    s(product?.href) ||
    s(product?.url) ||
    buildProductHref({
      mode: args.mode,
      slugNameAr: product?.name ?? product?.title ?? "",
      slugNameEn: product?.slug ?? product?.name ?? product?.title ?? "",
      publicNo: Number(product?.public_no ?? product?.publicNo ?? 0),
      shortCode: product?.short_url ?? product?.shortUrl ?? null,
    });

  return toProductCardVM({
    storeSlug: "",
    currencies: args.currencies,
    tax: args.tax,
    product: {
      ...product,
      href,
      showDashInstead: args.showDashInstead,
    },
  });
}

function buildUrl(pathname: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default function CategoriesScreen({ data, mode, seoMode }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentMode = normalizeMode(mode ?? seoMode);
  const searchParamsText = searchParams.toString();
  const activeSort = normalizeSort(searchParams.get("sort"));
  const rawProducts = Array.isArray(data?.products) ? data.products : [];
  const currencies = useMemo(() => resolveCurrenciesFromData(data), [data]);
  const tax = useMemo(() => resolveTaxFromData(data), [data]);
  const storeOptions = useMemo(
    () => parseStoreOptions(data?.options ?? {}),
    [data?.options],
  );
  const showDashInstead = storeOptions?.switches?.showDashInstead ?? true;

  const paginationKey = [
    "__all__",
    searchParamsText,
    rawProducts.map((product: any) => s(product?.id)).filter(Boolean).join(","),
    String(data?.pagination?.nextOffset ?? ""),
    data?.pagination?.hasNextPage ? "1" : "0",
  ].join("|");

  const {
    products: pagedProducts,
    hasNextPage,
    isLoadingMore,
    loadError,
    sentinelRef,
  } = useCategoryInfiniteProducts({
    categoryId: "__all__",
    initialItems: rawProducts,
    pageInfo: data?.pagination,
    searchParamsText,
    requestKey: paginationKey,
    enabled: true,
  });

  const products = useMemo(
    () =>
      pagedProducts.map((product: any) =>
        buildProductCard({
          product,
          mode: currentMode,
          showDashInstead,
          currencies,
          tax,
        }),
      ),
    [pagedProducts, currentMode, showDashInstead, currencies, tax],
  );

  const setSort = (value: SortKey) => {
    const params = new URLSearchParams(searchParamsText);

    if (value) params.set("sort", value);
    else params.delete("sort");

    startTransition(() => {
      router.replace(buildUrl(pathname, params), { scroll: false });
    });
  };

  const infiniteTail =
    hasNextPage || isLoadingMore || loadError ? (
      <div
        ref={hasNextPage ? sentinelRef : undefined}
        className="mk-dcategories__infiniteTail"
        aria-live="polite"
      >
        {isLoadingMore ? (
          <span>جاري تحميل المزيد…</span>
        ) : loadError ? (
          <span className="mk-dcategories__loadError">{loadError}</span>
        ) : (
          <span aria-hidden="true" />
        )}
      </div>
    ) : null;

  return (
    <div dir="rtl" className="mk-dcategories">
      <div className="mk-dcategories__container">
        <div className="mk-dcategories__head">
          <div>
            <h1 className="mk-dcategories__title">كل المنتجات</h1>
            <p className="mk-dcategories__text">
              عرض {products.length} منتج
            </p>
          </div>

          <div
            className="mk-dcategories__sort"
            role="group"
            aria-label="ترتيب المنتجات"
          >
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value || "recommended"}
                type="button"
                className={activeSort === option.value ? "is-active" : ""}
                onClick={() => setSort(option.value)}
                disabled={isPending}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {isPending ? (
          <div className="mk-dcategories__updating">جاري تحديث النتائج…</div>
        ) : null}

        {products.length ? (
          <div className="mk-dcategories__grid">
            {products.map((product, index) => (
              <ProductCard
                key={`${product.id || product.publicNo || index}-${product.publicNo ?? index}`}
                item={product as any}
              />
            ))}
          </div>
        ) : (
          <div className="mk-dcategories__empty">
            لا توجد منتجات متاحة للعرض الآن.
          </div>
        )}

        {infiniteTail}
      </div>
    </div>
  );
}
