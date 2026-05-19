// FILE: apps/storefront/src/themes/malak/screens/search/SearchScreen.tsx

"use client";

import { useMemo } from "react";
import { buildProductHref } from "@/lib/seo/build-store-href";
import type { SeoUrlMode } from "@/data/store/settings";
import { parseStoreOptions } from "@/lib/store-options";
import {
  toProductCardVM,
  type ProductCardVM,
} from "@/data/viewmodels/product.vm";
import ProductCard from "@/themes/malak/components/product-card/ProductCard";

type Props = {
  data?: any;
  mode: SeoUrlMode;
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

export default function SearchScreen({ data, mode }: Props) {
  const seoMode = normalizeMode(mode);

  const query = s(data?.query);
  const sort = normalizeSort(data?.sort);
  const rawProducts = Array.isArray(data?.products) ? data.products : [];

  const currencies = resolveCurrenciesFromData(data);
  const tax = resolveTaxFromData(data);

  const storeOptions = parseStoreOptions(data?.options ?? {});
  const quantitySortEnabled = storeOptions?.switches?.quantitySort ?? true;
  const showDashInstead = storeOptions?.switches?.showDashInstead ?? true;

  const hasQuery = query.length >= 2;

  const products = useMemo(() => {
    const cards = rawProducts.map((product: any) =>
      buildProductCard({
        product,
        mode: seoMode,
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
    seoMode,
    sort,
    quantitySortEnabled,
    showDashInstead,
    currencies,
    tax,
  ]);

  const total = products.length;

  return (
    <div dir="rtl" className="mk-search-page">
      <div className="mk-search-page__container">
        <header className="mk-search-head">
          <div className="mk-search-head__content">
            <div className="mk-search-head__eyebrow">نتائج البحث</div>

            {hasQuery ? (
              <>
                <h1 className="mk-search-head__title">
                  نتائج البحث عن: <span>{query}</span>
                </h1>

                <p className="mk-search-head__desc">
                  {resultLabel(total)} مطابقة لبحثك في المتجر.
                </p>
              </>
            ) : (
              <>
                <h1 className="mk-search-head__title">
                  ابدأ البحث من الشريط العلوي
                </h1>

                <p className="mk-search-head__desc">
                  اكتب اسم المنتج في شريط البحث الموجود في الهيدر لعرض النتائج.
                </p>
              </>
            )}
          </div>

          {hasQuery ? (
            <div className="mk-search-sort" aria-label="ترتيب النتائج">
              <a
                href={buildSortHref(query, "newest")}
                className={[
                  "mk-search-sort__item",
                  sort === "newest" ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                الأحدث
              </a>

              <a
                href={buildSortHref(query, "price_asc")}
                className={[
                  "mk-search-sort__item",
                  sort === "price_asc" ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                الأقل سعرًا
              </a>

              <a
                href={buildSortHref(query, "price_desc")}
                className={[
                  "mk-search-sort__item",
                  sort === "price_desc" ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                الأعلى سعرًا
              </a>

              <a
                href={buildSortHref(query, "popular")}
                className={[
                  "mk-search-sort__item",
                  sort === "popular" ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                الأكثر طلبًا
              </a>
            </div>
          ) : null}
        </header>

        {!hasQuery ? (
          <div className="mk-search-empty">
            <div className="mk-search-empty__badge">بحث</div>
            <h2 className="mk-search-empty__title">لا يوجد نص بحث بعد</h2>
            <p className="mk-search-empty__desc">
              استخدم شريط البحث في الهيدر للوصول للمنتجات بسرعة.
            </p>
          </div>
        ) : total === 0 ? (
          <div className="mk-search-empty">
            <div className="mk-search-empty__badge">لا توجد نتائج</div>
            <h2 className="mk-search-empty__title">لم نجد منتجات مطابقة</h2>
            <p className="mk-search-empty__desc">
              جرّب كلمة أبسط أو تأكد من كتابة اسم المنتج بشكل صحيح.
            </p>
          </div>
        ) : (
          <div className="mk-search-grid">
            {products.map((product, index) => (
              <ProductCard
                key={`${String(product.id || product.publicNo || index)}_${
                  product.publicNo ?? index
                }`}
                item={product as any}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}