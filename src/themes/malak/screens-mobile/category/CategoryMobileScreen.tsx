// FILE: apps/storefront/src/themes/malak/screens-mobile/category/CategoryMobileScreen.tsx
"use client";

import HtmlThemeSections from "../../components/theme-page-tools/HtmlThemeSections";

import { useMemo, useState, useTransition } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";

import { buildCategoryHref as buildStoreCategoryHref } from "@/lib/seo/build-store-href";
import type { SeoUrlMode } from "@/data/store/settings";

import MobileCategoryHeader from "./_components/MobileCategoryHeader";
import MobileProductsGrid from "./_components/MobileProductsGrid";
import {
  useCategoriesTree,
  type CategoryNode as TreeCategoryNode,
} from "../../app-shell/_hooks/useCategoriesTree";

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
  image?: { url?: string | null; alt?: string | null } | null;
  imageUrl?: string | null;
  image_url?: string | null;
  media?: { url?: string | null; alt?: string | null } | null;
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

function categoryImageUrl(category: CategoryNode | null | undefined) {
  return (
    s(category?.image?.url) ||
    s(category?.imageUrl) ||
    s(category?.image_url) ||
    s(category?.media?.url)
  );
}

function categoryImageAlt(category: CategoryNode | null | undefined) {
  return (
    s(category?.image?.alt) ||
    s(category?.media?.alt) ||
    categoryTitle(category || {}) ||
    "القسم"
  );
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

function getRootCategories(data: any): CategoryNode[] {
  const candidates = [
    data?.bootstrap?.navigation?.categories,
    data?.navigation?.categories,
    data?.theme?.navigation?.categories,
    data?.storefront?.navigation?.categories,
    data?.categories,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate) || !candidate.length) continue;

    return candidate
      .filter((item) => categoryTitle(item))
      .sort((a, b) => {
        const ao = Number(a?.sort_order ?? 0);
        const bo = Number(b?.sort_order ?? 0);

        if (ao !== bo) return ao - bo;

        return categoryTitle(a).localeCompare(categoryTitle(b), "ar");
      });
  }

  return [];
}

function sameCategory(
  a: CategoryNode | null | undefined,
  b: CategoryNode | null | undefined,
) {
  const aId = s(a?.id);
  const bId = s(b?.id);
  if (aId && bId) return aId === bId;

  const aNo = s(a?.public_no ?? a?.publicNo);
  const bNo = s(b?.public_no ?? b?.publicNo);

  return Boolean(aNo && bNo && aNo === bNo);
}

const SORT_OPTIONS = [
  { value: "", label: "التوصية" },
  { value: "latest", label: "الأحدث" },
  { value: "popular", label: "الأكثر طلبًا" },
  { value: "price_asc", label: "السعر ↑" },
  { value: "price_desc", label: "السعر ↓" },
] as const;

function cleanTreeNodes(
  nodes: TreeCategoryNode[] | undefined | null,
): TreeCategoryNode[] {
  if (!Array.isArray(nodes)) return [];

  return [...nodes]
    .filter((node) => Boolean(node?.id) && Boolean(s(node?.name)))
    .sort((a, b) => {
      const ao = Number(a?.sort_order ?? 0);
      const bo = Number(b?.sort_order ?? 0);
      if (ao !== bo) return ao - bo;
      return s(a?.name).localeCompare(s(b?.name), "ar");
    });
}

function findCategoryPath(
  nodes: TreeCategoryNode[],
  category: CategoryNode | null | undefined,
) {
  const categoryId = s(category?.id);
  const publicNo = s(category?.public_no ?? category?.publicNo);

  function matches(node: TreeCategoryNode) {
    if (categoryId && s(node.id) === categoryId) return true;
    if (publicNo && s(node.public_no) === publicNo) return true;
    return false;
  }

  function walk(
    items: TreeCategoryNode[],
    parents: TreeCategoryNode[],
  ): TreeCategoryNode[] | null {
    for (const item of cleanTreeNodes(items)) {
      const next = [...parents, item];
      if (matches(item)) return next;

      const found = walk(cleanTreeNodes(item.children), next);
      if (found) return found;
    }

    return null;
  }

  return walk(nodes, []) ?? [];
}

function treeNodeHref(node: TreeCategoryNode, mode: SeoUrlMode) {
  return buildStoreCategoryHref({
    mode,
    slugNameAr: node?.name ?? "",
    slugNameEn: node?.slug ?? node?.name ?? "",
    publicNo: Number(node?.public_no ?? 0),
    shortCode: node?.short_url ?? null,
  });
}

export default function CategoryMobileScreen({ data, mode, seoMode }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { tree: categoriesTree, loading: categoriesTreeLoading } =
    useCategoriesTree({ maxDepth: 6 });
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
          imageUrl: categoryImageUrl(categoryNode),
          imageAlt: categoryImageAlt(categoryNode),
        };
      })
      .filter(Boolean) as Array<{
        id: string;
        label: string;
        href: string;
        imageUrl: string;
        imageAlt: string;
      }>;
  }, [data, currentMode]);

  /*
   * نتائج الفلاتر والدفعات التالية تصل مرتبة من السيرفر.
   * لا نعيد تقاطعها هنا مع productIds الخاصة بالدفعة الأولى،
   * وإلا ستختفي كل المنتجات التي يصل تحميلها لاحقًا.
   */
  const products = rawProducts;

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

