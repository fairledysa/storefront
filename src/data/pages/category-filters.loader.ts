// FILE: apps/storefront/src/data/pages/category-filters.loader.ts
import { unstable_cache } from "next/cache";

import { supabaseAdmin } from "@/data/store/supabase.server";

/* ------------------------- helpers ------------------------ */

function s(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeCacheKey(value: unknown) {
  return s(value).toLowerCase();
}

function looksLikeUuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s(value),
  );
}

function normalizeArabicText(value: unknown) {
  return s(value)
    .normalize("NFKC")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/\u0640/g, "")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .trim();
}

function normalizeArabicDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit: string) =>
      String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)),
    )
    .replace(/[۰-۹]/g, (digit: string) =>
      String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)),
    );
}

function uniqueText(values: unknown[]) {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const text = s(value);
    if (!text || text === "null" || text === "undefined") continue;

    const key = normalizeCacheKey(text);
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(text);
  }

  return out;
}

function uniqueUuid(values: unknown[]) {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const text = s(value);
    if (!text || text === "null" || text === "undefined") continue;
    if (!looksLikeUuid(text)) continue;
    if (seen.has(text)) continue;

    seen.add(text);
    out.push(text);
  }

  return out;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const text = normalizeArabicDigits(s(value));
  if (!text) return null;

  const cleaned = text.replace(/[^\d.]/g, "");
  if (!cleaned) return null;

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizePublicKey(value: unknown, fallback = "item") {
  const raw = normalizeArabicText(value) || fallback;

  const key = raw
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);

  return key || fallback;
}

function normalizeOptionKey(value: unknown, fallback = "option") {
  let key = normalizePublicKey(value, fallback);

  if (key.startsWith("ال") && key.length > 3) {
    key = key.slice(2);
  }

  return key || fallback;
}

function splitFilterValue(value: unknown): string[] {
  const text = s(value);
  if (!text) return [];

  return text
    .split(",")
    .map((item: string) => s(item))
    .filter((item: string) => Boolean(item));
}

function arrayChunks<T>(items: T[], size: number) {
  const out: T[][] = [];
  const safeSize = Math.max(1, Math.floor(size));

  for (let i = 0; i < items.length; i += safeSize) {
    out.push(items.slice(i, i + safeSize));
  }

  return out;
}

/* ------------------------- types ------------------------ */

export type CatalogFilterSearchParams =
  | URLSearchParams
  | Record<string, string | string[] | undefined>
  | null
  | undefined;

export type CategoryFilterSort =
  | ""
  | "latest"
  | "oldest"
  | "price_asc"
  | "price_desc";

export type CategoryOptionFilterSelection = {
  optionKey: string;
  valueKey: string;
  raw: string;
};

export type CategoryPageFilters = {
  enabled: boolean;
  key: string;
  hasActiveFilters: boolean;

  categories: string[];
  brands: string[];

  optionSelections: CategoryOptionFilterSelection[];

  priceMin: number | null;
  priceMax: number | null;

  available: boolean;
  discounted: boolean;

  sort: CategoryFilterSort;

  raw: Record<string, string[]>;
};

export type CategoryFilterFacetValue = {
  key: string;
  label: string;
  count: number;
  active: boolean;
};

export type CategoryFilterFacet = {
  key: string;
  label: string;
  type: string;
  values: CategoryFilterFacetValue[];
};

export type CategoryBrandFacetValue = {
  id: string;
  label: string;
  count: number;
  active: boolean;
};
export type CategoryTreeFacetValue = {
  id: string;
  label: string;
  parentId: string | null;
  depth: number;
  count: number;
  active: boolean;
};
export type CategoryPriceFacet = {
  min: number | null;
  max: number | null;
  selectedMin: number | null;
  selectedMax: number | null;
};

export type CategoryFiltersResult = {
  enabled: boolean;
  filters: CategoryPageFilters;
  productIds: string[] | null;
  resultCount: number;
  visibleCount: number;
  facets: CategoryFilterFacet[];
  categories: CategoryTreeFacetValue[];
  brands: CategoryBrandFacetValue[];
  price: CategoryPriceFacet;
};

/* ------------------------- settings helper ------------------------ */

function readBooleanValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const text = value.trim().toLowerCase();

    if (["true", "1", "yes", "on", "enabled", "active"].includes(text)) {
      return true;
    }

    if (["false", "0", "no", "off", "disabled", "inactive"].includes(text)) {
      return false;
    }
  }

  return null;
}

function findBooleanByKeys(value: unknown, keys: string[]): boolean | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const obj = value as Record<string, unknown>;

  for (const key of keys) {
    const direct = readBooleanValue(obj[key]);
    if (direct !== null) return direct;
  }

  for (const nested of Object.values(obj)) {
    if (!nested || typeof nested !== "object" || Array.isArray(nested)) {
      continue;
    }

    const nestedObj = nested as Record<string, unknown>;

    for (const key of keys) {
      const found = readBooleanValue(nestedObj[key]);
      if (found !== null) return found;
    }
  }

  return null;
}

