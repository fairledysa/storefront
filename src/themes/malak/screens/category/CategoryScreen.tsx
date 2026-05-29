// FILE: apps/storefront/src/themes/malak/screens/category/CategoryScreen.tsx

"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { buildProductHref } from "@/lib/seo/build-store-href";
import type { SeoUrlMode } from "@/data/store/settings";
import { parseStoreOptions } from "@/lib/store-options";
import {
  toProductCardVM,
  type ProductCardVM,
} from "@/data/viewmodels/product.vm";
import ProductCard from "@/themes/malak/components/product-card/ProductCard";
import LoadingOverlay from "../../components/LoadingOverlay";

type Props = {
  data?: any;
  mode: SeoUrlMode;
};

type ActiveChip = {
  key: string;
  label: string;
  onRemove: () => void;
};

type CategoryTreeItem = {
  category: any;
  depth: number;
  hasChildren: boolean;
};

type PriceRange = {
  min: number;
  max: number;
};

function s(value: any) {
  return String(value ?? "").trim();
}

function splitParamValue(value: any): string[] {
  const text = s(value);
  if (!text) return [];

  return text
    .split(",")
    .map((item) => s(item))
    .filter(Boolean);
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

function roundPrice(value: number) {
  return Math.round(value * 100) / 100;
}

function resolveProductHref(product: any, mode: SeoUrlMode) {
  const existingHref = s(product?.href) || s(product?.url);

  if (existingHref) return existingHref;

  return buildProductHref({
    mode,
    slugNameAr: product?.name ?? product?.title ?? "",
    slugNameEn: product?.slug ?? product?.name ?? product?.title ?? "",
    publicNo: Number(product?.public_no ?? product?.publicNo ?? 0),
    shortCode: product?.short_url ?? product?.shortUrl ?? null,
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
    data?.tax ||
    data?.store?.tax ||
    data?.theme?.tax ||
    data?.settings?.tax ||
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

function buildProductCard(args: {
  product: any;
  mode: SeoUrlMode;
  showDashInstead: boolean;
  currencies?: any;
  tax?: any;
}): ProductCardVM {
  const href = resolveProductHref(args.product, args.mode);

  return toProductCardVM({
    storeSlug: "",
    currencies: args.currencies,
    tax: args.tax,
    product: {
      ...args.product,
      href,
      showDashInstead: args.showDashInstead,
    },
  });
}

function sortProductsByStock(
  products: ProductCardVM[],
  quantitySortEnabled: boolean,
) {
  if (!quantitySortEnabled) return products;

  return [...products].sort((a, b) => {
    if (a.isOutOfStock === b.isOutOfStock) return 0;
    if (a.isOutOfStock && !b.isOutOfStock) return 1;
    if (!a.isOutOfStock && b.isOutOfStock) return -1;

    return 0;
  });
}

function buildUrl(pathname: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
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

function getFirstParamValue(params: URLSearchParams, keys: string[]) {
  for (const key of keys) {
    const value = s(params.get(key));
    if (value) return value;
  }

  return "";
}

function isTruthyParamValue(value: any) {
  const text = s(value).toLowerCase();

  return Boolean(
    text &&
      text !== "0" &&
      text !== "false" &&
      text !== "no" &&
      text !== "off",
  );
}

function hasTruthyParam(params: URLSearchParams, keys: string[]) {
  return keys.some((key) => isTruthyParamValue(params.get(key)));
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

function parseOptionSelection(raw: any) {
  const text = s(raw);
  if (!text) return null;

  const separator = text.includes(":") ? ":" : text.includes("=") ? "=" : "";
  if (!separator) return null;

  const [optionRaw, ...valueParts] = text.split(separator);
  const optionKey = s(optionRaw);
  const valueKey = s(valueParts.join(separator));

  if (!optionKey || !valueKey) return null;

  return {
    raw: text,
    optionKey,
    valueKey,
  };
}

function clearFilterParams(params: URLSearchParams) {
  const fixedKeys = [
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

  for (const key of fixedKeys) {
    params.delete(key);
  }

  for (const key of Array.from(params.keys())) {
    if (key.startsWith("f_") || key.startsWith("filter_")) {
      params.delete(key);
    }
  }
}

function readNumberLabel(value: any) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";

  return new Intl.NumberFormat("ar", {
    maximumFractionDigits: 2,
  }).format(n);
}

function readPriceLabel(value: any, currencyLabel: string) {
  const numberLabel = readNumberLabel(value);
  return numberLabel ? `${numberLabel} ${currencyLabel}` : "";
}

function resolveOptionChipLabel(catalogFilters: any, selection: any) {
  const optionKey = normalizePublicKey(selection?.optionKey);
  const valueKey = normalizePublicKey(selection?.valueKey);

  const facets = Array.isArray(catalogFilters?.facets)
    ? catalogFilters.facets
    : [];

  const facet = facets.find(
    (item: any) => normalizePublicKey(item?.key) === optionKey,
  );

  const value = Array.isArray(facet?.values)
    ? facet.values.find(
        (item: any) => normalizePublicKey(item?.key) === valueKey,
      )
    : null;

  const optionLabel = s(facet?.label) || s(selection?.optionKey);
  const valueLabel = s(value?.label) || s(selection?.valueKey);

  return optionLabel && valueLabel
    ? `${optionLabel}: ${valueLabel}`
    : s(selection?.raw) || valueLabel || optionLabel;
}

function resolveCategoryChipLabel(catalogFilters: any, categoryId: any) {
  const id = s(categoryId);

  const categories = Array.isArray(catalogFilters?.categories)
    ? catalogFilters.categories
    : [];

  const category = categories.find((item: any) => s(item?.id) === id);

  return s(category?.label) || id;
}

function resolveSortLabel(sort: any) {
  const value = s(sort);

  if (value === "latest") return "الأحدث";
  if (value === "oldest") return "الأقدم";
  if (value === "price_asc") return "الأقل سعرًا";
  if (value === "price_desc") return "الأعلى سعرًا";

  return "";
}

export default function CategoryScreen({ data, mode }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPending, startTransition] = useTransition();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openCategoryIds, setOpenCategoryIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [optimisticSearch, setOptimisticSearch] = useState<string | null>(null);

  const priceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchParamsText = searchParams.toString();
  const effectiveSearchString = optimisticSearch ?? searchParamsText;

  const effectiveParams = useMemo(
    () => new URLSearchParams(effectiveSearchString),
    [effectiveSearchString],
  );

  const catalogFilters = data?.catalogFilters || null;
  const activeFilters = catalogFilters?.filters || null;
  const priceFacet = catalogFilters?.price || {};
  const currencyLabel = resolveCurrencyLabel(data);

  const rawPriceMin = toFiniteNumber(priceFacet?.min);
  const rawPriceMax = toFiniteNumber(priceFacet?.max);

  const priceBoundMin = Number.isFinite(rawPriceMin ?? NaN)
    ? Math.floor(Number(rawPriceMin))
    : 0;

  const priceBoundMax =
    Number.isFinite(rawPriceMax ?? NaN) && Number(rawPriceMax) > priceBoundMin
      ? Math.ceil(Number(rawPriceMax))
      : priceBoundMin + 1;

  const priceStep = Math.max(
    1,
    Math.round((priceBoundMax - priceBoundMin) / 100),
  );

  const effectiveCategoryIds = useMemo(
    () =>
      getMultiParamValues(effectiveParams, [
        "cat",
        "category",
        "category_id",
        "category_ids",
      ]),
    [effectiveParams],
  );

  const effectiveBrandIds = useMemo(
    () =>
      getMultiParamValues(effectiveParams, [
        "brand",
        "brands",
        "brand_id",
        "brand_ids",
      ]),
    [effectiveParams],
  );

  const effectiveOptionRawValues = useMemo(
    () => getParamValues(effectiveParams, "fo"),
    [effectiveParams],
  );

  const effectivePriceMin = getFirstParamValue(effectiveParams, [
    "price_min",
    "min_price",
    "from",
  ]);

  const effectivePriceMax = getFirstParamValue(effectiveParams, [
    "price_max",
    "max_price",
    "to",
  ]);

  const selectedPriceMinNumber = toFiniteNumber(effectivePriceMin);
  const selectedPriceMaxNumber = toFiniteNumber(effectivePriceMax);

  const normalizedPriceMin =
    selectedPriceMinNumber !== null
      ? clampNumber(selectedPriceMinNumber, priceBoundMin, priceBoundMax)
      : priceBoundMin;

  const normalizedPriceMax =
    selectedPriceMaxNumber !== null
      ? clampNumber(selectedPriceMaxNumber, priceBoundMin, priceBoundMax)
      : priceBoundMax;

  const safePriceRange = useMemo<PriceRange>(() => {
    const min = Math.min(normalizedPriceMin, normalizedPriceMax);
    const max = Math.max(normalizedPriceMin, normalizedPriceMax);

    if (!effectivePriceMin && !effectivePriceMax) {
      return {
        min: priceBoundMin,
        max: priceBoundMax,
      };
    }

    return {
      min,
      max,
    };
  }, [
    effectivePriceMin,
    effectivePriceMax,
    normalizedPriceMin,
    normalizedPriceMax,
    priceBoundMin,
    priceBoundMax,
  ]);

  const [priceRange, setPriceRange] = useState<PriceRange>(() => safePriceRange);

  const effectiveAvailable = hasTruthyParam(effectiveParams, [
    "available",
    "availability",
    "in_stock",
    "stock",
  ]);

  const effectiveDiscounted = hasTruthyParam(effectiveParams, [
    "discounted",
    "discount",
    "sale",
    "offers",
  ]);

  const effectiveSort = s(effectiveParams.get("sort")) || s(activeFilters?.sort);

  useEffect(() => {
    setPriceRange(safePriceRange);
  }, [safePriceRange]);

  useEffect(() => {
    setOptimisticSearch(null);
  }, [searchParamsText]);

  useEffect(() => {
    return () => {
      if (priceTimerRef.current) {
        clearTimeout(priceTimerRef.current);
        priceTimerRef.current = null;
      }
    };
  }, []);

  const currencies = useMemo(() => resolveCurrenciesFromData(data), [data]);
  const tax = useMemo(() => resolveTaxFromData(data), [data]);

  const isTagPage = data?.route === "tag" || data?.category?.is_tag === true;
  const filtersEnabled = Boolean(catalogFilters?.enabled) && !isTagPage;

  const pageTitle =
    s(data?.tag?.title) ||
    s(data?.tag?.name) ||
    s(data?.category?.name) ||
    "المنتجات";

  const pageDescription =
    s(data?.tag?.description) || s(data?.category?.description) || "";

  const storeOptions = useMemo(
    () => parseStoreOptions(data?.options ?? {}),
    [data?.options],
  );

  const quantitySortEnabled = storeOptions?.switches?.quantitySort ?? true;
  const showDashInstead = storeOptions?.switches?.showDashInstead ?? true;

  const rawProducts = useMemo(
    () => (Array.isArray(data?.products) ? data.products : []),
    [data?.products],
  );

  const filteredProductIds: string[] | null = useMemo(() => {
    if (!filtersEnabled || !Array.isArray(catalogFilters?.productIds)) {
      return null;
    }

    return catalogFilters.productIds
      .map((value: unknown) => s(value))
      .filter(Boolean);
  }, [filtersEnabled, catalogFilters?.productIds]);

  const productsSource = useMemo(() => {
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

  const productCards: ProductCardVM[] = useMemo(
    () =>
      productsSource.map((product: any): ProductCardVM =>
        buildProductCard({
          product,
          mode,
          showDashInstead,
          currencies,
          tax,
        }),
      ),
    [productsSource, mode, showDashInstead, currencies, tax],
  );

  const products: ProductCardVM[] = useMemo(
    () =>
      filteredProductIds
        ? productCards
        : sortProductsByStock(productCards, quantitySortEnabled),
    [filteredProductIds, productCards, quantitySortEnabled],
  );

  const resultCount = Number(catalogFilters?.resultCount);
  const totalCount = Number.isFinite(resultCount) ? resultCount : products.length;
  const visibleCount = products.length;

  const facets = useMemo(
    () => (Array.isArray(catalogFilters?.facets) ? catalogFilters.facets : []),
    [catalogFilters?.facets],
  );

  const brandFacets = useMemo(
    () => (Array.isArray(catalogFilters?.brands) ? catalogFilters.brands : []),
    [catalogFilters?.brands],
  );

  const categoryFacets = useMemo(
    () =>
      Array.isArray(catalogFilters?.categories)
        ? catalogFilters.categories
        : [],
    [catalogFilters?.categories],
  );

  const { categoryById, categoryTreeItems } = useMemo(() => {
    const byId = new Map<string, any>();
    const childrenByParent = new Map<string, any[]>();
    const roots: any[] = [];

    for (const category of categoryFacets) {
      const id = s(category?.id);
      if (id) byId.set(id, category);
    }

    for (const category of categoryFacets) {
      const id = s(category?.id);
      const parentId = s(category?.parentId);

      if (!id) continue;

      if (parentId && byId.has(parentId)) {
        const children = childrenByParent.get(parentId) || [];
        children.push(category);
        childrenByParent.set(parentId, children);
      } else {
        roots.push(category);
      }
    }

    const items: CategoryTreeItem[] = [];

    function pushCategoryTree(itemsSource: any[], depth: number) {
      for (const category of itemsSource) {
        const id = s(category?.id);
        if (!id) continue;

        const children = childrenByParent.get(id) || [];

        items.push({
          category,
          depth: Math.min(6, Math.max(0, depth)),
          hasChildren: children.length > 0,
        });

        if (children.length) {
          pushCategoryTree(children, depth + 1);
        }
      }
    }

    pushCategoryTree(roots, 0);

    return {
      categoryById: byId,
      categoryTreeItems: items,
    };
  }, [categoryFacets]);

  useEffect(() => {
    if (!effectiveCategoryIds.length || !categoryById.size) return;

    setOpenCategoryIds((prev) => {
      const next = new Set(prev);
      let changed = false;

      for (const categoryId of effectiveCategoryIds) {
        let parentId = s(categoryById.get(categoryId)?.parentId);
        const seen = new Set<string>();

        while (parentId && categoryById.has(parentId) && !seen.has(parentId)) {
          seen.add(parentId);

          if (!next.has(parentId)) {
            next.add(parentId);
            changed = true;
          }

          parentId = s(categoryById.get(parentId)?.parentId);
        }
      }

      return changed ? next : prev;
    });
  }, [effectiveCategoryIds, categoryById]);

  const visibleCategoryTreeItems = useMemo(() => {
    function isCategoryTreeItemVisible(category: any) {
      let parentId = s(category?.parentId);
      const seen = new Set<string>();

      while (parentId && categoryById.has(parentId) && !seen.has(parentId)) {
        seen.add(parentId);

        if (!openCategoryIds.has(parentId)) {
          return false;
        }

        parentId = s(categoryById.get(parentId)?.parentId);
      }

      return true;
    }

    return categoryTreeItems.filter(({ category }) =>
      isCategoryTreeItemVisible(category),
    );
  }, [categoryTreeItems, categoryById, openCategoryIds]);

  if (!data || !data.category) {
    return (
      <div dir="rtl" className="mk-dcat">
        <div className="mk-dcat__container">
          <div className="mk-dcat__error">تعذر تحميل الصفحة</div>
        </div>
      </div>
    );
  }

  const navigateWithParams = (update: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(effectiveSearchString);
    update(params);

    const nextQuery = params.toString();
    const nextUrl = buildUrl(pathname, params);
    const currentUrl = buildUrl(
      pathname,
      new URLSearchParams(effectiveSearchString),
    );

    if (nextUrl === currentUrl) return;

    setOptimisticSearch(nextQuery);

    startTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  };

  const toggleCategoryOpen = (categoryId: any) => {
    const id = s(categoryId);
    if (!id) return;

    setOpenCategoryIds((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const toggleOption = (facet: any, value: any) => {
    const optionKey = s(facet?.key);
    const valueKey = s(value?.key);
    const nextRaw = `${optionKey}:${valueKey}`;

    if (!optionKey || !valueKey) return;

    navigateWithParams((params) => {
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
  };

  const removeOptionSelection = (selection: any) => {
    const optionKey = s(selection?.optionKey);
    const valueKey = s(selection?.valueKey);

    if (!optionKey || !valueKey) return;

    navigateWithParams((params) => {
      const currentValues = getParamValues(params, "fo").filter(
        (item) => !optionParamMatches(item, optionKey, valueKey),
      );

      setParamValues(params, "fo", currentValues);
    });
  };

  const toggleBrand = (brandId: any) => {
    const id = s(brandId);
    if (!id) return;

    navigateWithParams((params) => {
      const currentValues = getParamValues(params, "brand");
      const exists = currentValues.includes(id);

      const nextValues = exists
        ? currentValues.filter((item) => item !== id)
        : [...currentValues, id];

      setParamValues(params, "brand", nextValues);
    });
  };

  const removeBrand = (brandId: any) => {
    const id = s(brandId);
    if (!id) return;

    navigateWithParams((params) => {
      const nextValues = getParamValues(params, "brand").filter(
        (item) => item !== id,
      );

      setParamValues(params, "brand", nextValues);
    });
  };

  const toggleCategory = (categoryId: any) => {
    const id = s(categoryId);
    if (!id) return;

    navigateWithParams((params) => {
      const currentValues = getParamValues(params, "cat");
      const exists = currentValues.includes(id);

      const nextValues = exists
        ? currentValues.filter((item) => item !== id)
        : [...currentValues, id];

      setParamValues(params, "cat", nextValues);
    });
  };

  const removeCategory = (categoryId: any) => {
    const id = s(categoryId);
    if (!id) return;

    navigateWithParams((params) => {
      const nextValues = getParamValues(params, "cat").filter(
        (item) => item !== id,
      );

      setParamValues(params, "cat", nextValues);
    });
  };

  const setBooleanFilter = (
    key: "available" | "discounted",
    enabled: boolean,
  ) => {
    navigateWithParams((params) => {
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

      if (enabled) {
        params.set(key, "1");
      } else {
        params.delete(key);
      }
    });
  };

  const applyPriceRange = (range = priceRange) => {
    if (priceTimerRef.current) {
      clearTimeout(priceTimerRef.current);
      priceTimerRef.current = null;
    }

    const safeMin = roundPrice(
      clampNumber(Math.min(range.min, range.max), priceBoundMin, priceBoundMax),
    );
    const safeMax = roundPrice(
      clampNumber(Math.max(range.min, range.max), priceBoundMin, priceBoundMax),
    );

    setPriceRange({
      min: safeMin,
      max: safeMax,
    });

    navigateWithParams((params) => {
      params.delete("price_min");
      params.delete("min_price");
      params.delete("from");

      params.delete("price_max");
      params.delete("max_price");
      params.delete("to");

      if (safeMin > priceBoundMin) {
        params.set("price_min", String(safeMin));
      }

      if (safeMax < priceBoundMax) {
        params.set("price_max", String(safeMax));
      }
    });
  };

  const schedulePriceApply = (nextRange: PriceRange) => {
    if (priceTimerRef.current) {
      clearTimeout(priceTimerRef.current);
      priceTimerRef.current = null;
    }

    priceTimerRef.current = setTimeout(() => {
      applyPriceRange(nextRange);
    }, 520);
  };

  const resetPriceRange = () => {
    if (priceTimerRef.current) {
      clearTimeout(priceTimerRef.current);
      priceTimerRef.current = null;
    }

    const nextRange = {
      min: priceBoundMin,
      max: priceBoundMax,
    };

    setPriceRange(nextRange);

    navigateWithParams((params) => {
      params.delete("price_min");
      params.delete("min_price");
      params.delete("from");

      params.delete("price_max");
      params.delete("max_price");
      params.delete("to");
    });
  };

  const setSort = (value: string) => {
    navigateWithParams((params) => {
      if (value) {
        params.set("sort", value);
      } else {
        params.delete("sort");
      }
    });
  };

  const resetFilters = () => {
    if (priceTimerRef.current) {
      clearTimeout(priceTimerRef.current);
      priceTimerRef.current = null;
    }

    navigateWithParams((params) => {
      clearFilterParams(params);
    });
  };

  const priceRangePercentMin =
    ((priceRange.min - priceBoundMin) / (priceBoundMax - priceBoundMin)) * 100;

  const priceRangePercentMax =
    ((priceRange.max - priceBoundMin) / (priceBoundMax - priceBoundMin)) * 100;

  const activeChips: ActiveChip[] = [];

  if (effectivePriceMin) {
    activeChips.push({
      key: "price-min",
      label: `من ${readPriceLabel(effectivePriceMin, currencyLabel)}`,
      onRemove: () =>
        navigateWithParams((params) => {
          params.delete("price_min");
          params.delete("min_price");
          params.delete("from");
        }),
    });
  }

  if (effectivePriceMax) {
    activeChips.push({
      key: "price-max",
      label: `إلى ${readPriceLabel(effectivePriceMax, currencyLabel)}`,
      onRemove: () =>
        navigateWithParams((params) => {
          params.delete("price_max");
          params.delete("max_price");
          params.delete("to");
        }),
    });
  }

  for (const raw of effectiveOptionRawValues) {
    const selection = parseOptionSelection(raw);
    if (!selection) continue;

    const key = `option-${s(selection.optionKey)}-${s(selection.valueKey)}`;

    activeChips.push({
      key,
      label: resolveOptionChipLabel(catalogFilters, selection),
      onRemove: () => removeOptionSelection(selection),
    });
  }

  for (const categoryId of effectiveCategoryIds) {
    activeChips.push({
      key: `category-${s(categoryId)}`,
      label: `القسم: ${resolveCategoryChipLabel(catalogFilters, categoryId)}`,
      onRemove: () => removeCategory(categoryId),
    });
  }

  for (const brandId of effectiveBrandIds) {
    const brand = brandFacets.find((item: any) => s(item?.id) === s(brandId));

    activeChips.push({
      key: `brand-${s(brandId)}`,
      label: `العلامة: ${s(brand?.label) || s(brandId)}`,
      onRemove: () => removeBrand(brandId),
    });
  }

  if (effectiveAvailable) {
    activeChips.push({
      key: "available",
      label: "متوفر فقط",
      onRemove: () => setBooleanFilter("available", false),
    });
  }

  if (effectiveDiscounted) {
    activeChips.push({
      key: "discounted",
      label: "يشمل التخفيضات",
      onRemove: () => setBooleanFilter("discounted", false),
    });
  }

  if (effectiveSort) {
    activeChips.push({
      key: "sort",
      label: `ترتيب: ${resolveSortLabel(effectiveSort)}`,
      onRemove: () => setSort(""),
    });
  }

  const hasActiveFilters = activeChips.length > 0;
  const hasCustomPriceRange =
    priceRange.min > priceBoundMin || priceRange.max < priceBoundMax;

  const tagStyles = isTagPage ? (
    <style jsx global>{`
      .mk-dcat--tag {
        min-height: 62vh;
        background: var(--mk-bg-page, #fff);
      }

      .mk-dcat--tag .mk-dcat__container {
        width: min(100% - 32px, var(--mk-container, 1280px));
        margin-inline: auto;
        padding-block: 34px 54px;
      }

      .mk-dcat__tagHead {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 26px;
        border-bottom: 1px solid rgba(24, 24, 27, 0.08);
        padding-bottom: 18px;
      }

      .mk-dcat__tagMeta {
        min-width: 0;
        display: grid;
        gap: 8px;
      }

      .mk-dcat__tagEyebrow {
        width: fit-content;
        border: 1px solid rgba(24, 24, 27, 0.08);
        border-radius: 999px;
        background: rgba(244, 244, 245, 0.72);
        padding: 6px 10px;
        color: rgba(39, 39, 42, 0.62);
        font-size: 11px;
        font-weight: 900;
        line-height: 1;
      }

      .mk-dcat__title--tag {
        margin: 0 !important;
        color: #111827;
        font-size: clamp(24px, 3vw, 38px);
        font-weight: 950;
        line-height: 1.2;
        letter-spacing: -0.04em;
      }

      .mk-dcat__tagDesc {
        max-width: 680px;
        margin: 0;
        color: rgba(63, 63, 70, 0.72);
        font-size: 14px;
        font-weight: 650;
        line-height: 1.9;
      }

      .mk-dcat__tagCount {
        min-width: 94px;
        height: 70px;
        display: grid;
        place-items: center;
        align-content: center;
        border: 1px solid rgba(24, 24, 27, 0.08);
        border-radius: 20px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.9), #fff),
          rgba(244, 244, 245, 0.7);
        box-shadow: 0 18px 45px rgba(15, 23, 42, 0.06);
      }

      .mk-dcat__tagCount span {
        color: #09090b;
        font-size: 22px;
        font-weight: 950;
        line-height: 1;
      }

      .mk-dcat__tagCount small {
        margin-top: 4px;
        color: rgba(82, 82, 91, 0.72);
        font-size: 11px;
        font-weight: 850;
        line-height: 1;
      }

      .mk-dcat--tag .mk-dcat__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        gap: 22px;
        align-items: start;
      }

      .mk-dcat--tag .mk-dcat__empty {
        min-height: 220px;
        display: grid;
        place-items: center;
        border: 1px dashed rgba(24, 24, 27, 0.14);
        border-radius: 24px;
        background: rgba(250, 250, 250, 0.75);
        color: rgba(63, 63, 70, 0.72);
        font-size: 14px;
        font-weight: 800;
      }

      @media (max-width: 768px) {
        .mk-dcat--tag .mk-dcat__container {
          width: min(100% - 24px, var(--mk-container, 1280px));
          padding-block: 22px 38px;
        }

        .mk-dcat__tagHead {
          align-items: stretch;
          gap: 12px;
          margin-bottom: 18px;
          padding-bottom: 14px;
        }

        .mk-dcat__tagEyebrow {
          padding: 5px 9px;
          font-size: 10.5px;
        }

        .mk-dcat__title--tag {
          font-size: 24px;
        }

        .mk-dcat__tagDesc {
          font-size: 12.5px;
          line-height: 1.8;
        }

        .mk-dcat__tagCount {
          min-width: 72px;
          height: 58px;
          border-radius: 16px;
        }

        .mk-dcat__tagCount span {
          font-size: 18px;
        }

        .mk-dcat--tag .mk-dcat__grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
      }
    `}</style>
  ) : null;

  if (!filtersEnabled) {
    return (
      <div
        dir="rtl"
        className={["mk-dcat", isTagPage ? "mk-dcat--tag" : ""]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="mk-dcat__container">
          {isTagPage ? (
            <div className="mk-dcat__tagHead">
              <div className="mk-dcat__tagMeta">
                <span className="mk-dcat__tagEyebrow">وسم المنتجات</span>

                <h1 className="mk-dcat__title mk-dcat__title--tag">
                  {pageTitle}
                </h1>

                {pageDescription ? (
                  <p className="mk-dcat__tagDesc">{pageDescription}</p>
                ) : null}
              </div>

              <div className="mk-dcat__tagCount">
                <span>{products.length}</span>
                <small>منتج</small>
              </div>
            </div>
          ) : (
            <h1 className="mk-dcat__title">{pageTitle}</h1>
          )}

          {products.length === 0 ? (
            <div className="mk-dcat__empty">
              {isTagPage
                ? "لا توجد منتجات مرتبطة بهذا الوسم"
                : "لا توجد منتجات في هذا القسم"}
            </div>
          ) : (
            <div className="mk-dcat__grid">
              {products.map((product: ProductCardVM, index: number) => (
                <ProductCard
                  key={`${product.id || product.publicNo || index}_${
                    product.publicNo ?? index
                  }`}
                  item={product as any}
                />
              ))}
            </div>
          )}
        </div>

        {tagStyles}
      </div>
    );
  }

  return (
    <div dir="rtl" className="mk-dcat mk-dcat--filters">
      <LoadingOverlay show={isPending} mode="page" />

      <button
        type="button"
        className="mk-dcat-filterOverlay"
        data-open={filtersOpen ? "true" : "false"}
        aria-label="إغلاق الفلاتر"
        onClick={() => setFiltersOpen(false)}
      />

      <div className="mk-dcat__container">
        <div className="mk-dcat-filterHead">
          <div>
            <h1 className="mk-dcat__title mk-dcat-filterHead__title">
              {pageTitle}
            </h1>

            <p className="mk-dcat-filterHead__count">
              عرض <strong>{visibleCount}</strong> من{" "}
              <strong>{totalCount}</strong> منتج
            </p>
          </div>

          <button
            type="button"
            className="mk-dcat-filterBtn"
            onClick={() => setFiltersOpen(true)}
          >
            <span>الفلاتر</span>
            <span className="mk-dcat-filterBtn__icon" aria-hidden="true">
              ≡
            </span>
          </button>
        </div>

        <div className="mk-dcat-toolbar">
          <div className="mk-dcat-toolbar__chips">
            {activeChips.length ? (
              <>
                {activeChips.map((chip) => (
                  <button
                    type="button"
                    key={chip.key}
                    className="mk-dcat-chip"
                    onClick={chip.onRemove}
                  >
                    <span>{chip.label}</span>
                    <b aria-hidden="true">×</b>
                  </button>
                ))}

                <button
                  type="button"
                  className="mk-dcat-chip mk-dcat-chip--clear"
                  onClick={resetFilters}
                >
                  مسح الكل
                </button>
              </>
            ) : (
              <span className="mk-dcat-toolbar__hint">
                استخدم الفلاتر للوصول للمنتج المناسب أسرع
              </span>
            )}
          </div>

          <label className="mk-dcat-sort">
            <span>ترتيب:</span>

            <select
              value={effectiveSort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="">الأحدث</option>
              <option value="price_asc">الأقل سعرًا</option>
              <option value="price_desc">الأعلى سعرًا</option>
              <option value="oldest">الأقدم</option>
            </select>
          </label>
        </div>

        <div className="mk-dcat-layout">
          <section
            className="mk-dcat-products"
            data-pending={isPending ? "true" : "false"}
            aria-busy={isPending ? "true" : "false"}
          >
            {products.length === 0 ? (
              <div className="mk-dcat__empty">
                لا توجد منتجات مطابقة للفلاتر الحالية
              </div>
            ) : (
              <div className="mk-dcat__grid">
                {products.map((product: ProductCardVM, index: number) => (
                  <ProductCard
                    key={`${product.id || product.publicNo || index}_${
                      product.publicNo ?? index
                    }`}
                    item={product as any}
                  />
                ))}
              </div>
            )}
          </section>

          <aside
            className="mk-dcat-filterPanel"
            data-open={filtersOpen ? "true" : "false"}
            aria-label="فلاتر المنتجات"
          >
            <div className="mk-dcat-filterPanel__head">
              <div>
                <h2>تصفية</h2>
                <p>{totalCount} نتيجة مطابقة</p>
              </div>

              <button
                type="button"
                className="mk-dcat-filterPanel__close"
                onClick={() => setFiltersOpen(false)}
                aria-label="إغلاق الفلاتر"
              >
                ×
              </button>
            </div>

            <div className="mk-dcat-filterPanel__actions">
              <button
                type="button"
                className="mk-dcat-filterApply"
                onClick={() => setFiltersOpen(false)}
              >
                تطبيق الفلاتر
              </button>

              <button
                type="button"
                className="mk-dcat-filterReset"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
              >
                إعادة تعيين
              </button>
            </div>

            {categoryTreeItems.length ? (
              <div className="mk-dcat-filterSection mk-dcat-filterSection--categories">
                <div className="mk-dcat-filterSection__head">
                  <h3>الفئات</h3>
                </div>

                <div className="mk-dcat-categoryList" role="tree">
                  {visibleCategoryTreeItems.map(
                    ({ category, depth, hasChildren }) => {
                      const id = s(category?.id);
                      const count = Number(category?.count ?? 0);
                      const active = effectiveCategoryIds.includes(id);
                      const isOpen = openCategoryIds.has(id);

                      return (
                        <div
                          key={id}
                          className={[
                            "mk-dcat-categoryList__row",
                            depth === 0
                              ? "mk-dcat-categoryList__row--root"
                              : "",
                            depth > 0
                              ? "mk-dcat-categoryList__row--child"
                              : "",
                            hasChildren
                              ? "mk-dcat-categoryList__row--parent"
                              : "",
                            active ? "is-active" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          style={{ "--cat-depth": depth } as any}
                          role="treeitem"
                          aria-expanded={hasChildren ? isOpen : undefined}
                        >
                          <button
                            type="button"
                            className="mk-dcat-categoryList__select"
                            aria-pressed={active}
                            onClick={() => toggleCategory(id)}
                          >
                            <span
                              className="mk-dcat-categoryList__check"
                              aria-hidden="true"
                            />

                            <span className="mk-dcat-categoryList__label">
                              {s(category?.label)}
                            </span>
                          </button>

                          <span className="mk-dcat-categoryList__count">
                            {count}
                          </span>

                          <button
                            type="button"
                            className="mk-dcat-categoryList__toggle"
                            disabled={!hasChildren}
                            aria-label={
                              isOpen ? "إخفاء الفروع" : "إظهار الفروع"
                            }
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              toggleCategoryOpen(id);
                            }}
                          >
                            {hasChildren ? (isOpen ? "−" : "+") : ""}
                          </button>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            ) : null}

            <div className="mk-dcat-filterSection mk-dcat-filterSection--price">
              <div className="mk-dcat-filterSection__head mk-dcat-priceHead">
                <h3>السعر</h3>

                <button
                  type="button"
                  className="mk-dcat-priceReset"
                  onClick={resetPriceRange}
                  disabled={!hasCustomPriceRange}
                >
                  إعادة
                </button>
              </div>

              <div className="mk-dcat-priceRange">
                <div className="mk-dcat-priceRange__values">
                  <span>{readPriceLabel(priceRange.min, currencyLabel)}</span>
                  <span>{readPriceLabel(priceRange.max, currencyLabel)}</span>
                </div>

                <div
                  className="mk-dcat-priceSlider"
                  style={
                    {
                      "--price-from": `${priceRangePercentMin}%`,
                      "--price-to": `${priceRangePercentMax}%`,
                    } as any
                  }
                >
                  <div className="mk-dcat-priceSlider__track" />

                  <input
                    type="range"
                    min={priceBoundMin}
                    max={priceBoundMax}
                    step={priceStep}
                    value={priceRange.min}
                    aria-label="أقل سعر"
                    onChange={(event) => {
                      const value = Number(event.target.value);

                      const nextRange = {
                        min: Math.min(value, priceRange.max),
                        max: priceRange.max,
                      };

                      setPriceRange(nextRange);
                      schedulePriceApply(nextRange);
                    }}
                  />

                  <input
                    type="range"
                    min={priceBoundMin}
                    max={priceBoundMax}
                    step={priceStep}
                    value={priceRange.max}
                    aria-label="أعلى سعر"
                    onChange={(event) => {
                      const value = Number(event.target.value);

                      const nextRange = {
                        min: priceRange.min,
                        max: Math.max(value, priceRange.min),
                      };

                      setPriceRange(nextRange);
                      schedulePriceApply(nextRange);
                    }}
                  />
                </div>

                <div className="mk-dcat-priceRange__bounds">
                  <small>{readPriceLabel(priceBoundMin, currencyLabel)}</small>
                  <small>{readPriceLabel(priceBoundMax, currencyLabel)}</small>
                </div>
              </div>
            </div>

            {facets.map((facet: any) => {
              const values = Array.isArray(facet?.values)
                ? facet.values.filter((item: any) => s(item?.label))
                : [];

              if (!values.length) return null;

              const isColor = s(facet?.type).toLowerCase() === "color";

              return (
                <div className="mk-dcat-filterSection" key={s(facet?.key)}>
                  <div className="mk-dcat-filterSection__head">
                    <h3>{s(facet?.label) || "خيارات المنتج"}</h3>
                  </div>

                  <div
                    className={[
                      "mk-dcat-filterValues",
                      isColor ? "mk-dcat-filterValues--colors" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {values.map((value: any) => {
                      const valueKey = s(value?.key);
                      const colorValue = s(value?.label);
                      const active = effectiveOptionRawValues.some((item) =>
                        optionParamMatches(item, facet?.key, valueKey),
                      );

                      const colorStyle =
                        isColor && isCssColorValue(colorValue)
                          ? { "--filter-color": colorValue }
                          : undefined;

                      return (
                        <button
                          type="button"
                          key={valueKey}
                          className={[
                            "mk-dcat-filterValue",
                            active ? "is-active" : "",
                            isColor ? "mk-dcat-filterValue--color" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          style={colorStyle as any}
                          onClick={() => toggleOption(facet, value)}
                        >
                          {isColor ? (
                            <span
                              className="mk-dcat-filterValue__swatch"
                              aria-hidden="true"
                            />
                          ) : null}

                          <span>{s(value?.label)}</span>
                          <small>{Number(value?.count ?? 0)}</small>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {brandFacets.length ? (
              <div className="mk-dcat-filterSection">
                <div className="mk-dcat-filterSection__head">
                  <h3>العلامة التجارية</h3>
                </div>

                <div className="mk-dcat-filterValues">
                  {brandFacets.map((brand: any) => {
                    const id = s(brand?.id);
                    const active = effectiveBrandIds.includes(id);

                    return (
                      <button
                        type="button"
                        key={id}
                        className={[
                          "mk-dcat-filterValue",
                          active ? "is-active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => toggleBrand(id)}
                      >
                        <span>{s(brand?.label)}</span>
                        <small>{Number(brand?.count ?? 0)}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mk-dcat-filterSection">
              <div className="mk-dcat-filterSection__head">
                <h3>التوفر والعروض</h3>
              </div>

              <div className="mk-dcat-filterValues">
                <button
                  type="button"
                  className={[
                    "mk-dcat-filterValue",
                    effectiveAvailable ? "is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() =>
                    setBooleanFilter("available", !effectiveAvailable)
                  }
                >
                  <span>متوفر فقط</span>
                </button>

                <button
                  type="button"
                  className={[
                    "mk-dcat-filterValue",
                    effectiveDiscounted ? "is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() =>
                    setBooleanFilter("discounted", !effectiveDiscounted)
                  }
                >
                  <span>يشمل التخفيضات</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}