// FILE: apps/storefront/src/themes/malak/screens-mobile/search/SearchMobileScreen.tsx
"use client";

import Link from "next/link";
import { useMemo } from "react";

import { buildProductHref } from "@/lib/seo/build-store-href";
import type { SeoUrlMode } from "@/data/store/settings";
import { parseStoreOptions } from "@/lib/store-options";
import {
  toProductCardVM,
  type ProductCardVM,
} from "@/data/viewmodels/product.vm";
import ProductCard from "@/themes/malak/components/product-card/ProductCard";
import Icon from "@/components/icon/Icon";

type Props = {
  data?: any;
  mode?: SeoUrlMode;
  seoMode?: SeoUrlMode;
};

type SortKey = "newest" | "price_asc" | "price_desc" | "popular";

type SearchProductCardVM = ProductCardVM;

function s(value: any) {
  return String(value ?? "").trim();
}

function safeNumber(value: any): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function firstDefined(...values: any[]) {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }

  return undefined;
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

function normalizeMode(mode: SeoUrlMode | any): SeoUrlMode {
  const value = s(mode);

  if (value === "short" || value === "named_ar" || value === "named_en") {
    return value;
  }

  return "named_ar";
}

function normalizeSort(value: any): SortKey {
  const sort = s(value);

  if (sort === "price_asc") return "price_asc";
  if (sort === "price_desc") return "price_desc";
  if (sort === "popular") return "popular";

  return "newest";
}

function safePublicNo(value: any) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function resultLabel(count: number) {
  if (count === 1) return "نتيجة واحدة";
  if (count === 2) return "نتيجتان";
  if (count >= 3 && count <= 10) return `${count} نتائج`;
  return `${count} نتيجة`;
}

function buildSortHref(query: string, sort: SortKey) {
  const params = new URLSearchParams();

  if (query) params.set("q", query);
  if (sort !== "newest") params.set("sort", sort);

  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}

function getProductHref(product: any, mode: SeoUrlMode) {
  const existing =
    s(product?.href) ||
    s(product?.url) ||
    s(product?.permalink) ||
    s(product?.link);

  if (existing && existing !== "#") return existing;

  return buildProductHref({
    mode,
    slugNameAr:
      s(product?.slug_name_ar) ||
      s(product?.slugNameAr) ||
      s(product?.name) ||
      s(product?.title),
    slugNameEn:
      s(product?.slug_name_en) ||
      s(product?.slugNameEn) ||
      s(product?.slug) ||
      s(product?.name) ||
      s(product?.title),
    publicNo: safePublicNo(product?.public_no ?? product?.publicNo),
    shortCode: s(product?.short_url ?? product?.shortUrl) || null,
  });
}

function getProductTime(product: ProductCardVM) {
  const raw = product.raw ?? {};

  const time = new Date(
    raw?.created_at ||
      raw?.seo?.created_at ||
      raw?.updated_at ||
      raw?.seo?.updated_at ||
      0,
  ).getTime();

  return Number.isFinite(time) ? time : 0;
}

function getProductPopularity(product: ProductCardVM) {
  const raw = product.raw ?? {};

  return safeNumber(
    firstDefined(
      raw?.sold_qty,
      raw?.soldQty,
      raw?.purchase_count,
      raw?.purchaseCount,
      raw?.seo?.sold_qty,
      raw?.seo?.soldQty,
      raw?.metadata?.sold_qty,
      raw?.metadata?.soldQty,
    ),
  );
}

function buildProductCard(args: {
  product: any;
  mode: SeoUrlMode;
  showDashInstead: boolean;
  currencies?: any;
  tax?: any;
}): SearchProductCardVM {
  const href = getProductHref(args.product, args.mode);

  return toProductCardVM({
    storeSlug: "",
    currencies: args.currencies,
    tax: args.tax,
    product: {
      ...args.product,
      href,
      showDashInstead: args.showDashInstead,
    },
  } as any) as SearchProductCardVM;
}

function sortProducts(args: {
  products: SearchProductCardVM[];
  sort: SortKey;
  quantitySortEnabled: boolean;
}) {
  const products = Array.isArray(args.products) ? [...args.products] : [];

  products.sort((a, b) => {
    if (args.sort === "price_asc") {
      return safeNumber(a.price) - safeNumber(b.price);
    }

    if (args.sort === "price_desc") {
      return safeNumber(b.price) - safeNumber(a.price);
    }

    if (args.sort === "popular") {
      return getProductPopularity(b) - getProductPopularity(a);
    }

    return getProductTime(b) - getProductTime(a);
  });

  if (!args.quantitySortEnabled) return products;

  return products.sort((a, b) => {
    if (a.isOutOfStock === b.isOutOfStock) return 0;
    return a.isOutOfStock ? 1 : -1;
  });
}

function normalizeCategories(data: any) {
  const categories =
    data?.bootstrap?.navigation?.categories ||
    data?.navigation?.categories ||
    data?.categories ||
    [];

  if (!Array.isArray(categories)) return [];

  return categories
    .map((category: any) => ({
      name: s(category?.name || category?.title),
      href: s(category?.href || category?.url || category?.link),
    }))
    .filter((category) => category.name && category.href)
    .slice(0, 8);
}

function openSmartSearch() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("mk:search:open"));
}

