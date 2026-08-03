// FILE: apps/storefront/src/app/(store)/api/search/route.ts

import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

import { cacheKey } from "@/data/cache/cache-keys";
import { redisCachedWithMeta } from "@/data/cache/redis-cache.server";
import { getProductsBySearch } from "@/data/catalog/products";
import { getStoreDb } from "@/data/db/store-db.server";
import { getSeoUrlMode, type SeoUrlMode } from "@/data/store/settings";
import { buildProductHrefFromRecord } from "@/lib/seo/build-store-href";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEARCH_LIMIT = 10;
const DB_FETCH_LIMIT = 70;
const TOKEN_FETCH_LIMIT = 30;
const VOCAB_CACHE_TTL = 120_000;
const CURRENCY_CACHE_TTL = 120_000;
const SEARCH_REDIS_TTL_SECONDS = 90;

type TimedCache<T> = {
  expiresAt: number;
  value: T;
};

type SearchIndexRow = {
  product_id: string;
  title: string | null;
  description: string | null;
  href: string | null;
  image_url: string | null;
  price: number | string | null;
  compare_price: number | string | null;
  currency: string | null;
  search_text: string | null;
  search_text_normalized: string | null;
  suggestion_terms: string[] | null;
  suggestion_terms_text: string | null;
  updated_at: string | null;
};

type StoreCurrencyDisplay = {
  code: string;
  symbol: string;
  label: string;
  decimals: number | null;
};

type SearchApiResponse = {
  suggestions: string[];
  didYouMean: { query: string; confidence: number } | null;
  items: any[];
};

type RankedSearchRow = {
  row: SearchIndexRow;
  score: number;
};

const vocabularyCache = new Map<string, TimedCache<Map<string, string>>>();
const currencyCache = new Map<string, TimedCache<StoreCurrencyDisplay | null>>();

function nowMs() {
  return Date.now();
}

function getCached<T>(map: Map<string, TimedCache<T>>, key: string): T | null {
  const hit = map.get(key);
  if (!hit) return null;

  if (hit.expiresAt <= nowMs()) {
    map.delete(key);
    return null;
  }

  return hit.value;
}

function setCached<T>(
  map: Map<string, TimedCache<T>>,
  key: string,
  value: T,
  ttl: number,
) {
  map.set(key, {
    value,
    expiresAt: nowMs() + ttl,
  });
}

function s(value: unknown) {
  return String(value ?? "").trim();
}

function hashText(value: string) {
  return createHash("sha1").update(value).digest("hex");
}

