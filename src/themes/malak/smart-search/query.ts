// FILE: apps/storefront/src/themes/malak/smart-search/query.ts

export const SMART_SEARCH_QUERY = {
  instance: "ss",
  keywordList: "ss_list",
  path: "ss_path",
  keywords: "ss_kw",
} as const;

function s(value: unknown) {
  return String(value ?? "").trim();
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

export function encodeSmartSearchPath(path: Record<string, string>) {
  const cleaned: Record<string, string> = {};

  for (const [key, value] of Object.entries(path || {})) {
    const cleanKey = s(key);
    const cleanValue = s(value);
    if (cleanKey && cleanValue) cleaned[cleanKey] = cleanValue;
  }

  try {
    return JSON.stringify(cleaned);
  } catch {
    return "{}";
  }
}

export function parseSmartSearchPath(value: unknown): Record<string, string> {
  const raw = s(value);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const out: Record<string, string> = {};
    for (const [key, item] of Object.entries(parsed)) {
      const cleanKey = s(key);
      const cleanValue = s(item);
      if (cleanKey && cleanValue) out[cleanKey] = cleanValue;
    }
    return out;
  } catch {
    return {};
  }
}

export function parseSmartSearchKeywordIds(value: unknown) {
  return uniqueStrings(s(value).split(",")).slice(0, 12);
}

export function hasSmartSearchQuery(params: {
  get?: (key: string) => string | null;
} | Record<string, unknown> | null | undefined) {
  if (!params) return false;

  if (typeof (params as any).get === "function") {
    return Boolean(s((params as any).get(SMART_SEARCH_QUERY.instance)));
  }

  const raw = (params as Record<string, unknown>)[SMART_SEARCH_QUERY.instance];
  return Boolean(Array.isArray(raw) ? s(raw[0]) : s(raw));
}