function findBooleanDeep(
  value: unknown,
  keys: string[],
  depth = 0,
): boolean | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (depth > 6) return null;

  const obj = value as Record<string, unknown>;

  for (const key of keys) {
    const direct = readBooleanValue(obj[key]);
    if (direct !== null) return direct;
  }

  for (const nested of Object.values(obj)) {
    if (!nested || typeof nested !== "object" || Array.isArray(nested)) {
      continue;
    }

    const found = findBooleanDeep(nested, keys, depth + 1);
    if (found !== null) return found;
  }

  return null;
}

export function resolveCategoryFiltersEnabledFromOptions(
  options: Record<string, unknown> | null | undefined,
) {
  const filterSlugWords = [
    "filter",
    "filters",
    "catalog.filter",
    "catalog.filters",
    "catalog_filter",
    "catalog_filters",
    "product.filter",
    "product.filters",
    "product_filter",
    "product_filters",
    "category.filter",
    "category.filters",
    "category_filter",
    "category_filters",
    "فلتر",
    "فلاتر",
    "تصفية",
  ];

  const booleanKeys = [
    "enabled",
    "is_enabled",
    "isEnabled",
    "active",
    "is_active",
    "isActive",
    "value",
    "checked",
    "show",
    "visible",

    "enable_filters",
    "enableFilters",

    "filters_enabled",
    "filtersEnabled",

    "catalog_filters_enabled",
    "catalogFiltersEnabled",

    "product_filters_enabled",
    "productFiltersEnabled",

    "category_filters_enabled",
    "categoryFiltersEnabled",

    "show_filters",
    "showFilters",

    "show_catalog_filters",
    "showCatalogFilters",

    "show_product_filters",
    "showProductFilters",

    "show_category_filters",
    "showCategoryFilters",

    "show_filters_in_category",
    "showFiltersInCategory",

    "show_filters_in_category_page",
    "showFiltersInCategoryPage",

    "filters",
    "catalog_filters",
    "catalogFilters",
    "product_filters",
    "productFilters",
    "category_filters",
    "categoryFilters",
  ];

  const slugLooksLikeFilters = (slug: string) => {
    const slugKey = normalizeCacheKey(slug);

    return filterSlugWords.some((word: string) =>
      slugKey.includes(normalizeCacheKey(word)),
    );
  };

  const readFromObject = (value: unknown): boolean | null => {
    const direct = readBooleanValue(value);
    if (direct !== null) return direct;

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }

    const obj = value as Record<string, unknown>;

    for (const key of booleanKeys) {
      const found = readBooleanValue(obj[key]);
      if (found !== null) return found;
    }

    for (const key of booleanKeys) {
      const nested = obj[key];

      if (nested && typeof nested === "object" && !Array.isArray(nested)) {
        const nestedFound = readFromObject(nested);
        if (nestedFound !== null) return nestedFound;
      }
    }

    return null;
  };

  let explicit: boolean | null = null;

  for (const [slug, value] of Object.entries(options || {})) {
    const isFilterSetting = slugLooksLikeFilters(slug);

    if (isFilterSetting) {
      const found = readFromObject(value);
      if (found !== null) explicit = found;
    }

    const nested = findBooleanByKeys(value, booleanKeys);
    if (nested !== null && isFilterSetting) explicit = nested;
  }

  return explicit ?? false;
}

/* ------------------------- URL filters parser ------------------------ */

function searchParamValues(
  searchParams: CatalogFilterSearchParams,
  key: string,
): string[] {
  if (!searchParams) return [];

  if (searchParams instanceof URLSearchParams) {
    return searchParams.getAll(key).flatMap(splitFilterValue);
  }

  const value = searchParams[key];

  if (Array.isArray(value)) return value.flatMap(splitFilterValue);

  return splitFilterValue(value);
}

function allSearchParamEntries(searchParams: CatalogFilterSearchParams) {
  const entries: Array<[string, string]> = [];

  if (!searchParams) return entries;

  if (searchParams instanceof URLSearchParams) {
    searchParams.forEach((value: string, key: string) => {
      for (const item of splitFilterValue(value)) {
        entries.push([key, item]);
      }
    });

    return entries;
  }

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value.flatMap(splitFilterValue)) {
        entries.push([key, item]);
      }
    } else {
      for (const item of splitFilterValue(value)) {
        entries.push([key, item]);
      }
    }
  }

  return entries;
}

function uniqueFilterValues(values: string[]) {
  return uniqueText(values);
}

function firstFilterNumber(
  searchParams: CatalogFilterSearchParams,
  keys: string[],
): number | null {
  for (const key of keys) {
    const values = searchParamValues(searchParams, key);

    for (const value of values) {
      const n = toNumber(value);
      if (n !== null && n >= 0) return n;
    }
  }

  return null;
}

