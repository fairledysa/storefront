// FILE: apps/storefront/src/app/(store)/api/search/route.ts
import { NextResponse } from "next/server";

import { getProductsBySearch } from "@/data/catalog/products";
import { getStoreDb } from "@/data/db/store-db.server";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";

const SEARCH_LIMIT = 10;
const DB_FETCH_LIMIT = 45;
const VOCAB_CACHE_TTL = 120_000;
const CURRENCY_CACHE_TTL = 30_000;

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

type CurrencyCandidate = StoreCurrencyDisplay & {
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

function readBool(value: any, fallback = false) {
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

  return fallback;
}

function clampDecimals(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;

  const n = Number(value);
  if (!Number.isFinite(n)) return null;

  return Math.max(0, Math.min(4, Math.floor(n)));
}

function isPlainObject(value: any): value is Record<string, any> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function parseJsonMaybe(value: any) {
  if (typeof value !== "string") return value;

  const text = value.trim();
  if (!text) return value;

  if (
    (text.startsWith("{") && text.endsWith("}")) ||
    (text.startsWith("[") && text.endsWith("]"))
  ) {
    try {
      return JSON.parse(text);
    } catch {
      return value;
    }
  }

  return value;
}

function makeCurrencyCandidate(
  value: any,
  baseScore = 0,
): CurrencyCandidate | null {
  const parsed = parseJsonMaybe(value);

  if (typeof parsed === "string") {
    const code = s(parsed);
    if (!code) return null;

    return {
      code,
      symbol: code,
      label: code,
      decimals: null,
      score: baseScore + 5,
    };
  }

  if (!isPlainObject(parsed)) return null;

  const code = pickText(
    parsed.code,
    parsed.currency_code,
    parsed.currencyCode,
    parsed.iso_code,
    parsed.isoCode,
    parsed.currency,
    parsed.value,
  );

  const symbol = pickText(
    parsed.symbol,
    parsed.currency_symbol,
    parsed.currencySymbol,
    parsed.short_symbol,
    parsed.shortSymbol,
    parsed.sign,
  );

  const label = pickText(
    parsed.label,
    parsed.name,
    parsed.title,
    parsed.currency_name,
    parsed.currencyName,
    parsed.display_name,
    parsed.displayName,
  );

  const finalLabel = symbol || code || label;

  if (!code && !symbol && !label) return null;

  const activeBoost =
    readBool(
      firstDefined(
        parsed.is_default,
        parsed.isDefault,
        parsed.default,
        parsed.is_base,
        parsed.isBase,
        parsed.is_active,
        parsed.isActive,
        parsed.active,
        parsed.enabled,
        parsed.selected,
      ),
      false,
    )
      ? 80
      : 0;

  return {
    code,
    symbol: symbol || code || label,
    label: finalLabel,
    decimals: clampDecimals(
      firstDefined(
        parsed.decimal_digits,
        parsed.decimalDigits,
        parsed.decimals,
        parsed.precision,
      ),
    ),
    score: baseScore + activeBoost + (symbol ? 18 : 0) + (code ? 12 : 0),
  };
}

function collectCurrencyCandidates(
  value: any,
  baseScore = 0,
  depth = 0,
): CurrencyCandidate[] {
  if (depth > 4) return [];

  const parsed = parseJsonMaybe(value);
  const out: CurrencyCandidate[] = [];

  const direct = makeCurrencyCandidate(parsed, baseScore);
  if (direct) out.push(direct);

  if (Array.isArray(parsed)) {
    parsed.forEach((item, index) => {
      out.push(...collectCurrencyCandidates(item, baseScore - index, depth + 1));
    });
  } else if (isPlainObject(parsed)) {
    const selectedCode = pickText(
      parsed.selected,
      parsed.selected_code,
      parsed.selectedCode,
      parsed.active,
      parsed.active_code,
      parsed.activeCode,
      parsed.default,
      parsed.default_code,
      parsed.defaultCode,
      parsed.current,
      parsed.current_code,
      parsed.currentCode,
      parsed.base,
      parsed.base_code,
      parsed.baseCode,
    );

    const arrays = [
      parsed.currencies,
      parsed.items,
      parsed.list,
      parsed.options,
      parsed.available,
      parsed.enabled_currencies,
      parsed.enabledCurrencies,
    ];

    for (const arr of arrays) {
      if (!Array.isArray(arr)) continue;

      arr.forEach((item, index) => {
        const itemCode = pickText(
          item?.code,
          item?.currency_code,
          item?.currencyCode,
          item?.currency,
          item?.value,
        );

        const matchBoost =
          selectedCode &&
          itemCode &&
          selectedCode.toLowerCase() === itemCode.toLowerCase()
            ? 120
            : 0;

        out.push(
          ...collectCurrencyCandidates(
            item,
            baseScore + matchBoost - index,
            depth + 1,
          ),
        );
      });
    }

    const nestedObjects = [
      parsed.currency,
      parsed.store_currency,
      parsed.storeCurrency,
      parsed.default_currency,
      parsed.defaultCurrency,
      parsed.active_currency,
      parsed.activeCurrency,
      parsed.base_currency,
      parsed.baseCurrency,
      parsed.current_currency,
      parsed.currentCurrency,
      parsed.money,
      parsed.pricing,
    ];

    for (const item of nestedObjects) {
      if (item) {
        out.push(...collectCurrencyCandidates(item, baseScore + 20, depth + 1));
      }
    }
  }

  return out;
}

async function resolveStoreCurrencyDisplay(args: {
  storeId: string;
  store?: any;
}): Promise<StoreCurrencyDisplay | null> {
  const storeId = s(args.storeId);
  if (!storeId) return null;

  const cacheKey = `store-currency:${storeId}`;
  const cached = getCached(currencyCache, cacheKey);

  if (cached !== null) return cached;

  const candidates: CurrencyCandidate[] = [];

  candidates.push(...collectCurrencyCandidates(args.store, 120));

  const sb = (await getStoreDb(storeId)) as any;

  const settingsR = await sb
    .from("store_settings")
    .select("slug,value")
    .eq("store_id", storeId)
    .limit(1000);

  if (!settingsR.error && Array.isArray(settingsR.data)) {
    for (const row of settingsR.data) {
      const slug = s(row?.slug).toLowerCase();

      if (
        !slug.includes("currency") &&
        !slug.includes("currencies") &&
        !slug.includes("money") &&
        !slug.includes("عملة") &&
        !slug.includes("العملة")
      ) {
        continue;
      }

      let score = 60;

      if (
        slug.includes("active") ||
        slug.includes("current") ||
        slug.includes("default") ||
        slug.includes("base") ||
        slug.includes("primary") ||
        slug.includes("selected")
      ) {
        score += 80;
      }

      candidates.push(...collectCurrencyCandidates(row?.value, score));
    }
  }

  const best =
    candidates
      .filter((item) => item.label || item.symbol || item.code)
      .sort((a, b) => b.score - a.score)[0] ?? null;

  const currency = best
    ? {
        code: best.code,
        symbol: best.symbol,
        label: best.label || best.symbol || best.code,
        decimals: best.decimals,
      }
    : null;

  setCached(currencyCache, cacheKey, currency, CURRENCY_CACHE_TTL);

  return currency;
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
    .replace(/[%_]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 90);
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
  ).slice(0, 8);
}