function firstDefined(...values: any[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return undefined;
}

function pickText(...values: unknown[]) {
  for (const value of values) {
    const text = s(value);
    if (text) return text;
  }

  return "";
}

function cleanCurrencyCode(value: any, fallback = "SAR") {
  const code = s(value).toUpperCase();
  return code || fallback;
}

function clampDecimals(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;

  const n = Number(value);
  if (!Number.isFinite(n)) return null;

  return Math.max(0, Math.min(4, Math.floor(n)));
}

function normalizeArabic(value: unknown) {
  return s(value)
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ـ/g, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDbSearchTerm(value: unknown) {
  return s(value)
    .replace(/[%_(),]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 90)
    .trim();
}

function tokenize(value: unknown) {
  const normalized = normalizeArabic(value);

  return Array.from(
    new Set(
      normalized
        .split(" ")
        .map((x) => x.trim())
        .filter((x) => x.length >= 2),
    ),
  ).slice(0, 6);
}

function splitRawTokens(value: unknown) {
  return normalizeDbSearchTerm(value)
    .split(/\s+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatPrice(
  price: number | null,
  fallbackCurrency: string,
  displayCurrency?: StoreCurrencyDisplay | null,
) {
  if (price === null || price <= 0) return "";

  const decimals =
    typeof displayCurrency?.decimals === "number" ? displayCurrency.decimals : 0;

  const clean = new Intl.NumberFormat("ar-SA-u-nu-latn", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(price);

  const currencyText =
    s(displayCurrency?.symbol) ||
    s(displayCurrency?.code) ||
    s(displayCurrency?.label) ||
    s(fallbackCurrency);

  return currencyText ? `${clean} ${currencyText}` : clean;
}

function getDisplayCurrencyText(
  fallbackCurrency: string,
  displayCurrency?: StoreCurrencyDisplay | null,
) {
  return (
    s(displayCurrency?.symbol) ||
    s(displayCurrency?.code) ||
    s(displayCurrency?.label) ||
    s(fallbackCurrency)
  );
}

async function resolveStoreCurrencyDisplay(args: {
  storeId: string;
  store?: any;
}): Promise<StoreCurrencyDisplay | null> {
  const storeId = s(args.storeId);
  if (!storeId) return null;

  const cacheKeyValue = `store-currency:${storeId}`;
  const cached = getCached(currencyCache, cacheKeyValue);

  if (cached !== null) return cached;

  const fallbackCode = cleanCurrencyCode(
    args.store?.default_currency ?? args.store?.currency,
    "SAR",
  );

  let currency: StoreCurrencyDisplay | null = null;

  try {
    const sb = (await getStoreDb(storeId)) as any;

    const result = await sb
      .from("store_currencies")
      .select(
        "currency_code,symbol,decimal_digits,is_default,is_enabled,sort_order",
      )
      .eq("store_id", storeId)
      .eq("is_enabled", true)
      .order("is_default", { ascending: false })
      .order("sort_order", { ascending: true })
      .limit(20);

    const rows = Array.isArray(result.data) ? (result.data as any[]) : [];

    const row =
      rows.find((item) => item?.is_default === true) ||
      rows.find(
        (item) =>
          cleanCurrencyCode(item?.currency_code, "") === fallbackCode,
      ) ||
      rows[0] ||
      null;

    if (row) {
      const code = cleanCurrencyCode(row?.currency_code, fallbackCode);

      currency = {
        code,
        symbol: s(row?.symbol) || code,
        label: s(row?.symbol) || code,
        decimals: clampDecimals(row?.decimal_digits),
      };
    }
  } catch {
    currency = null;
  }

  if (!currency) {
    currency = {
      code: fallbackCode,
      symbol: fallbackCode,
      label: fallbackCode,
      decimals: 0,
    };
  }

  setCached(currencyCache, cacheKeyValue, currency, CURRENCY_CACHE_TTL);

  return currency;
}

function addCandidateWordsFromText(
  source: unknown,
  candidates: Map<string, string>,
) {
  const text = s(source);
  if (!text) return;

  const words = text
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 2 && x.length <= 40);

  for (const word of words) {
    const key = normalizeArabic(word);
    if (!key || key.length < 2) continue;
    if (!candidates.has(key)) candidates.set(key, word);
  }
}

function levenshtein(a: string, b: string) {
  const left = normalizeArabic(a);
  const right = normalizeArabic(b);

  if (left === right) return 0;
  if (!left) return right.length;
  if (!right) return left.length;

  const rows = left.length + 1;
  const cols = right.length + 1;

  const matrix: number[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 0),
  );

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[left.length][right.length];
}

function bigrams(value: string) {
  const text = normalizeArabic(value).replace(/\s+/g, "");
  if (text.length <= 1) return [text];

  const out: string[] = [];

  for (let i = 0; i < text.length - 1; i += 1) {
    out.push(text.slice(i, i + 2));
  }

  return out;
}

function diceSimilarity(a: string, b: string) {
  const left = bigrams(a);
  const right = bigrams(b);

  if (!left.length || !right.length) return 0;

  const counts = new Map<string, number>();

  for (const item of left) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }

  let intersection = 0;

  for (const item of right) {
    const count = counts.get(item) || 0;

    if (count > 0) {
      intersection += 1;
      counts.set(item, count - 1);
    }
  }

  return (2 * intersection) / (left.length + right.length);
}

function correctionConfidence(query: string, candidate: string) {
  const q = normalizeArabic(query);
  const c = normalizeArabic(candidate);

  if (!q || !c) return 0;
  if (q === c) return 1;

  const distance = levenshtein(q, c);
  const maxLen = Math.max(q.length, c.length);
  const distanceScore = maxLen ? 1 - distance / maxLen : 0;
  const diceScore = diceSimilarity(q, c);

  return Math.max(0, Math.min(1, distanceScore * 0.68 + diceScore * 0.32));
}

function isGoodCorrection(query: string, candidate: string, confidence: number) {
  const q = normalizeArabic(query);
  const c = normalizeArabic(candidate);

  if (!q || !c) return false;
  if (q === c) return false;

  const distance = levenshtein(q, c);
  const maxLen = Math.max(q.length, c.length);
  const lengthDiff = Math.abs(q.length - c.length);

  if (maxLen < 3) return false;
  if (lengthDiff > Math.max(2, Math.floor(maxLen * 0.45))) return false;

  if (maxLen <= 5) {
    return distance <= 2 && confidence >= 0.62;
  }

  return (
    distance <= Math.max(2, Math.floor(maxLen * 0.34)) && confidence >= 0.68
  );
}

function findClosestCandidate(
  query: string,
  candidates: Map<string, string>,
): { value: string; confidence: number } | null {
  const q = normalizeArabic(query);
  if (!q || q.length < 3) return null;

  let bestValue = "";
  let bestConfidence = 0;

  for (const [normalized, original] of candidates.entries()) {
    if (!normalized || normalized === q) continue;

    const confidence = correctionConfidence(q, normalized);

    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestValue = original;
    }
  }

  if (!bestValue) return null;
  if (!isGoodCorrection(query, bestValue, bestConfidence)) return null;

  return {
    value: bestValue,
    confidence: Number(bestConfidence.toFixed(3)),
  };
}

function rankRow(row: SearchIndexRow, query: string) {
  const q = normalizeArabic(query);
  const title = normalizeArabic(row.title);
  const desc = normalizeArabic(row.description);
  const searchText = normalizeArabic(
    row.search_text_normalized || row.search_text,
  );
  const suggestionText = normalizeArabic(row.suggestion_terms_text);
  const tokens = tokenize(query);

  let score = 0;

  if (title === q) score += 700;
  if (title.startsWith(q)) score += 420;
  if (title.includes(q)) score += 320;

  if (searchText === q) score += 260;
  if (searchText.includes(q)) score += 190;

  if (desc.includes(q)) score += 70;
  if (suggestionText.includes(q)) score += 90;

  for (const token of tokens) {
    if (title.includes(token)) score += 55;
    if (searchText.includes(token)) score += 32;
    if (desc.includes(token)) score += 10;
    if (suggestionText.includes(token)) score += 18;
  }

  return score;
}

function mergeRows(rows: SearchIndexRow[]) {
  const map = new Map<string, SearchIndexRow>();

  for (const row of rows) {
    const id = s(row.product_id);
    if (!id) continue;
    if (!map.has(id)) map.set(id, row);
  }

  return Array.from(map.values());
}

function rankAndSortRows(rows: SearchIndexRow[], query: string): RankedSearchRow[] {
  return mergeRows(rows)
    .map((row) => ({
      row,
      score: rankRow(row, query),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      const aDate = new Date(a.row.updated_at || 0).getTime();
      const bDate = new Date(b.row.updated_at || 0).getTime();

      return bDate - aDate;
    });
}

async function queryIndexByTerm(args: {
  sb: any;
  storeId: string;
  term: string;
  limit?: number;
}) {
  const clean = normalizeArabic(args.term);
  if (!clean || clean.length < 2) return [];

  const result = await args.sb
    .from("product_search_index")
    .select(
      "product_id,title,description,href,image_url,price,compare_price,currency,search_text,search_text_normalized,suggestion_terms,suggestion_terms_text,updated_at",
    )
    .eq("store_id", args.storeId)
    .eq("is_visible", true)
    .ilike("search_text_normalized", `%${clean}%`)
    .limit(args.limit ?? DB_FETCH_LIMIT);

  if (result.error || !Array.isArray(result.data)) return [];

  return result.data as SearchIndexRow[];
}

async function collectRows(storeId: string, query: string) {
  const store_id = s(storeId);
  const normalizedQuery = normalizeArabic(query);

  if (!store_id || normalizedQuery.length < 2) return [];

  const sb = (await getStoreDb(store_id)) as any;

  const primaryRows = await queryIndexByTerm({
    sb,
    storeId: store_id,
    term: normalizedQuery,
    limit: DB_FETCH_LIMIT,
  });

  const primaryRanked = rankAndSortRows(primaryRows, query);

  if (primaryRanked.length > 0) {
    return primaryRanked;
  }

  const tokens = tokenize(query).filter((token) => token !== normalizedQuery);

  if (!tokens.length) {
    return [];
  }

  const tokenResults = await Promise.all(
    tokens.map((token) =>
      queryIndexByTerm({
        sb,
        storeId: store_id,
        term: token,
        limit: TOKEN_FETCH_LIMIT,
      }),
    ),
  );

  return rankAndSortRows(tokenResults.flat(), query);
}

async function loadVocabulary(storeId: string) {
  const store_id = s(storeId);
  if (!store_id) return new Map<string, string>();

  const cacheKeyValue = `product-search-index-vocab:${store_id}`;
  const cached = getCached(vocabularyCache, cacheKeyValue);

  if (cached) return cached;

  const sb = (await getStoreDb(store_id)) as any;

  const result = await sb
    .from("product_search_index")
    .select("title,suggestion_terms,suggestion_terms_text")
    .eq("store_id", store_id)
    .eq("is_visible", true)
    .limit(2000);

  const candidates = new Map<string, string>();

  if (!result.error && Array.isArray(result.data)) {
    for (const row of result.data) {
      addCandidateWordsFromText(row?.title, candidates);
      addCandidateWordsFromText(row?.suggestion_terms_text, candidates);

      if (Array.isArray(row?.suggestion_terms)) {
        for (const term of row.suggestion_terms) {
          addCandidateWordsFromText(term, candidates);
        }
      }
    }
  }

  setCached(vocabularyCache, cacheKeyValue, candidates, VOCAB_CACHE_TTL);

  return candidates;
}

async function resolveDidYouMean(storeId: string, query: string) {
  const rawParts = splitRawTokens(query);
  if (!rawParts.length) return null;

  const vocabulary = await loadVocabulary(storeId);
  if (!vocabulary.size) return null;

  let changed = false;
  const confidences: number[] = [];

  const nextParts = rawParts.map((part) => {
    if (normalizeArabic(part).length < 3) return part;

    const closest = findClosestCandidate(part, vocabulary);

    if (!closest) return part;

    changed = true;
    confidences.push(closest.confidence);

    return closest.value;
  });

  if (!changed) return null;

  const nextQuery = nextParts.join(" ");
  const confidence =
    confidences.length > 0
      ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
      : 0;

  if (!nextQuery) return null;
  if (normalizeArabic(nextQuery) === normalizeArabic(query)) return null;
  if (confidence < 0.62) return null;

  return {
    query: nextQuery,
    confidence: Number(confidence.toFixed(3)),
  };
}

function getProductImage(product: any) {
  return pickText(
    product?.image_url,
    product?.imageUrl,
    product?.thumbnail_url,
    product?.thumbnailUrl,
    product?.seo?.og_image_url,
    product?.media?.[0]?.url,
    product?.media?.[0]?.original_url,
  );
}

async function getSafeSeoMode(storeId: string): Promise<SeoUrlMode> {
  try {
    return await getSeoUrlMode(storeId);
  } catch {
    return "named_ar";
  }
}

async function loadCurrentProductHrefs(args: {
  storeId: string;
  productIds: string[];
  seoMode: SeoUrlMode;
}) {
  const productIds = Array.from(
    new Set(args.productIds.map(s).filter(Boolean)),
  );
  const hrefByProductId = new Map<string, string>();

  if (!args.storeId || !productIds.length) return hrefByProductId;

  const sb = (await getStoreDb(args.storeId)) as any;
  const result = await sb
    .from("products")
    .select(
      "id,name,public_no,metadata,product_metadata(url,title,description)",
    )
    .eq("store_id", args.storeId)
    .in("id", productIds);

  if (result.error || !Array.isArray(result.data)) return hrefByProductId;

  for (const product of result.data) {
    const productId = s(product?.id);
    if (!productId) continue;

    const href = buildProductHrefFromRecord({
      mode: args.seoMode,
      product,
      fallbackHref: "#",
    });

    if (href && href !== "#") hrefByProductId.set(productId, href);
  }

  return hrefByProductId;
}

function serializeRow(
  row: SearchIndexRow,
  displayCurrency?: StoreCurrencyDisplay | null,
  currentHref?: string | null,
) {
  const price = toNumber(row.price);
  const comparePrice = toNumber(row.compare_price);
  const rawCurrency = s(row.currency);
  const finalCurrency = getDisplayCurrencyText(rawCurrency, displayCurrency);
  const imageUrl = s(row.image_url);
  const href = s(currentHref) || s(row.href) || "/";

  return {
    id: s(row.product_id),
    name: s(row.title),
    title: s(row.title),
    description: s(row.description),
    href,
    url: href,

    imageUrl,
    image_url: imageUrl,
    thumbnailUrl: imageUrl,
    thumbnail_url: imageUrl,

    currency: finalCurrency,
    currencySymbol: finalCurrency,
    currency_symbol: finalCurrency,
    currencyDecimals: displayCurrency?.decimals ?? null,
    currency_decimals: displayCurrency?.decimals ?? null,

    price,
    sale_price: null,
    regular_price: price,
    compare_at_price: comparePrice,
    compareAtPrice: comparePrice,

    priceFormatted: formatPrice(price, rawCurrency, displayCurrency),
    price_formatted: formatPrice(price, rawCurrency, displayCurrency),
    comparePriceFormatted: formatPrice(comparePrice, rawCurrency, displayCurrency),
    compare_price_formatted: formatPrice(
      comparePrice,
      rawCurrency,
      displayCurrency,
    ),
  };
}

function serializeProductFallback(
  product: any,
  displayCurrency?: StoreCurrencyDisplay | null,
  seoMode: SeoUrlMode = "named_ar",
) {
  const regularPrice = toNumber(
    firstDefined(
      product?.pricing?.price,
      product?.regular_price,
      product?.seo?.price,
      product?.price,
    ),
  );

  const salePrice = toNumber(
    firstDefined(product?.pricing?.sale_price, product?.sale_price),
  );

  const hasSale =
    salePrice !== null &&
    salePrice > 0 &&
    regularPrice !== null &&
    regularPrice > salePrice;

  const finalPrice = hasSale ? salePrice : regularPrice;
  const comparePrice = hasSale ? regularPrice : null;

  const rawCurrency = pickText(
    product?.pricing?.currency,
    product?.currency,
    product?.seo?.currency,
  );

  const finalCurrency = getDisplayCurrencyText(rawCurrency, displayCurrency);
  const imageUrl = getProductImage(product);
  const href = buildProductHrefFromRecord({
    mode: seoMode,
    product,
    fallbackHref: pickText(product?.href, product?.url, "#"),
  });

  return {
    id: s(product?.id),
    name: pickText(product?.name, product?.title),
    title: pickText(product?.name, product?.title),
    description: s(product?.description),
    href,
    url: href,

    imageUrl,
    image_url: imageUrl,
    thumbnailUrl: imageUrl,
    thumbnail_url: imageUrl,

    currency: finalCurrency,
    currencySymbol: finalCurrency,
    currency_symbol: finalCurrency,
    currencyDecimals: displayCurrency?.decimals ?? null,
    currency_decimals: displayCurrency?.decimals ?? null,

    price: finalPrice,
    sale_price: hasSale ? salePrice : null,
    regular_price: regularPrice,
    compare_at_price: comparePrice,
    compareAtPrice: comparePrice,

    priceFormatted: formatPrice(finalPrice, rawCurrency, displayCurrency),
    price_formatted: formatPrice(finalPrice, rawCurrency, displayCurrency),
    comparePriceFormatted: formatPrice(comparePrice, rawCurrency, displayCurrency),
    compare_price_formatted: formatPrice(
      comparePrice,
      rawCurrency,
      displayCurrency,
    ),
  };
}

function buildSuggestions(
  query: string,
  rows: SearchIndexRow[],
  fallbackItems: any[] = [],
  didYouMean?: string | null,
) {
  const out = new Set<string>();

  function add(value: unknown) {
    const text = s(value);
    if (!text) return;
    out.add(text);
  }

  if (didYouMean) add(didYouMean);
  add(query);

  for (const row of rows) {
    if (out.size >= 5) break;

    const terms = Array.isArray(row.suggestion_terms) ? row.suggestion_terms : [];

    for (const term of terms) {
      if (out.size >= 5) break;
      add(term);
    }

    add(row.title);
  }

  for (const item of fallbackItems) {
    if (out.size >= 5) break;
    add(item?.title || item?.name);
  }

  return Array.from(out).slice(0, 5);
}

async function buildSearchResponseRaw(args: {
  storeId: string;
  store?: any;
  q: string;
  seoMode: SeoUrlMode;
}): Promise<SearchApiResponse> {
  const storeId = s(args.storeId);
  const q = normalizeDbSearchTerm(args.q);

  const displayCurrency = await resolveStoreCurrencyDisplay({
    storeId,
    store: args.store,
  });

  let ranked = await collectRows(storeId, q);
  let didYouMean: { query: string; confidence: number } | null = null;

  if (ranked.length === 0) {
    didYouMean = await resolveDidYouMean(storeId, q);

    if (didYouMean?.query) {
      ranked = await collectRows(storeId, didYouMean.query);
    }
  }

  const rows = ranked.slice(0, SEARCH_LIMIT).map((item) => item.row);

  if (rows.length > 0) {
    const hrefByProductId = await loadCurrentProductHrefs({
      storeId,
      productIds: rows.map((row) => s(row.product_id)),
      seoMode: args.seoMode,
    });
    const items = rows.map((row) =>
      serializeRow(
        row,
        displayCurrency,
        hrefByProductId.get(s(row.product_id)),
      ),
    );

    return {
      suggestions: buildSuggestions(q, rows, items, didYouMean?.query),
      didYouMean,
      items,
    };
  }

  const fallbackProducts = await getProductsBySearch({
    store_id: storeId,
    q,
    limit: SEARCH_LIMIT,
  });

  const fallbackItems = fallbackProducts
    .map((product) =>
      serializeProductFallback(product, displayCurrency, args.seoMode),
    )
    .filter((item) => item.id && item.title && item.href);

  return {
    suggestions: buildSuggestions(q, [], fallbackItems, didYouMean?.query),
    didYouMean,
    items: fallbackItems,
  };
}

function emptyResponse(): SearchApiResponse {
  return {
    suggestions: [],
    didYouMean: null,
    items: [],
  };
}

function jsonWithCacheHeaders(
  payload: SearchApiResponse,
  args: {
    cache: string;
    durationMs: number;
  },
) {
  const res = NextResponse.json(payload);

  res.headers.set("Cache-Control", "no-store, max-age=0");
  res.headers.set("X-Mk-Search-Cache", args.cache.toUpperCase());
  res.headers.set("X-Mk-Search-Cache-Ms", String(Math.max(0, args.durationMs)));

  return res;
}

export async function GET(req: Request) {
  const startedAt = nowMs();
  const url = new URL(req.url);
  const q = normalizeDbSearchTerm(url.searchParams.get("q"));

  if (!q || q.length < 2) {
    return jsonWithCacheHeaders(emptyResponse(), {
      cache: "skip",
      durationMs: nowMs() - startedAt,
    });
  }

  const ctx = await resolveStoreContext();

  if (!ctx.store?.id) {
    return jsonWithCacheHeaders(emptyResponse(), {
      cache: "skip",
      durationMs: nowMs() - startedAt,
    });
  }

  const storeId = ctx.store.id;
  const seoMode = await getSafeSeoMode(storeId);
  const qHash = hashText(normalizeArabic(q));

  const cached = await redisCachedWithMeta<SearchApiResponse>(
    cacheKey(
      "api-search",
      "suggestions",
      storeId,
      seoMode,
      qHash,
      String(SEARCH_LIMIT),
    ),
    {
      ttlSeconds: SEARCH_REDIS_TTL_SECONDS,
    },
    () =>
      buildSearchResponseRaw({
        storeId,
        store: ctx.store,
        q,
        seoMode,
      }),
  );

  return jsonWithCacheHeaders(cached.value, {
    cache: cached.meta.cache,
    durationMs: nowMs() - startedAt,
  });
}