function filterBool(
  searchParams: CatalogFilterSearchParams,
  keys: string[],
): boolean {
  for (const key of keys) {
    const values = searchParamValues(searchParams, key);

    for (const value of values) {
      const text = s(value).toLowerCase();

      if (["1", "true", "yes", "on", "active", "available"].includes(text)) {
        return true;
      }
    }
  }

  return false;
}

function normalizeFilterSort(value: unknown): CategoryFilterSort {
  const text = s(value).toLowerCase();

  if (text === "latest" || text === "newest" || text === "new") return "latest";
  if (text === "oldest" || text === "old") return "oldest";

  if (text === "price_asc" || text === "price-asc" || text === "low_price") {
    return "price_asc";
  }

  if (text === "price_desc" || text === "price-desc" || text === "high_price") {
    return "price_desc";
  }

  return "";
}

function parseOptionFilterValue(
  value: string,
): CategoryOptionFilterSelection | null {
  const raw = s(value);
  if (!raw) return null;

  const separator = raw.includes(":") ? ":" : raw.includes("=") ? "=" : "";
  if (!separator) return null;

  const [optionRaw, ...valueParts] = raw.split(separator);

  const optionKey = normalizeOptionKey(optionRaw);
  const valueKey = normalizePublicKey(valueParts.join(separator));

  if (!optionKey || !valueKey) return null;

  return {
    optionKey,
    valueKey,
    raw,
  };
}

function parseDynamicOptionSelections(
  searchParams: CatalogFilterSearchParams,
  raw: Record<string, string[]>,
) {
  const selections: CategoryOptionFilterSelection[] = [];
  const seen = new Set<string>();

  const add = (item: CategoryOptionFilterSelection | null) => {
    if (!item) return;

    const key = `${item.optionKey}:${item.valueKey}`;
    if (seen.has(key)) return;

    seen.add(key);
    selections.push(item);
  };

  for (const key of ["fo", "filter_option", "filterOption"]) {
    const values = uniqueFilterValues(searchParamValues(searchParams, key));

    if (values.length) raw[key] = values;

    for (const value of values) {
      add(parseOptionFilterValue(value));
    }
  }

  for (const [key, value] of allSearchParamEntries(searchParams)) {
    const cleanKey = s(key);

    if (cleanKey.startsWith("f_")) {
      const optionKey = normalizeOptionKey(cleanKey.slice(2));
      const valueKey = normalizePublicKey(value);

      if (optionKey && valueKey) {
        raw[cleanKey] = uniqueFilterValues([...(raw[cleanKey] || []), value]);

        add({
          optionKey,
          valueKey,
          raw: `${optionKey}:${valueKey}`,
        });
      }
    }

    if (cleanKey.startsWith("filter_")) {
      const optionKey = normalizeOptionKey(cleanKey.slice("filter_".length));
      const valueKey = normalizePublicKey(value);

      if (optionKey && valueKey) {
        raw[cleanKey] = uniqueFilterValues([...(raw[cleanKey] || []), value]);

        add({
          optionKey,
          valueKey,
          raw: `${optionKey}:${valueKey}`,
        });
      }
    }
  }

  return selections;
}

function makeFilterKey(filters: Omit<CategoryPageFilters, "key">) {
  return JSON.stringify({
    enabled: filters.enabled,
    categories: filters.categories,
    brands: filters.brands,
    optionSelections: filters.optionSelections.map(
      (item: CategoryOptionFilterSelection) => [item.optionKey, item.valueKey],
    ),
    priceMin: filters.priceMin,
    priceMax: filters.priceMax,
    available: filters.available,
    discounted: filters.discounted,
    sort: filters.sort,
  });
}

export function normalizeCategoryPageFilters(args: {
  searchParams?: CatalogFilterSearchParams;
  enabled: boolean;
}): CategoryPageFilters {
  const raw: Record<string, string[]> = {};
  const searchParams = args.enabled ? args.searchParams : null;

  const read = (keys: string[]) => {
    const values = uniqueFilterValues(
      keys.flatMap((key: string) => searchParamValues(searchParams, key)),
    );

    for (const key of keys) {
      const own = uniqueFilterValues(searchParamValues(searchParams, key));
      if (own.length) raw[key] = own;
    }

    return values;
  };

  const categories = uniqueUuid(
    read(["cat", "category", "category_id", "category_ids"]),
  );

  const brands = uniqueUuid(read(["brand", "brands", "brand_id", "brand_ids"]));

  const optionSelections = parseDynamicOptionSelections(searchParams, raw);

  const priceMin = firstFilterNumber(searchParams, [
    "price_min",
    "min_price",
    "from",
  ]);

  const priceMax = firstFilterNumber(searchParams, [
    "price_max",
    "max_price",
    "to",
  ]);

  const available = filterBool(searchParams, [
    "available",
    "availability",
    "in_stock",
    "stock",
  ]);

  const discounted = filterBool(searchParams, [
    "discounted",
    "discount",
    "sale",
    "offers",
  ]);

  const sort = normalizeFilterSort(searchParamValues(searchParams, "sort")[0]);

  const withoutKey = {
    enabled: args.enabled,
    hasActiveFilters: false,
    categories,
    brands,
    optionSelections,
    priceMin,
    priceMax,
    available,
    discounted,
    sort,
    raw,
  };

  const hasActiveFilters =
    args.enabled &&
    (categories.length > 0 ||
      brands.length > 0 ||
      optionSelections.length > 0 ||
      priceMin !== null ||
      priceMax !== null ||
      available ||
      discounted ||
      Boolean(sort));

  const key = makeFilterKey({
    ...withoutKey,
    hasActiveFilters,
  });

  return {
    ...withoutKey,
    hasActiveFilters,
    key,
  };
}