function splitRawTokens(value: unknown) {
  return normalizeDbSearchTerm(value)
    .split(/\s+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function makeArabicVariants(value: unknown) {
  const raw = normalizeDbSearchTerm(value);
  if (!raw) return [];

  const variants = new Set<string>();

  variants.add(raw);
  variants.add(raw.replace(/ه/g, "ة"));
  variants.add(raw.replace(/ة/g, "ه"));
  variants.add(raw.replace(/[إأآ]/g, "ا"));

  return Array.from(variants)
    .map((x) => normalizeDbSearchTerm(x))
    .filter(Boolean)
    .slice(0, 4);
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
    .order("updated_at", { ascending: false })
    .limit(args.limit ?? DB_FETCH_LIMIT);

  if (result.error || !Array.isArray(result.data)) return [];

  return result.data as SearchIndexRow[];
}

async function collectRows(storeId: string, query: string) {
  const store_id = s(storeId);
  if (!store_id) return [];

  const sb = (await getStoreDb(store_id)) as any;

  const variants = makeArabicVariants(query);
  const tokens = tokenize(query);

  const phraseResults = await Promise.all(
    variants.map((term) =>
      queryIndexByTerm({
        sb,
        storeId: store_id,
        term,
        limit: DB_FETCH_LIMIT,
      }),
    ),
  );

  const tokenResults = await Promise.all(
    tokens.map((token) =>
      queryIndexByTerm({
        sb,
        storeId: store_id,
        term: token,
        limit: 24,
      }),
    ),
  );

  const rows = mergeRows([...phraseResults.flat(), ...tokenResults.flat()]);

  return rows
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

async function loadVocabulary(storeId: string) {
  const store_id = s(storeId);
  if (!store_id) return new Map<string, string>();

  const cacheKey = `product-search-index-vocab:${store_id}`;
  const cached = getCached(vocabularyCache, cacheKey);

  if (cached) return cached;

  const sb = (await getStoreDb(store_id)) as any;

  const result = await sb
    .from("product_search_index")
    .select("title,search_text,suggestion_terms,suggestion_terms_text")
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

  setCached(vocabularyCache, cacheKey, candidates, VOCAB_CACHE_TTL);

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

function getProductHref(product: any) {
  return pickText(
    product?.href,
    product?.url,
    product?.short_url ? `/${String(product.short_url).replace(/^\/+/, "")}` : "",
    product?.public_no ? `/p/${product.public_no}` : "",
  );
}

function serializeRow(
  row: SearchIndexRow,
  displayCurrency?: StoreCurrencyDisplay | null,
) {
  const price = toNumber(row.price);
  const comparePrice = toNumber(row.compare_price);
  const rawCurrency = s(row.currency);
  const finalCurrency = getDisplayCurrencyText(rawCurrency, displayCurrency);
  const imageUrl = s(row.image_url);

  return {
    id: s(row.product_id),
    name: s(row.title),
    title: s(row.title),
    description: s(row.description),
    href: s(row.href) || "/",
    url: s(row.href) || "/",

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

  return {
    id: s(product?.id),
    name: pickText(product?.name, product?.title),
    title: pickText(product?.name, product?.title),
    description: s(product?.description),
    href: getProductHref(product),
    url: getProductHref(product),

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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = normalizeDbSearchTerm(url.searchParams.get("q"));

  if (!q || q.length < 2) {
    return NextResponse.json({
      suggestions: [],
      didYouMean: null,
      items: [],
    });
  }

  const ctx = await resolveStoreContext();

  if (!ctx.store) {
    return NextResponse.json({
      suggestions: [],
      didYouMean: null,
      items: [],
    });
  }

  const storeId = ctx.store.id;

  const displayCurrency = await resolveStoreCurrencyDisplay({
    storeId,
    store: ctx.store,
  });

  let ranked = await collectRows(storeId, q);

  let didYouMean: { query: string; confidence: number } | null = null;

  const topScore = ranked[0]?.score ?? 0;
  const shouldTryCorrection = ranked.length === 0 || topScore < 160;

  if (shouldTryCorrection) {
    didYouMean = await resolveDidYouMean(storeId, q);

    if (didYouMean?.query) {
      const correctedRanked = await collectRows(storeId, didYouMean.query);

      if (correctedRanked.length > ranked.length || topScore < 120) {
        const merged = new Map<string, { row: SearchIndexRow; score: number }>();

        for (const item of correctedRanked) {
          merged.set(s(item.row.product_id), item);
        }

        for (const item of ranked) {
          const id = s(item.row.product_id);
          const current = merged.get(id);

          if (!current || item.score > current.score) {
            merged.set(id, item);
          }
        }

        ranked = Array.from(merged.values()).sort((a, b) => b.score - a.score);
      }
    }
  }

  const rows = ranked.slice(0, SEARCH_LIMIT).map((item) => item.row);

  if (rows.length > 0) {
    const items = rows.map((row) => serializeRow(row, displayCurrency));

    return NextResponse.json({
      suggestions: buildSuggestions(q, rows, items, didYouMean?.query),
      didYouMean,
      items,
    });
  }

  const fallbackProducts = await getProductsBySearch({
    store_id: storeId,
    q,
    limit: SEARCH_LIMIT,
  });

  const fallbackItems = fallbackProducts
    .map((product) => serializeProductFallback(product, displayCurrency))
    .filter((item) => item.id && item.title && item.href);

  return NextResponse.json({
    suggestions: buildSuggestions(q, [], fallbackItems, didYouMean?.query),
    didYouMean,
    items: fallbackItems,
  });
}