function setSort(value: string) {
  const params = new URLSearchParams(currentParamsText);

  if (value) params.set("sort", value);
  else params.delete("sort");

  startTransition(() => {
    router.replace(buildUrl(pathname, params), { scroll: false });
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
  const breadcrumbPath = findCategoryPath(
    cleanTreeNodes(categoriesTree),
    category,
  );
  const currentTreeNode = breadcrumbPath[breadcrumbPath.length - 1] ?? null;
  const directChildNodes = cleanTreeNodes(currentTreeNode?.children).length
    ? cleanTreeNodes(currentTreeNode?.children)
    : (getCategoryChildren(data) as TreeCategoryNode[]);
  const hasDirectChildren = directChildNodes.length > 0;
  const resolvingChildren = categoriesTreeLoading && !breadcrumbPath.length;
  const showBranches = hasDirectChildren;
  const visibleChildNodes = directChildNodes.slice(0, 6);
  const hasMoreChildNodes = directChildNodes.length > visibleChildNodes.length;
  const compactBreadcrumbPath = breadcrumbPath.slice(-2);
  const rootCategories: CategoryNode[] = [];
  const activeSort = s(searchParams.get("sort"));

  return (
    <div
      dir="rtl"
      className={[
        "mk-mobile-category",
        "mk-mobile-category--catalog",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <HtmlThemeSections
        data={data}
        pageKey="category"
        entityId={String(data?.category?.id || data?.category_id || "")}
      />
      <MobileCategoryHeader title={title} />

      {rootCategories.length ? (
        <nav className="mk-mobile-category-roots" aria-label="الأقسام الرئيسية">
          <div className="mk-mobile-category-roots__scroll">
            {rootCategories.map((root) => {
              const label = categoryTitle(root);
              const href = buildCategoryHref(root, currentMode);
              const active = sameCategory(root, category);

              return (
                <Link
                  key={s(root.id) || href || label}
                  href={href}
                  className={[
                    "mk-mobile-category-root",
                    active ? "is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}

      {null}

      <nav className="mk-mobile-category-crumbs" aria-label="مسار القسم">
        <Link href="/categories">الرئيسية</Link>
        {breadcrumbPath.length > compactBreadcrumbPath.length ? (
          <span className="mk-mobile-category-crumbs__item">
            <span aria-hidden="true">â†گ</span>
            <span>...</span>
          </span>
        ) : null}
        {compactBreadcrumbPath.map((item, index) => {
          const isCurrent = index === compactBreadcrumbPath.length - 1;
          const label = s(item.name);

          return (
            <span
              key={s(item.id) || label}
              className="mk-mobile-category-crumbs__item"
            >
              <span aria-hidden="true">←</span>
              {isCurrent ? (
                <strong>{label}</strong>
              ) : (
                <Link href={treeNodeHref(item, currentMode)}>{label}</Link>
              )}
            </span>
          );
        })}
        {!breadcrumbPath.length ? (
          <span className="mk-mobile-category-crumbs__item">
            <span aria-hidden="true">←</span>
            <strong>{title}</strong>
          </span>
        ) : null}
      </nav>

      <section className="mk-mobile-category-titleBlock">
        <h1>{title}</h1>
      </section>

      {showBranches ? (
        <section
          className={[
            "mk-mobile-category-branches",
            resolvingChildren ? "is-loading" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label="فروع القسم"
        >
          {resolvingChildren ? (
            <>
              {Array.from({ length: 4 }).map((_, index) => (
                <span key={index} className="mk-mobile-category-branchSkeleton" />
              ))}
            </>
          ) : visibleChildNodes.map((child) => {
            const label = categoryTitle(child);
            const href = buildCategoryHref(child, currentMode);
            const imageUrl = categoryImageUrl(child);

            return (
              <Link
                key={s(child.id) || href || label}
                href={href}
                className="mk-mobile-category-branch"
              >
                <span className="mk-mobile-category-branch__media">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={categoryImageAlt(child)}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span>{label.slice(0, 1)}</span>
                  )}
                </span>

                <span className="mk-mobile-category-branch__text">
                  <strong>{label}</strong>
                  <small>تصفح القسم</small>
                </span>

                <span
                  className="mk-mobile-category-branch__arrow"
                  aria-hidden="true"
                >
                  ‹
                </span>
              </Link>
            );
          })}
          {hasMoreChildNodes ? (
            <span className="mk-mobile-category-branch mk-mobile-category-branch--more">
              <span className="mk-mobile-category-branch__media">
                <span>+</span>
              </span>
              <span className="mk-mobile-category-branch__text">
                <strong>ظƒظ„ ط§ظ„ظپط±ظˆط¹</strong>
                <small>{directChildNodes.length} ظپط±ط¹</small>
              </span>
            </span>
          ) : null}
        </section>
      ) : null}

      <div className="mk-mobile-category-tools">
        <div
          className="mk-mobile-category-tools__sort"
          role="group"
          aria-label="ترتيب المنتجات"
        >
          {SORT_OPTIONS.map((option) => {
            const active =
              activeSort === option.value || (!activeSort && !option.value);

            return (
              <button
                key={option.value || "default"}
                type="button"
                className={active ? "is-active" : ""}
                onClick={() => setSort(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {filtersEnabled || subcategoryItems.length ? (
          <button
            type="button"
            className="mk-mobile-category-tools__filter"
            onClick={openFilters}
          >
            <SlidersHorizontal size={15} />
            <span>تصفية</span>
          </button>
        ) : null}
      </div>

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
          categoryId={s(category?.id)}
          searchParamsText={currentParamsText}
          pageInfo={data?.pagination}
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