/* ------------------------- category scope ------------------------ */

async function loadCategoryScopeIdsRaw(args: {
  store_id: string;
  category_id: string;
}) {
  const storeId = s(args.store_id);
  const categoryId = s(args.category_id);

  if (!storeId || !categoryId) return [];

  const sb: any = supabaseAdmin();

  const { data, error } = await sb
    .from("categories")
    .select("id,parent_id,status")
    .eq("store_id", storeId)
    .eq("status", "active");

  if (error || !Array.isArray(data)) return [categoryId];

  const childrenByParent = new Map<string, string[]>();

  for (const row of data as any[]) {
    const id = s(row?.id);
    const parentId = s(row?.parent_id);
    if (!id || !parentId) continue;

    const arr = childrenByParent.get(parentId) || [];
    arr.push(id);
    childrenByParent.set(parentId, arr);
  }

  const out: string[] = [];
  const queue: string[] = [categoryId];
  const seen = new Set<string>();

  while (queue.length) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;

    seen.add(current);
    out.push(current);

    for (const childId of childrenByParent.get(current) || []) {
      queue.push(childId);
    }
  }

  return out.length ? out : [categoryId];
}

const categoryScopeCache = new Map<string, () => Promise<string[]>>();

function loadCategoryScopeIds(args: { store_id: string; category_id: string }) {
  const storeId = s(args.store_id);
  const categoryId = s(args.category_id);
  const key = `${storeId}:${categoryId}`;

  let fn = categoryScopeCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        loadCategoryScopeIdsRaw({
          store_id: storeId,
          category_id: categoryId,
        }),
      ["category-filter-scope-ids", storeId, categoryId],
      {
        revalidate: 120,
      },
    );

    categoryScopeCache.set(key, fn);
  }

  return fn();
}

/* ------------------------- indexed product ids ------------------------ */

const VISIBLE_PRODUCT_STATUSES = ["active", "sale", "published"];

function optionSelectionGroups(filters: CategoryPageFilters) {
  const map = new Map<string, Set<string>>();

  for (const item of filters.optionSelections || []) {
    const optionKey = normalizeOptionKey(item.optionKey);
    const valueKey = normalizePublicKey(item.valueKey);

    if (!optionKey || !valueKey) continue;

    const set = map.get(optionKey) || new Set<string>();
    set.add(valueKey);
    map.set(optionKey, set);
  }

  return Array.from(map.entries()).map(([optionKey, values]) => ({
    optionKey,
    valueKeys: Array.from(values),
  }));
}

 
 async function resolveOptionFilteredProductIds(args: {
  store_id: string;
  filters: CategoryPageFilters;
}) {
  const storeId = s(args.store_id);
  const groups = optionSelectionGroups(args.filters);

  if (!storeId || !groups.length) return null;

  const sb: any = supabaseAdmin();

  let currentSet: Set<string> | null = null;

  for (const group of groups) {
    let query: any = sb
      .from("product_filter_option_index")
      .select("product_id")
      .eq("store_id", storeId)
      .eq("option_key", group.optionKey);

    if (group.valueKeys.length === 1) {
      query = query.eq("value_key", group.valueKeys[0]);
    } else {
      query = query.in("value_key", group.valueKeys);
    }

    const { data, error } = await query.limit(20000);

    if (error) throw new Error(error.message);

    const ids = new Set<string>(
      (Array.isArray(data) ? data : [])
        .map((row: any) => s(row?.product_id))
        .filter((value: string) => Boolean(value)),
    );

    if (currentSet === null) {
      currentSet = ids;
    } else {
      const next = new Set<string>();

      for (const productId of Array.from(currentSet)) {
        if (ids.has(productId)) next.add(productId);
      }

      currentSet = next;
    }

    if (!currentSet.size) break;
  }

  return currentSet ? Array.from(currentSet) : null;
}

