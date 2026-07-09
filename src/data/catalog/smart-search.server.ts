// FILE: apps/storefront/src/data/catalog/smart-search.server.ts

import "server-only";

import { getProductsBySearch } from "@/data/catalog/products";
import { controlDb } from "@/data/db/control-db.server";
import { getStoreDb } from "@/data/db/store-db.server";
import {
  getKeywordList,
  getKeywordScopeLists,
  getSmartSearchDefinitionFromThemeOptions,
} from "@/themes/malak/smart-search/config";
import {
  parseSmartSearchKeywordIds,
  parseSmartSearchPath,
  SMART_SEARCH_QUERY,
} from "@/themes/malak/smart-search/query";

type SearchParamsLike =
  | URLSearchParams
  | Record<string, string | string[] | undefined>
  | null
  | undefined;

export type SmartSearchProductsResult = {
  isSmartSearch: boolean;
  productIds: string[];
  keywordLabels: string[];
};

type SelectedSmartSearchKeyword = {
  id: string;
  label: string;
  path: Record<string, string>;
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

function readParam(params: SearchParamsLike, key: string) {
  if (!params) return "";

  if (params instanceof URLSearchParams) return s(params.get(key));

  const raw = params[key];
  return Array.isArray(raw) ? s(raw[0]) : s(raw);
}

function uniqueStrings(values: unknown[]) {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const text = s(value);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }

  return out;
}

function asPath(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const out: Record<string, string> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const cleanKey = s(key);
    const cleanValue = s(item);
    if (cleanKey && cleanValue) out[cleanKey] = cleanValue;
  }
  return out;
}

function exactScope(rowPath: Record<string, string>, expected: Record<string, string>) {
  return Object.entries(expected).every(([key, value]) => rowPath[key] === value);
}

function chunks<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size));
  }
  return out;
}

async function filterCandidatesToCategoryScope(args: {
  storeId: string;
  categoryScopeIds: string[];
  candidateIds: string[];
}) {
  const categoryIds = uniqueStrings(args.categoryScopeIds).slice(0, 250);
  const candidateIds = uniqueStrings(args.candidateIds).slice(0, 500);

  if (!categoryIds.length || !candidateIds.length) return [];

  const db = (await getStoreDb(args.storeId)) as any;
  const matched = new Set<string>();

  for (const candidateChunk of chunks(candidateIds, 180)) {
    const [primary, secondary] = await Promise.all([
      db
        .from("category_products")
        .select("product_id")
        .in("category_id", categoryIds)
        .in("product_id", candidateChunk),
      db
        .from("product_categories")
        .select("product_id")
        .in("category_id", categoryIds)
        .in("product_id", candidateChunk),
    ]);

    for (const row of primary?.data || []) {
      const productId = s(row?.product_id);
      if (productId) matched.add(productId);
    }

    for (const row of secondary?.data || []) {
      const productId = s(row?.product_id);
      if (productId) matched.add(productId);
    }
  }

  return candidateIds.filter((id) => matched.has(id));
}

export async function resolveSmartSearchProductIds(args: {
  storeId: string;
  themeOptions: Record<string, any> | null | undefined;
  themeVersionId: string | null | undefined;
  searchParams?: SearchParamsLike;
  categoryScopeIds: string[];
}): Promise<SmartSearchProductsResult> {
  const instanceId = readParam(args.searchParams, SMART_SEARCH_QUERY.instance);
  const keywordListId = readParam(args.searchParams, SMART_SEARCH_QUERY.keywordList);
  const keywordIds = parseSmartSearchKeywordIds(
    readParam(args.searchParams, SMART_SEARCH_QUERY.keywords),
  );

  if (!instanceId || !keywordListId || !keywordIds.length) {
    return { isSmartSearch: false, productIds: [], keywordLabels: [] };
  }

  const definition = getSmartSearchDefinitionFromThemeOptions(
    args.themeOptions,
    instanceId,
  );
  const keywordList = getKeywordList(definition);
  const scopeLists = getKeywordScopeLists(definition);
  const categoryPath = parseSmartSearchPath(
    readParam(args.searchParams, SMART_SEARCH_QUERY.path),
  );

  if (
    !definition ||
    !keywordList ||
    definition.instanceId !== instanceId ||
    keywordList.id !== keywordListId ||
    !s(args.themeVersionId)
  ) {
    return { isSmartSearch: false, productIds: [], keywordLabels: [] };
  }

  const expectedPath: Record<string, string> = {};
  for (const list of scopeLists) {
    const categoryId = s(categoryPath[list.id]);
    if (!categoryId) {
      return { isSmartSearch: false, productIds: [], keywordLabels: [] };
    }
    expectedPath[list.id] = categoryId;
  }

  const linkedCategoryId =
    expectedPath[scopeLists[scopeLists.length - 1]?.id || ""] || "";

  if (linkedCategoryId && !args.categoryScopeIds.includes(linkedCategoryId)) {
    return { isSmartSearch: false, productIds: [], keywordLabels: [] };
  }

  const control = controlDb() as any;
  const keywordsResult = await control
    .from("store_smart_search_keywords")
    .select("id,keyword,sort_order,category_path")
    .eq("store_id", args.storeId)
    .eq("theme_version_id", s(args.themeVersionId))
    .eq("component_instance_id", definition.instanceId)
    .eq("keyword_list_id", keywordList.id)
    .eq("is_active", true)
    .in("id", keywordIds)
    .contains("category_path", expectedPath)
    .order("sort_order", { ascending: true })
    .limit(12);

  if (keywordsResult.error) {
    console.error("SMART_SEARCH_PRODUCTS_KEYWORDS_FAILED", {
      storeId: args.storeId,
      message: keywordsResult.error.message,
    });
    return { isSmartSearch: true, productIds: [], keywordLabels: [] };
  }

  const selectedKeywords: SelectedSmartSearchKeyword[] = (Array.isArray(
    keywordsResult.data,
  )
    ? keywordsResult.data
    : [])
    .map(
      (row: any): SelectedSmartSearchKeyword => ({
        id: s(row?.id),
        label: s(row?.keyword),
        path: asPath(row?.category_path),
      }),
    )
    .filter(
      (row: SelectedSmartSearchKeyword) =>
        row.id && row.label && exactScope(row.path, expectedPath),
    );

  if (!selectedKeywords.length) {
    return { isSmartSearch: true, productIds: [], keywordLabels: [] };
  }

  const searchRows = await Promise.all(
    selectedKeywords.map(
      async (keyword: SelectedSmartSearchKeyword) => ({
        keyword,
        products: await getProductsBySearch({
          store_id: args.storeId,
          q: keyword.label,
          limit: 80,
        }),
      }),
    ),
  );

  const scores = new Map<string, number>();
  for (const row of searchRows) {
    row.products.forEach((product: any, index: number) => {
      const productId = s(product?.id);
      if (!productId) return;
      const score = 10_000 - index;
      const current = scores.get(productId) ?? 0;
      if (score > current) scores.set(productId, score);
    });
  }

  const candidateIds = Array.from(scores.keys())
    .sort((a, b) => (scores.get(b) ?? 0) - (scores.get(a) ?? 0))
    .slice(0, 500);

  const productIds = await filterCandidatesToCategoryScope({
    storeId: args.storeId,
    categoryScopeIds: args.categoryScopeIds,
    candidateIds,
  });

  return {
    isSmartSearch: true,
    productIds,
    keywordLabels: selectedKeywords.map(
      (keyword: SelectedSmartSearchKeyword) => keyword.label,
    ),
  };
}