export default function SearchMobileScreen({ data, mode, seoMode }: Props) {
  const activeMode = normalizeMode(mode ?? seoMode);

  const query = s(data?.query);
  const sort = normalizeSort(data?.sort);
  const rawProducts = Array.isArray(data?.products) ? data.products : [];

  const currencies = resolveCurrenciesFromData(data);
  const tax = resolveTaxFromData(data);

  const storeOptions = parseStoreOptions(data?.options ?? {});
  const quantitySortEnabled = storeOptions?.switches?.quantitySort ?? true;
  const showDashInstead = storeOptions?.switches?.showDashInstead ?? true;

  const hasQuery = query.length >= 2;

  const quickCategories = useMemo(() => {
    return normalizeCategories(data);
  }, [data]);

  const products = useMemo(() => {
    const cards = rawProducts.map((product: any) =>
      buildProductCard({
        product,
        mode: activeMode,
        showDashInstead,
        currencies,
        tax,
      }),
    );

    return sortProducts({
      products: cards,
      sort,
      quantitySortEnabled,
    });
  }, [
    rawProducts,
    activeMode,
    sort,
    quantitySortEnabled,
    showDashInstead,
    currencies,
    tax,
  ]);

  const total = products.length;

  return (
    <main dir="rtl" className="mk-msearch-page">
      <section className="mk-msearch-hero" aria-label="البحث">
        <div className="mk-msearch-hero__top">
          <div className="mk-msearch-hero__content">
            <span className="mk-msearch-hero__eyebrow">البحث</span>

            <h1 className="mk-msearch-hero__title">
              {hasQuery ? (
                <>
                  نتائج عن <b>{query}</b>
                </>
              ) : (
                "وش تبحث عنه اليوم؟"
              )}
            </h1>
          </div>

          {hasQuery ? (
            <span className="mk-msearch-hero__count">{resultLabel(total)}</span>
          ) : null}
        </div>

        <button
          type="button"
          className={[
            "mk-msearch-smart",
            hasQuery ? "has-query" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={openSmartSearch}
          aria-label="فتح البحث الذكي"
        >
          <span className="mk-msearch-smart__icon">
            <Icon icon="Search01" size={20 as any} />
          </span>

          <span className="mk-msearch-smart__text">
            {hasQuery ? query : "ابحث عن منتج أو قسم"}
          </span>

          {hasQuery ? (
            <span className="mk-msearch-smart__clear" aria-hidden="true">
              ×
            </span>
          ) : (
            <span className="mk-msearch-smart__hint">فتح</span>
          )}
        </button>

        {hasQuery ? (
          <nav className="mk-msearch-sort" aria-label="ترتيب النتائج">
            <Link
              href={buildSortHref(query, "newest")}
              scroll={false}
              className={[
                "mk-msearch-sort__item",
                sort === "newest" ? "is-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              الأحدث
            </Link>

            <Link
              href={buildSortHref(query, "popular")}
              scroll={false}
              className={[
                "mk-msearch-sort__item",
                sort === "popular" ? "is-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              الأكثر طلبًا
            </Link>

            <Link
              href={buildSortHref(query, "price_asc")}
              scroll={false}
              className={[
                "mk-msearch-sort__item",
                sort === "price_asc" ? "is-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              الأقل سعرًا
            </Link>

            <Link
              href={buildSortHref(query, "price_desc")}
              scroll={false}
              className={[
                "mk-msearch-sort__item",
                sort === "price_desc" ? "is-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              الأعلى سعرًا
            </Link>
          </nav>
        ) : null}
      </section>

      {!hasQuery ? (
        <section className="mk-msearch-empty">
          <div className="mk-msearch-empty__icon">
            <Icon icon="Search01" size={26 as any} />
          </div>

          <h2>ابدأ البحث من هنا</h2>

          <p>اضغط على مربع البحث لفتح البحث الذكي مثل بحث الهيدر تمامًا.</p>

          <button
            type="button"
            className="mk-msearch-empty__button"
            onClick={openSmartSearch}
          >
            افتح البحث
          </button>

          {quickCategories.length ? (
            <div className="mk-msearch-quick">
              {quickCategories.map((category) => (
                <Link
                  key={`${category.name}-${category.href}`}
                  href={category.href}
                  className="mk-msearch-quick__item"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      ) : total === 0 ? (
        <section className="mk-msearch-empty">
          <div className="mk-msearch-empty__icon">
            <Icon icon="Search01" size={26 as any} />
          </div>

          <h2>ما لقينا نتائج</h2>

          <p>جرّب كلمة أبسط أو افتح البحث الذكي لاختيار نتيجة مباشرة.</p>

          <button
            type="button"
            className="mk-msearch-empty__button"
            onClick={openSmartSearch}
          >
            بحث جديد
          </button>
        </section>
      ) : (
        <section className="mk-msearch-results" aria-label="نتائج البحث">
          <div className="mk-msearch-results__head">
            <strong>{resultLabel(total)}</strong>
            <span>منتجات مطابقة لبحثك</span>
          </div>

          <div className="mk-msearch-grid">
            {products.map((product, index) => (
              <ProductCard
                key={`${String(product.id || product.publicNo || index)}_${
                  product.publicNo ?? index
                }`}
                item={product as any}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}