async function queryIndexedProductIds(args: {
  store_id: string;
  categoryIds: string[];
  filters: CategoryPageFilters;
  limit: number;
  includeOptionSelections: boolean;
}) {
  const storeId = s(args.store_id);
  const categoryIds = uniqueUuid(args.categoryIds);
  const limit = Math.max(1, Math.min(5000, Math.floor(Number(args.limit) || 60)));
  const filters = args.filters;

  if (!storeId) {
    return {
      ids: [] as string[],
      total: 0,
    };
  }

  const optionGroups = optionSelectionGroups(filters);

  const optionProductIds =
    args.includeOptionSelections && optionGroups.length
      ? await resolveOptionFilteredProductIds({
          store_id: storeId,
          filters,
        })
      : null;

  if (
    args.includeOptionSelections &&
    optionGroups.length &&
    optionProductIds?.length === 0
  ) {
    return {
      ids: [] as string[],
      total: 0,
    };
  }

  const sb: any = supabaseAdmin();

  let query: any = sb
    .from("product_filter_index")
    .select("product_id,price_min,price_max,updated_at", { count: "exact" })
    .eq("store_id", storeId)
    .in("status", VISIBLE_PRODUCT_STATUSES)
    .contains("channels", ["web"]);

  if (categoryIds.length) {
    query = query.overlaps("category_ids", categoryIds);
  }

  if (filters.categories.length) {
    query = query.overlaps("category_ids", uniqueUuid(filters.categories));
  }

  if (filters.brands.length) {
    query = query.in("brand_id", uniqueUuid(filters.brands));
  }

  if (optionProductIds?.length) {
    query = query.in("product_id", optionProductIds);
  }

  if (filters.priceMin !== null) {
    query = query.gte("price_max", filters.priceMin);
  }

  if (filters.priceMax !== null) {
    query = query.lte("price_min", filters.priceMax);
  }

  if (filters.available) {
    query = query.eq("in_stock", true);
  }

  if (filters.discounted) {
    query = query.eq("discounted", true);
  }

  if (filters.sort === "price_asc") {
    query = query.order("price_min", { ascending: true, nullsFirst: false });
  } else if (filters.sort === "price_desc") {
    query = query.order("price_min", { ascending: false, nullsFirst: false });
  } else if (filters.sort === "oldest") {
    query = query.order("updated_at", { ascending: true });
  } else {
    query = query.order("updated_at", { ascending: false });
  }

  const { data, error, count } = await query.range(0, limit - 1);

  if (error) throw new Error(error.message);

  const ids = (Array.isArray(data) ? (data as any[]) : [])
    .map((row: any) => s(row?.product_id))
    .filter((value: string) => Boolean(value));

  return {
    ids,
    total: Number(count ?? ids.length),
  };
}

/* ------------------------- facets ------------------------ */

async function loadOptionFacetRows(args: {
  store_id: string;
  productIds: string[];
}) {
  const storeId = s(args.store_id);
  const ids = uniqueUuid(args.productIds);

  if (!storeId || !ids.length) return [];

  const sb: any = supabaseAdmin();
  const rows: any[] = [];

  for (const chunk of arrayChunks(ids, 450)) {
    const { data, error } = await sb
      .from("product_filter_option_index")
      .select(
        "product_id,option_key,option_label,option_type,value_key,value_label,sort_order",
      )
      .eq("store_id", storeId)
      .in("product_id", chunk)
      .limit(10000);

    if (error) throw new Error(error.message);

    if (Array.isArray(data)) rows.push(...(data as any[]));
  }

  return rows;
}

function cleanFacetLabel(value: unknown) {
  const label = s(value);
  if (!label) return "";

  return label.replace(/^ال(?=.+)/, "");
}

function buildOptionFacets(args: {
  rows: any[];
  active: CategoryPageFilters;
}): CategoryFilterFacet[] {
  const selected = new Set(
    (args.active.optionSelections || []).map(
      (item: CategoryOptionFilterSelection) =>
        `${normalizeOptionKey(item.optionKey)}:${normalizePublicKey(
          item.valueKey,
        )}`,
    ),
  );

  const optionMap = new Map<
    string,
    {
      key: string;
      label: string;
      type: string;
      sort: number;
      values: Map<
        string,
        {
          key: string;
          label: string;
          count: number;
          productIds: Set<string>;
          sort: number;
        }
      >;
    }
  >();

  for (const row of args.rows || []) {
    const productId = s(row?.product_id);
    const optionLabel = s(row?.option_label);
    const valueLabel = s(row?.value_label);

    if (!productId || !optionLabel || !valueLabel) continue;

    const optionKey = normalizeOptionKey(optionLabel, "option");
    const valueKey = normalizePublicKey(valueLabel, "value");

    const sortOrder = Number.isFinite(Number(row?.sort_order))
      ? Number(row.sort_order)
      : 0;

    const option = optionMap.get(optionKey) || {
      key: optionKey,
      label: cleanFacetLabel(optionLabel),
      type: s(row?.option_type) || "text",
      sort: sortOrder,
      values: new Map(),
    };

    option.sort = Math.min(option.sort, sortOrder);

    const currentValue = option.values.get(valueKey) || {
      key: valueKey,
      label: valueLabel,
      count: 0,
      productIds: new Set<string>(),
      sort: sortOrder,
    };

    currentValue.productIds.add(productId);
    currentValue.count = currentValue.productIds.size;
    currentValue.sort = Math.min(currentValue.sort, sortOrder);

    option.values.set(valueKey, currentValue);
    optionMap.set(optionKey, option);
  }

  return Array.from(optionMap.values())
    .map((option) => ({
      key: option.key,
      label: option.label || option.key,
      type: option.type,
      values: Array.from(option.values.values())
        .map((value) => ({
          key: value.key,
          label: value.label,
          count: value.count,
          active: selected.has(`${option.key}:${value.key}`),
        }))
        .sort((a, b) => {
          const an = Number(a.label);
          const bn = Number(b.label);

          if (Number.isFinite(an) && Number.isFinite(bn)) {
            return an - bn;
          }

          return a.label.localeCompare(b.label, "ar");
        }),
    }))
    .filter((option) => option.values.length > 0)
    .sort((a, b) => a.label.localeCompare(b.label, "ar"));
}

