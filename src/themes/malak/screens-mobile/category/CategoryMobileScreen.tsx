// FILE: apps/storefront/src/themes/malak/screens-mobile/category/CategoryMobileScreen.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

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

type CategoryTreeItem = {
  category: any;
  depth: number;
  hasChildren: boolean;
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

function splitParamValue(value: any): string[] {
  const text = s(value);
  if (!text) return [];

  return text
    .split(",")
    .map((item) => s(item))
    .filter(Boolean);
}

function getParamValues(params: URLSearchParams, key: string) {
  return params.getAll(key).flatMap(splitParamValue);
}

function getMultiParamValues(params: URLSearchParams, keys: string[]) {
  const out: string[] = [];

  for (const key of keys) {
    for (const value of getParamValues(params, key)) {
      if (value && !out.includes(value)) out.push(value);
    }
  }

  return out;
}

function setParamValues(
  params: URLSearchParams,
  key: string,
  values: string[],
) {
  params.delete(key);

  for (const value of values) {
    const text = s(value);
    if (text) params.append(key, text);
  }
}

function buildUrl(pathname: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function normalizePublicKey(value: any, fallback = "item") {
  const raw = s(value) || fallback;

  const key = raw
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);

  return key || fallback;
}

function optionParamMatches(raw: any, optionKey: any, valueKey: any) {
  const text = s(raw);
  if (!text) return false;

  const separator = text.includes(":") ? ":" : text.includes("=") ? "=" : "";
  if (!separator) return false;

  const [optionRaw, ...valueParts] = text.split(separator);

  return (
    normalizePublicKey(optionRaw) === normalizePublicKey(optionKey) &&
    normalizePublicKey(valueParts.join(separator)) ===
      normalizePublicKey(valueKey)
  );
}

function isCssColorValue(value: any) {
  const text = s(value).toLowerCase();

  return (
    text.startsWith("#") ||
    text.startsWith("rgb(") ||
    text.startsWith("rgba(") ||
    text.startsWith("hsl(") ||
    text.startsWith("hsla(")
  );
}

function toFiniteNumber(value: any) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function readNumberLabel(value: any) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";

  return new Intl.NumberFormat("ar", {
    maximumFractionDigits: 2,
  }).format(n);
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

function resolveCurrencyLabel(data: any) {
  const currencies = resolveCurrenciesFromData(data);
  const selected =
    currencies?.selected ||
    currencies?.active ||
    currencies?.current ||
    currencies?.default ||
    null;

  return (
    s(selected?.symbol) ||
    s(selected?.currency_symbol) ||
    s(selected?.code) ||
    s(data?.store?.currency) ||
    s(data?.store?.default_currency) ||
    s(data?.currency) ||
    "SAR"
  );
}

function readPriceLabel(value: any, currencyLabel: string) {
  const numberLabel = readNumberLabel(value);
  return numberLabel ? `${currencyLabel} ${numberLabel}` : "";
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

function clearFilterParams(params: URLSearchParams) {
  const keys = [
    "cat",
    "category",
    "category_id",
    "category_ids",
    "brand",
    "brands",
    "brand_id",
    "brand_ids",
    "fo",
    "filter_option",
    "filterOption",
    "price_min",
    "min_price",
    "from",
    "price_max",
    "max_price",
    "to",
    "available",
    "availability",
    "in_stock",
    "stock",
    "discounted",
    "discount",
    "sale",
    "offers",
    "sort",
  ];

  for (const key of keys) params.delete(key);

  for (const key of Array.from(params.keys())) {
    if (key.startsWith("f_") || key.startsWith("filter_")) {
      params.delete(key);
    }
  }
}

export default function CategoryMobileScreen({ data, mode, seoMode }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftSearch, setDraftSearch] = useState("");
  const [openCategoryIds, setOpenCategoryIds] = useState<Set<string>>(
    () => new Set(),
  );

  const currentMode = normalizeMode(mode ?? seoMode ?? data?.mode);

  const category = data?.category || null;
  const rawProducts = Array.isArray(data?.products) ? data.products : [];

  const catalogFilters = data?.catalogFilters || null;
  const filtersEnabled = Boolean(catalogFilters?.enabled);

  const currencies = resolveCurrenciesFromData(data);
  const tax = resolveTaxFromData(data);
  const currencyLabel = resolveCurrencyLabel(data);

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

  const filteredProductIds: string[] | null =
    filtersEnabled && Array.isArray(catalogFilters?.productIds)
      ? catalogFilters.productIds.map((value: any) => s(value)).filter(Boolean)
      : null;

  const products = useMemo(() => {
    if (!filteredProductIds) return rawProducts;

    const byId = new Map<string, any>();

    for (const product of rawProducts) {
      const id = s(product?.id);
      if (id) byId.set(id, product);
    }

    return filteredProductIds
      .map((productId) => byId.get(productId))
      .filter(Boolean);
  }, [filteredProductIds, rawProducts]);

  const currentParamsText = searchParams.toString();

  const draftParams = useMemo(
    () => new URLSearchParams(draftSearch || currentParamsText),
    [draftSearch, currentParamsText],
  );

  const draftCategoryIds = useMemo(
    () =>
      getMultiParamValues(draftParams, [
        "cat",
        "category",
        "category_id",
        "category_ids",
      ]),
    [draftParams],
  );

  const draftBrandIds = useMemo(
    () =>
      getMultiParamValues(draftParams, [
        "brand",
        "brands",
        "brand_id",
        "brand_ids",
      ]),
    [draftParams],
  );

  const draftOptionRawValues = useMemo(
    () => getParamValues(draftParams, "fo"),
    [draftParams],
  );

  const draftAvailable = Boolean(s(draftParams.get("available")));
  const draftDiscounted = Boolean(s(draftParams.get("discounted")));

  const facets = Array.isArray(catalogFilters?.facets)
    ? catalogFilters.facets
    : [];

  const brandFacets = Array.isArray(catalogFilters?.brands)
    ? catalogFilters.brands
    : [];

  const categoryFacets = Array.isArray(catalogFilters?.categories)
    ? catalogFilters.categories
    : [];

  const priceFacet = catalogFilters?.price || {};
  const rawPriceMin = toFiniteNumber(priceFacet?.min);
  const rawPriceMax = toFiniteNumber(priceFacet?.max);

  const priceBoundMin = Number.isFinite(rawPriceMin ?? NaN)
    ? Math.floor(Number(rawPriceMin))
    : 0;

  const priceBoundMax =
    Number.isFinite(rawPriceMax ?? NaN) && Number(rawPriceMax) > priceBoundMin
      ? Math.ceil(Number(rawPriceMax))
      : priceBoundMin + 1;

  const priceStep = Math.max(1, Math.round((priceBoundMax - priceBoundMin) / 100));













 const draftPriceMinRaw =
  s(draftParams.get("price_min")) ||
  s(draftParams.get("min_price")) ||
  s(draftParams.get("from"));

const draftPriceMaxRaw =
  s(draftParams.get("price_max")) ||
  s(draftParams.get("max_price")) ||
  s(draftParams.get("to"));

const hasDraftPriceMin = Boolean(draftPriceMinRaw);
const hasDraftPriceMax = Boolean(draftPriceMaxRaw);

const draftPriceMinNumber = toFiniteNumber(draftPriceMinRaw);
const draftPriceMaxNumber = toFiniteNumber(draftPriceMaxRaw);

const draftPriceMin =
  hasDraftPriceMin && draftPriceMinNumber !== null
    ? clampNumber(draftPriceMinNumber, priceBoundMin, priceBoundMax)
    : priceBoundMin;

const draftPriceMax =
  hasDraftPriceMax && draftPriceMaxNumber !== null
    ? clampNumber(draftPriceMaxNumber, priceBoundMin, priceBoundMax)
    : priceBoundMax;

const draftRangeMin = Math.min(draftPriceMin, draftPriceMax);
const draftRangeMax = Math.max(draftPriceMin, draftPriceMax);

const priceFromPercent =
  ((draftRangeMin - priceBoundMin) /
    Math.max(1, priceBoundMax - priceBoundMin)) *
  100;

const priceToPercent =
  ((draftRangeMax - priceBoundMin) /
    Math.max(1, priceBoundMax - priceBoundMin)) *
  100;
















 

  const { categoryById, categoryTreeItems } = useMemo(() => {
    const byId = new Map<string, any>();
    const childrenByParent = new Map<string, any[]>();
    const roots: any[] = [];

    for (const item of categoryFacets) {
      const id = s(item?.id);
      if (id) byId.set(id, item);
    }

    for (const item of categoryFacets) {
      const id = s(item?.id);
      const parentId = s(item?.parentId);

      if (!id) continue;

      if (parentId && byId.has(parentId)) {
        const children = childrenByParent.get(parentId) || [];
        children.push(item);
        childrenByParent.set(parentId, children);
      } else {
        roots.push(item);
      }
    }

    const out: CategoryTreeItem[] = [];

    function push(items: any[], depth: number) {
      for (const item of items) {
        const id = s(item?.id);
        if (!id) continue;

        const children = childrenByParent.get(id) || [];

        out.push({
          category: item,
          depth,
          hasChildren: children.length > 0,
        });

        if (children.length) push(children, depth + 1);
      }
    }

    push(roots, 0);

    return {
      categoryById: byId,
      categoryTreeItems: out,
    };
  }, [categoryFacets]);

  const visibleCategoryTreeItems = useMemo(() => {
    function isVisible(item: any) {
      let parentId = s(item?.parentId);
      const seen = new Set<string>();

      while (parentId && categoryById.has(parentId) && !seen.has(parentId)) {
        seen.add(parentId);

        if (!openCategoryIds.has(parentId)) return false;

        parentId = s(categoryById.get(parentId)?.parentId);
      }

      return true;
    }

    return categoryTreeItems.filter(({ category }) => isVisible(category));
  }, [categoryTreeItems, categoryById, openCategoryIds]);

  function updateDraftParams(update: (params: URLSearchParams) => void) {
    setDraftSearch((prev) => {
      const params = new URLSearchParams(prev || currentParamsText);
      update(params);
      return params.toString();
    });
  }

  function openFilters() {
    setDraftSearch(currentParamsText);
    setFiltersOpen(true);
  }

  function applyFilters() {
    const params = new URLSearchParams(draftSearch || currentParamsText);
    const nextUrl = buildUrl(pathname, params);

    setFiltersOpen(false);

    startTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  }

  function resetDraftFilters() {
    updateDraftParams((params) => clearFilterParams(params));
  }

  function toggleDraftCategory(categoryId: any) {
    const id = s(categoryId);
    if (!id) return;

    updateDraftParams((params) => {
      const currentValues = getParamValues(params, "cat");
      const exists = currentValues.includes(id);

      const nextValues = exists
        ? currentValues.filter((item) => item !== id)
        : [...currentValues, id];

      setParamValues(params, "cat", nextValues);
    });
  }

  function toggleCategoryOpen(categoryId: any) {
    const id = s(categoryId);
    if (!id) return;

    setOpenCategoryIds((prev) => {
      const next = new Set(prev);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  }

  function toggleDraftOption(facet: any, value: any) {
    const optionKey = s(facet?.key);
    const valueKey = s(value?.key);
    const nextRaw = `${optionKey}:${valueKey}`;

    if (!optionKey || !valueKey) return;

    updateDraftParams((params) => {
      const currentValues = getParamValues(params, "fo");

      const exists = currentValues.some((item) =>
        optionParamMatches(item, optionKey, valueKey),
      );

      const nextValues = exists
        ? currentValues.filter(
            (item) => !optionParamMatches(item, optionKey, valueKey),
          )
        : [...currentValues, nextRaw];

      setParamValues(params, "fo", nextValues);
    });
  }

  function toggleDraftBrand(brandId: any) {
    const id = s(brandId);
    if (!id) return;

    updateDraftParams((params) => {
      const currentValues = getParamValues(params, "brand");
      const exists = currentValues.includes(id);

      const nextValues = exists
        ? currentValues.filter((item) => item !== id)
        : [...currentValues, id];

      setParamValues(params, "brand", nextValues);
    });
  }

  function setDraftBooleanFilter(
    key: "available" | "discounted",
    enabled: boolean,
  ) {
    updateDraftParams((params) => {
      if (key === "available") {
        params.delete("availability");
        params.delete("in_stock");
        params.delete("stock");
      }

      if (key === "discounted") {
        params.delete("discount");
        params.delete("sale");
        params.delete("offers");
      }

      if (enabled) params.set(key, "1");
      else params.delete(key);
    });
  }

 function setDraftPriceRange(minValue: number, maxValue: number) {
  const safeMin = clampNumber(minValue, priceBoundMin, priceBoundMax);
  const safeMax = clampNumber(maxValue, priceBoundMin, priceBoundMax);

  const nextMin = Math.min(safeMin, safeMax);
  const nextMax = Math.max(safeMin, safeMax);

  updateDraftParams((params) => {
    params.delete("price_min");
    params.delete("min_price");
    params.delete("from");

    params.delete("price_max");
    params.delete("max_price");
    params.delete("to");

    if (nextMin > priceBoundMin) {
      params.set("price_min", String(nextMin));
    }

    if (nextMax < priceBoundMax) {
      params.set("price_max", String(nextMax));
    }
  });
}

function resetDraftPriceRange() {
  updateDraftParams((params) => {
    params.delete("price_min");
    params.delete("min_price");
    params.delete("from");

    params.delete("price_max");
    params.delete("max_price");
    params.delete("to");
  });
}

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
  const resultCount = Number(catalogFilters?.resultCount);
  const totalCount = Number.isFinite(resultCount) ? resultCount : products.length;

  return (
    <div dir="rtl" className="mk-mobile-category">
      <MobileCategoryHeader
        title={title}
        onFilterClick={
          filtersEnabled || subcategoryItems.length ? openFilters : undefined
        }
      />

      <MobileFiltersBar items={subcategoryItems} />

      {isPending ? (
        <div className="mk-mobile-category-pending">جاري تحديث النتائج…</div>
      ) : null}

      {products.length === 0 ? (
        <div className="mk-mobile-category-products-empty">
          لا توجد منتجات مطابقة
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

      {filtersOpen ? (
        <div
          className="mk-mobile-filterSheet"
          role="presentation"
          onClick={() => setFiltersOpen(false)}
        >
          <div
            className="mk-mobile-filterSheet__panel"
            role="dialog"
            aria-modal="true"
            aria-label="فلاتر المنتجات"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mk-mobile-filterSheet__handle" />

            <div className="mk-mobile-filterSheet__head">
              <div>
                <h2>تصفية</h2>
                <p>{totalCount} نتيجة</p>
              </div>

              <button
                type="button"
                className="mk-mobile-filterSheet__close"
                onClick={() => setFiltersOpen(false)}
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>

            <div className="mk-mobile-filterSheet__body">
              {filtersEnabled ? (
                <>
                  {visibleCategoryTreeItems.length ? (
                    <section className="mk-mobile-filterSec">
                      <h3>الفئات</h3>

                      <div className="mk-mobile-catTree">
                        {visibleCategoryTreeItems.map(
                          ({ category: item, depth, hasChildren }) => {
                            const id = s(item?.id);
                            const active = draftCategoryIds.includes(id);
                            const isOpen = openCategoryIds.has(id);

                            return (
                              <div
                                key={id}
                                className={[
                                  "mk-mobile-catTree__row",
                                  active ? "is-active" : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                style={{ "--cat-depth": depth } as any}
                              >
                                <button
                                  type="button"
                                  className="mk-mobile-catTree__select"
                                  onClick={() => toggleDraftCategory(id)}
                                >
                                  <span className="mk-mobile-catTree__check" />
                                  <span>{s(item?.label)}</span>
                                </button>

                                <small>{Number(item?.count ?? 0)}</small>

                                <button
                                  type="button"
                                  className="mk-mobile-catTree__toggle"
                                  disabled={!hasChildren}
                                  onClick={() => toggleCategoryOpen(id)}
                                >
                                  {hasChildren ? (isOpen ? "−" : "+") : ""}
                                </button>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </section>
                  ) : null}

                <section className="mk-mobile-filterSec">
  <div className="mk-mobile-filterSec__head">
    <h3>السعر</h3>

    <button
      type="button"
      onClick={resetDraftPriceRange}
      disabled={draftRangeMin <= priceBoundMin && draftRangeMax >= priceBoundMax}
    >
      إعادة
    </button>
  </div>

  <div className="mk-mobile-price">
    <div className="mk-mobile-price__values">
      <span>{readPriceLabel(draftRangeMin, currencyLabel)} من</span>
      <span>{readPriceLabel(draftRangeMax, currencyLabel)} إلى</span>
    </div>

    <div
      className="mk-mobile-price__slider"
      style={
        {
          "--price-from": `${priceFromPercent}%`,
          "--price-to": `${priceToPercent}%`,
        } as any
      }
    >
      <div className="mk-mobile-price__track" />

      <input
        className="mk-mobile-price__input mk-mobile-price__input--min"
        dir="rtl"
        type="range"
        min={priceBoundMin}
        max={priceBoundMax}
        step={priceStep}
        value={draftRangeMin}
        onChange={(event) => {
          const value = Number(event.target.value);
          setDraftPriceRange(Math.min(value, draftRangeMax), draftRangeMax);
        }}
        aria-label="أقل سعر"
      />

      <input
        className="mk-mobile-price__input mk-mobile-price__input--max"
        dir="rtl"
        type="range"
        min={priceBoundMin}
        max={priceBoundMax}
        step={priceStep}
        value={draftRangeMax}
        onChange={(event) => {
          const value = Number(event.target.value);
          setDraftPriceRange(draftRangeMin, Math.max(value, draftRangeMin));
        }}
        aria-label="أعلى سعر"
      />
    </div>

    <div className="mk-mobile-price__bounds">
      <small>{readPriceLabel(priceBoundMin, currencyLabel)}</small>
      <small>{readPriceLabel(priceBoundMax, currencyLabel)}</small>
    </div>
  </div>
</section>

                  {facets.map((facet: any) => {
                    const values = Array.isArray(facet?.values)
                      ? facet.values.filter((item: any) => s(item?.label))
                      : [];

                    if (!values.length) return null;

                    const isColor = s(facet?.type).toLowerCase() === "color";

                    return (
                      <section className="mk-mobile-filterSec" key={s(facet?.key)}>
                        <h3>{s(facet?.label) || "خيارات المنتج"}</h3>

                        <div
                          className={[
                            "mk-mobile-filterValues",
                            isColor ? "mk-mobile-filterValues--colors" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {values.map((value: any) => {
                            const valueKey = s(value?.key);
                            const active = draftOptionRawValues.some((item) =>
                              optionParamMatches(item, facet?.key, valueKey),
                            );

                            const colorValue = s(value?.label);
                            const colorStyle =
                              isColor && isCssColorValue(colorValue)
                                ? { "--filter-color": colorValue }
                                : undefined;

                            return (
                              <button
                                type="button"
                                key={valueKey}
                                className={[
                                  "mk-mobile-filterValue",
                                  active ? "is-active" : "",
                                  isColor ? "mk-mobile-filterValue--color" : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                style={colorStyle as any}
                                onClick={() => toggleDraftOption(facet, value)}
                              >
                                {isColor ? (
                                  <span className="mk-mobile-filterValue__swatch" />
                                ) : (
                                  <>
                                    <span>{s(value?.label)}</span>
                                    <small>{Number(value?.count ?? 0)}</small>
                                  </>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}

                  {brandFacets.length ? (
                    <section className="mk-mobile-filterSec">
                      <h3>العلامة التجارية</h3>

                      <div className="mk-mobile-filterValues">
                        {brandFacets.map((brand: any) => {
                          const id = s(brand?.id);
                          const active = draftBrandIds.includes(id);

                          return (
                            <button
                              type="button"
                              key={id}
                              className={[
                                "mk-mobile-filterValue",
                                active ? "is-active" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              onClick={() => toggleDraftBrand(id)}
                            >
                              <span>{s(brand?.label)}</span>
                              <small>{Number(brand?.count ?? 0)}</small>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ) : null}

                  <section className="mk-mobile-filterSec">
                    <h3>التوفر والعروض</h3>

                    <div className="mk-mobile-filterValues">
                      <button
                        type="button"
                        className={[
                          "mk-mobile-filterValue",
                          draftAvailable ? "is-active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() =>
                          setDraftBooleanFilter("available", !draftAvailable)
                        }
                      >
                        متوفر فقط
                      </button>

                      <button
                        type="button"
                        className={[
                          "mk-mobile-filterValue",
                          draftDiscounted ? "is-active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() =>
                          setDraftBooleanFilter("discounted", !draftDiscounted)
                        }
                      >
                        يشمل التخفيضات
                      </button>
                    </div>
                  </section>
                </>
              ) : (
                <section className="mk-mobile-filterSec">
                  <h3>الأقسام الفرعية</h3>

                  <div className="mk-mobile-subcats">
                    {subcategoryItems.map((item) => (
                      <a
                        key={item.id}
                        href={item.href || "#"}
                        onClick={() => setFiltersOpen(false)}
                      >
                        {item.label}
                      </a>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="mk-mobile-filterSheet__foot">
              <button
                type="button"
                className="mk-mobile-filterSheet__clear"
                onClick={resetDraftFilters}
              >
                مسح
              </button>

              <button
                type="button"
                className="mk-mobile-filterSheet__apply"
                onClick={applyFilters}
              >
                عرض المنتجات
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}