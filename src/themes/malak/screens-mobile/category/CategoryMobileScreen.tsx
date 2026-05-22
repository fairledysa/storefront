// FILE: apps/storefront/src/themes/malak/screens-mobile/category/CategoryMobileScreen.tsx
"use client";

import { useMemo, useState } from "react";
import { buildCategoryHref as buildStoreCategoryHref } from "@/lib/seo/build-store-href";
import type { SeoUrlMode } from "@/data/store/settings";

import MobileCategoryHeader from "./_components/MobileCategoryHeader";
import MobileFiltersBar from "./_components/MobileFiltersBar";
import MobileProductsGrid from "./_components/MobileProductsGrid";

type Props = {
  data: any;
  mode?: SeoUrlMode;
  seoMode?: SeoUrlMode;
};

type CategoryNode = {
  id?: string | number | null;
  name?: string | null;
  title?: string | null;
  label?: string | null;
  slug?: string | null;
  slug_ar?: string | null;
  slug_en?: string | null;
  slug_name_ar?: string | null;
  slug_name_en?: string | null;
  href?: string | null;
  public_no?: number | string | null;
  publicNo?: number | string | null;
  short_url?: string | null;
  shortUrl?: string | null;
  children?: CategoryNode[];
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeMode(value: any): SeoUrlMode {
  const mode = s(value?.mode ?? value);

  if (mode === "short" || mode === "named_ar" || mode === "named_en") {
    return mode;
  }

  return "named_ar";
}

function safePublicNo(value: any) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function categoryTitle(category: CategoryNode) {
  return s(category.name) || s(category.title) || s(category.label);
}

function buildCategoryHref(category: CategoryNode, mode: SeoUrlMode) {
  const existingHref = s(category.href);
  if (existingHref && existingHref !== "#") return existingHref;

  const publicNo = safePublicNo(category.public_no ?? category.publicNo);
  const shortCode = s(category.short_url ?? category.shortUrl) || null;

  if (!publicNo && !shortCode) return "#";

  const name = categoryTitle(category);
  const slug = s(category.slug);

  return buildStoreCategoryHref({
    mode,
    slugNameAr:
      s(category.slug_name_ar) ||
      s(category.slug_ar) ||
      name ||
      slug ||
      String(publicNo),
    slugNameEn:
      s(category.slug_name_en) ||
      s(category.slug_en) ||
      slug ||
      name ||
      String(publicNo),
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

function getCategoryChildren(data: any): CategoryNode[] {
  const direct = Array.isArray(data?.category?.children)
    ? data.category.children
    : [];

  if (direct.length) return direct;

  const subcategories = Array.isArray(data?.subcategories)
    ? data.subcategories
    : [];

  if (subcategories.length) return subcategories;

  const children = Array.isArray(data?.children) ? data.children : [];
  if (children.length) return children;

  const categoryChildren = Array.isArray(data?.category_children)
    ? data.category_children
    : [];

  if (categoryChildren.length) return categoryChildren;

  return [];
}

export default function CategoryMobileScreen({ data, mode, seoMode }: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const currentMode = normalizeMode(mode ?? seoMode ?? data?.mode);

  const category = data?.category || null;
  const products = Array.isArray(data?.products) ? data.products : [];

  const currencies = resolveCurrenciesFromData(data);
  const tax = resolveTaxFromData(data);

  const subcategoryItems = useMemo(() => {
    return getCategoryChildren(data)
      .map((categoryNode) => {
        const label = categoryTitle(categoryNode);
        if (!label) return null;

        return {
          id:
            s(categoryNode.id) ||
            s(categoryNode.public_no) ||
            s(categoryNode.publicNo) ||
            label,
          label,
          href: buildCategoryHref(categoryNode, currentMode),
        };
      })
      .filter(Boolean) as Array<{ id: string; label: string; href: string }>;
  }, [data, currentMode]);

  if (!data || !category) {
    return (
      <div dir="rtl" className="mk-mobile-category">
        <div className="mk-mobile-category-products-empty">
          تعذر تحميل القسم
        </div>
      </div>
    );
  }

  const title = categoryTitle(category) || "القسم";

  return (
    <div dir="rtl" className="mk-mobile-category">
      <MobileCategoryHeader
        title={title}
        onFilterClick={
          subcategoryItems.length
            ? () => setFiltersOpen((value) => !value)
            : undefined
        }
      />

      <MobileFiltersBar items={subcategoryItems} />

      {products.length === 0 ? (
        <div className="mk-mobile-category-products-empty">
          لا توجد منتجات في هذا القسم
        </div>
      ) : (
        <MobileProductsGrid
          products={products}
          mode={currentMode}
          data={data}
          currencies={currencies}
          tax={tax}
        />
      )}

      {filtersOpen && subcategoryItems.length ? (
        <div
          className="mk-mobile-category-sheet"
          role="presentation"
          onClick={() => setFiltersOpen(false)}
        >
          <div
            className="mk-mobile-category-sheet__panel"
            role="dialog"
            aria-modal="true"
            aria-label="أقسام فرعية"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mk-mobile-category-sheet__handle" />

            <div className="mk-mobile-category-sheet__title">
              الأقسام الفرعية
            </div>

            <div className="mk-mobile-category-sheet__items">
              {subcategoryItems.map((item) => (
                <a
                  key={item.id}
                  href={item.href || "#"}
                  className="mk-mobile-category-sheet__item"
                  onClick={() => setFiltersOpen(false)}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}