async function loadBrandFacetRows(args: {
  store_id: string;
  productIds: string[];
}) {
  const storeId = s(args.store_id);
  const ids = uniqueUuid(args.productIds);

  if (!storeId || !ids.length) return [];

  const sb: any = supabaseAdmin();
  const rows: any[] = [];

  for (const chunk of arrayChunks(ids, 450)) {
    const { data, error } = await sb
      .from("product_filter_index")
      .select("product_id,brand_id,brand_name")
      .eq("store_id", storeId)
      .in("product_id", chunk)
      .limit(5000);

    if (error) throw new Error(error.message);

    if (Array.isArray(data)) rows.push(...(data as any[]));
  }

  return rows;
}

function buildBrandFacets(args: {
  rows: any[];
  active: CategoryPageFilters;
}): CategoryBrandFacetValue[] {
  const active = new Set(uniqueUuid(args.active.brands));

  const map = new Map<
    string,
    {
      id: string;
      label: string;
      productIds: Set<string>;
    }
  >();

  for (const row of args.rows || []) {
    const brandId = s(row?.brand_id);
    const label = s(row?.brand_name);

    if (!brandId || !label) continue;

    const item = map.get(brandId) || {
      id: brandId,
      label,
      productIds: new Set<string>(),
    };

    const productId = s(row?.product_id);
    if (productId) item.productIds.add(productId);

    map.set(brandId, item);
  }

  return Array.from(map.values())
    .map((item) => ({
      id: item.id,
      label: item.label,
      count: item.productIds.size,
      active: active.has(item.id),
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label, "ar");
    });
}
async function loadCategoryFacets(args: {
  store_id: string;
  categoryIds: string[];
  active: CategoryPageFilters;
}): Promise<CategoryTreeFacetValue[]> {
  const storeId = s(args.store_id);
  const scopeIds = uniqueUuid(args.categoryIds);

  if (!storeId || !scopeIds.length) return [];

  const sb: any = supabaseAdmin();

  const { data: categoriesData, error: categoriesError } = await sb
    .from("categories")
    .select("id,name,parent_id,sort_order")
    .eq("store_id", storeId)
    .eq("status", "active")
    .in("id", scopeIds)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (categoriesError) throw new Error(categoriesError.message);

  const categories = Array.isArray(categoriesData)
    ? (categoriesData as any[])
    : [];

  if (!categories.length) return [];

  const categoryMap = new Map<string, any>();
  const childrenByParent = new Map<string, any[]>();

  for (const category of categories) {
    const id = s(category?.id);
    if (!id) continue;
    categoryMap.set(id, category);
  }

  for (const category of categories) {
    const id = s(category?.id);
    const parentId = s(category?.parent_id);

    if (!id || !parentId || !categoryMap.has(parentId)) continue;

    const arr = childrenByParent.get(parentId) || [];
    arr.push(category);
    childrenByParent.set(parentId, arr);
  }

  const directCountMap = new Map<string, Set<string>>();
  const allowedCategoryIds = new Set(scopeIds);

  const { data: indexRows, error: indexError } = await sb
    .from("product_filter_index")
    .select("product_id,category_ids")
    .eq("store_id", storeId)
    .in("status", VISIBLE_PRODUCT_STATUSES)
    .contains("channels", ["web"])
    .overlaps("category_ids", scopeIds)
    .limit(20000);

  if (indexError) throw new Error(indexError.message);

  for (const row of Array.isArray(indexRows) ? (indexRows as any[]) : []) {
    const productId = s(row?.product_id);
    const rowCategoryIds = Array.isArray(row?.category_ids)
      ? row.category_ids
      : [];

    if (!productId) continue;

    for (const categoryIdRaw of rowCategoryIds) {
      const categoryId = s(categoryIdRaw);
      if (!allowedCategoryIds.has(categoryId)) continue;

      const set = directCountMap.get(categoryId) || new Set<string>();
      set.add(productId);
      directCountMap.set(categoryId, set);
    }
  }

  const aggregateCache = new Map<string, Set<string>>();

  function collectProductsForCategory(categoryId: string): Set<string> {
    const cached = aggregateCache.get(categoryId);
    if (cached) return cached;

    const out = new Set<string>();

    for (const productId of directCountMap.get(categoryId) || []) {
      out.add(productId);
    }

    for (const child of childrenByParent.get(categoryId) || []) {
      const childId = s(child?.id);
      if (!childId) continue;

      for (const productId of collectProductsForCategory(childId)) {
        out.add(productId);
      }
    }

    aggregateCache.set(categoryId, out);
    return out;
  }

  const activeCategories = new Set(uniqueUuid(args.active.categories));

  function getDepth(category: any) {
    let depth = 0;
    let parentId = s(category?.parent_id);
    const seen = new Set<string>();

    while (parentId && categoryMap.has(parentId) && !seen.has(parentId)) {
      seen.add(parentId);
      depth += 1;
      parentId = s(categoryMap.get(parentId)?.parent_id);
      if (depth >= 6) break;
    }

    return depth;
  }

  const roots = categories.filter((category: any) => {
    const parentId = s(category?.parent_id);
    return !parentId || !categoryMap.has(parentId);
  });

  const out: CategoryTreeFacetValue[] = [];

  function pushCategory(category: any) {
    const id = s(category?.id);
    if (!id) return;

    const count = collectProductsForCategory(id).size;
    const children = childrenByParent.get(id) || [];

    if (count > 0 || activeCategories.has(id)) {
      out.push({
        id,
        label: s(category?.name) || "قسم",
        parentId: s(category?.parent_id) || null,
        depth: Math.min(6, Math.max(0, getDepth(category))),
        count,
        active: activeCategories.has(id),
      });
    }

    for (const child of children) {
      pushCategory(child);
    }
  }

  for (const root of roots) {
    pushCategory(root);
  }

  return out;
}
async function loadPriceFacet(args: {
  store_id: string;
  productIds: string[];
  active: CategoryPageFilters;
}): Promise<CategoryPriceFacet> {
  const storeId = s(args.store_id);
  const ids = uniqueUuid(args.productIds);

  if (!storeId || !ids.length) {
    return {
      min: null,
      max: null,
      selectedMin: args.active.priceMin,
      selectedMax: args.active.priceMax,
    };
  }

  const sb: any = supabaseAdmin();
  const prices: number[] = [];

  for (const chunk of arrayChunks(ids, 450)) {
    const { data, error } = await sb
      .from("product_filter_index")
      .select("price_min,price_max")
      .eq("store_id", storeId)
      .in("product_id", chunk)
      .limit(5000);

    if (error) throw new Error(error.message);

    for (const row of Array.isArray(data) ? (data as any[]) : []) {
      const min = toNumber(row?.price_min);
      const max = toNumber(row?.price_max);

      if (min !== null) prices.push(min);
      if (max !== null) prices.push(max);
    }
  }

  return {
    min: prices.length ? Math.min(...prices) : null,
    max: prices.length ? Math.max(...prices) : null,
    selectedMin: args.active.priceMin,
    selectedMax: args.active.priceMax,
  };
}

/* ------------------------- catalog filters settings ------------------------ */

const CATALOG_FILTERS_SETTINGS_CACHE_VERSION = "v3-catalog-dot-filters";

const CATALOG_FILTERS_SETTING_SLUGS = [
  "catalog.filters",
  "product.filters",
  "category.filters",

  "catalog_filters",
  "product_filters",
  "category_filters",

  "store.catalog.filters",
  "store.product.filters",
  "store.category.filters",

  "store.catalog_filters",
  "store.product_filters",
  "store.category_filters",

  "options:catalog.filters",
  "options:product.filters",
  "options:category.filters",

  "options:catalog_filters",
  "options:product_filters",
  "options:category_filters",
];

function catalogFiltersEnabledFromSetting(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const mainEnabled = findBooleanDeep(value, [
    "enabled",
    "is_enabled",
    "isEnabled",
    "active",
    "is_active",
    "isActive",

    "enable_filters",
    "enableFilters",

    "filters_enabled",
    "filtersEnabled",

    "catalog_filters_enabled",
    "catalogFiltersEnabled",

    "product_filters_enabled",
    "productFiltersEnabled",
  ]);

  const categoryEnabled = findBooleanDeep(value, [
    "show_in_category",
    "showInCategory",

    "show_in_categories",
    "showInCategories",

    "show_in_category_page",
    "showInCategoryPage",

    "show_filters_in_category",
    "showFiltersInCategory",

    "show_filters_in_category_page",
    "showFiltersInCategoryPage",

    "category_enabled",
    "categoryEnabled",

    "categories_enabled",
    "categoriesEnabled",
  ]);

  if (mainEnabled === false) return false;
  if (categoryEnabled === false) return false;

  if (mainEnabled === true) return true;
  if (categoryEnabled === true) return true;

  return false;
}

async function loadCatalogFiltersSettingRaw(store_id: string) {
  const storeId = s(store_id);
  if (!storeId) return null;

  const sb: any = supabaseAdmin();

  const { data, error } = await sb
    .from("store_settings")
    .select("slug,value")
    .eq("store_id", storeId)
    .in("slug", CATALOG_FILTERS_SETTING_SLUGS);

  if (error || !Array.isArray(data)) {
    return null;
  }

  const rows = data as any[];

  for (const slug of CATALOG_FILTERS_SETTING_SLUGS) {
    const row = rows.find((item: any) => s(item?.slug) === slug);
    if (row) return row?.value ?? null;
  }

  return rows[0]?.value ?? null;
}

const catalogFiltersSettingCache = new Map<string, () => Promise<any>>();

function loadCatalogFiltersSetting(store_id: string) {
  const storeId = s(store_id);
  const key = `${CATALOG_FILTERS_SETTINGS_CACHE_VERSION}:${normalizeCacheKey(
    storeId,
  )}`;

  let fn = catalogFiltersSettingCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () => loadCatalogFiltersSettingRaw(storeId),
      [
        "catalog-filters-setting",
        CATALOG_FILTERS_SETTINGS_CACHE_VERSION,
        storeId,
      ],
      {
        revalidate: 30,
      },
    );

    catalogFiltersSettingCache.set(key, fn);
  }

  return fn();
}

export async function loadCategoryFiltersForPage(args: {
  store_id: string;
  category_id: string;
  searchParams?: CatalogFilterSearchParams;
  limit?: number;
}): Promise<CategoryFiltersResult | null> {
  const storeId = s(args.store_id);
  const categoryId = s(args.category_id);

  if (!storeId || !categoryId) return null;

  const setting = await loadCatalogFiltersSetting(storeId);
  const enabled = catalogFiltersEnabledFromSetting(setting);

  if (!enabled) return null;

  return loadCategoryFilters({
    store_id: storeId,
    category_id: categoryId,
    searchParams: args.searchParams,
    enabled: true,
    limit: args.limit ?? 60,
  });
}

/* ------------------------- public loader ------------------------ */

export async function loadCategoryFilters(args: {
  store_id: string;
  category_id: string;
  searchParams?: CatalogFilterSearchParams;
  enabled: boolean;
  limit?: number;
}): Promise<CategoryFiltersResult> {
  const storeId = s(args.store_id);
  const categoryId = s(args.category_id);
  const enabled = Boolean(args.enabled && storeId && categoryId);

  const filters = normalizeCategoryPageFilters({
    searchParams: args.searchParams,
    enabled,
  });

  if (!enabled) {
 return {
  enabled: false,
  filters,
  productIds: null,
  resultCount: 0,
  visibleCount: 0,
  facets: [],
  categories: [],
  brands: [],
  price: {
    min: null,
    max: null,
    selectedMin: null,
    selectedMax: null,
  },
};
  }

  const categoryIds = await loadCategoryScopeIds({
    store_id: storeId,
    category_id: categoryId,
  });
   const baseForFacets = await queryIndexedProductIds({
    store_id: storeId,
    categoryIds,
    filters: {
      ...filters,
      optionSelections: [],
      key: "",
    },
    limit: 2000,
    includeOptionSelections: false,
  });

  const priceBoundsBase = await queryIndexedProductIds({
    store_id: storeId,
    categoryIds,
    filters: {
      ...filters,
      optionSelections: [],
      priceMin: null,
      priceMax: null,
      key: "",
    },
    limit: 2000,
    includeOptionSelections: false,
  });

  const productResult = filters.hasActiveFilters
    ? await queryIndexedProductIds({
        store_id: storeId,
        categoryIds,
        filters,
        limit: args.limit ?? 60,
        includeOptionSelections: true,
      })
    : {
        ids: null as string[] | null,
        total: baseForFacets.total,
      };

  const [optionRows, categoryFacets, brandRows, price] = await Promise.all([
    loadOptionFacetRows({
      store_id: storeId,
      productIds: baseForFacets.ids,
    }),
    loadCategoryFacets({
      store_id: storeId,
      categoryIds,
      active: filters,
    }),
    loadBrandFacetRows({
      store_id: storeId,
      productIds: baseForFacets.ids,
    }),
    loadPriceFacet({
      store_id: storeId,
      productIds: priceBoundsBase.ids,
      active: filters,
    }),
  ]);

  const productIds = Array.isArray(productResult.ids) ? productResult.ids : null;

  return {
    enabled: true,
    filters,
    productIds,
    resultCount: productResult.total,
    visibleCount: productIds ? productIds.length : 0,
    facets: buildOptionFacets({
      rows: optionRows,
      active: filters,
    }),
    categories: categoryFacets,
    brands: buildBrandFacets({
      rows: brandRows,
      active: filters,
    }),
    price,
  };
}
