// FILE: apps/storefront/src/theme-engine/injectors/custom-code.ts

import { cache } from "react";
import { unstable_cache } from "next/cache";

import { getStoreDb } from "@/data/db/store-db.server";

export type CustomScriptUrl = {
  src: string;
  strategy?: "beforeInteractive" | "afterInteractive" | "lazyOnload";
};

export type ThemeCustomCode = {
  enabled: boolean;
  css: string;
  js_enabled: boolean;
  js: string;
};

type StoreCustomCodeRow = {
  css: string | null;
  scripts: any[] | null;
  enabled: boolean;
  status: string;
  updated_at: string;
};

const MAX_THEME_CSS_SIZE = 300 * 1024;
const MAX_THEME_JS_SIZE = 150 * 1024;

const DEFAULT_THEME_CUSTOM_CODE: ThemeCustomCode = {
  enabled: false,
  css: "",
  js_enabled: false,
  js: "",
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

function safeObject(value: any): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  return {};
}

function normalize(row: StoreCustomCodeRow | null): {
  css: string;
  scripts: CustomScriptUrl[];
} {
  if (!row) return { css: "", scripts: [] };

  const css = String(row.css || "");
  const scriptsRaw = Array.isArray(row.scripts) ? row.scripts : [];

  const scripts: CustomScriptUrl[] = scriptsRaw
    .map((x: any) => ({
      src: String(x?.src || "").trim(),
      strategy: (x?.strategy as any) || "afterInteractive",
    }))
    .filter((item) => {
      if (!item.src) return false;

      const src = item.src.toLowerCase();

      if (src.startsWith("javascript:")) return false;
      if (src.includes("<script")) return false;
      if (src.includes("</script")) return false;

      return true;
    });

  return { css, scripts };
}

async function fetchCustomCodeRaw(
  store_id: string,
  status: "draft" | "published",
) {
  const storeId = s(store_id);
  if (!storeId) return null;

  const sb = (await getStoreDb(storeId)) as any;

  const r = await sb
    .from("store_custom_code")
    .select("css,scripts,enabled,status,updated_at")
    .eq("store_id", storeId)
    .eq("status", status)
    .eq("enabled", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return r.data as StoreCustomCodeRow | null;
}

const customCodeCache = new Map<
  string,
  () => Promise<StoreCustomCodeRow | null>
>();

function fetchCustomCodeCached(
  store_id: string,
  status: "draft" | "published",
) {
  const storeId = s(store_id);

  if (!storeId) return Promise.resolve(null);

  const key = `${storeId}:${status}`;
  let fn = customCodeCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () => fetchCustomCodeRaw(storeId, status),
      ["store-custom-code", storeId, status],
      {
        revalidate: 120,
      },
    );

    customCodeCache.set(key, fn);
  }

  return fn();
}

export const loadCustomCode = cache(
  async ({
    store_id,
    preview,
  }: {
    store_id: string;
    preview: boolean;
  }): Promise<{ css: string; scripts: CustomScriptUrl[] }> => {
    const storeId = s(store_id);

    if (!storeId) return { css: "", scripts: [] };

    const row =
      (preview ? await fetchCustomCodeCached(storeId, "draft") : null) ??
      (await fetchCustomCodeCached(storeId, "published"));

    return normalize(row);
  },
);

export function normalizeThemeCustomCode(value: any): ThemeCustomCode {
  const obj = safeObject(value);

  const css = typeof obj.css === "string" ? obj.css : "";
  const js = typeof obj.js === "string" ? obj.js : "";

  return {
    enabled:
      typeof obj.enabled === "boolean"
        ? obj.enabled
        : DEFAULT_THEME_CUSTOM_CODE.enabled,

    css,

    js_enabled:
      typeof obj.js_enabled === "boolean"
        ? obj.js_enabled
        : DEFAULT_THEME_CUSTOM_CODE.js_enabled,

    js,
  };
}

export function validateThemeCustomCss(css: string) {
  const value = String(css ?? "");

  if (!value.trim()) return "";

  if (value.length > MAX_THEME_CSS_SIZE) {
    return "حجم CSS أكبر من الحد المسموح 300KB.";
  }

  const lower = value.toLowerCase();

  const blocked = [
    "<script",
    "</script",
    "</style",
    "javascript:",
    "expression(",
  ];

  const found = blocked.find((item) => lower.includes(item));

  if (found) {
    return `كود CSS يحتوي على عبارة غير مسموحة: ${found}`;
  }

  return "";
}

export function validateThemeCustomJs(js: string) {
  const value = String(js ?? "");

  if (!value.trim()) return "";

  if (value.length > MAX_THEME_JS_SIZE) {
    return "حجم JavaScript أكبر من الحد المسموح 150KB.";
  }

  const lower = value.toLowerCase();

  const blocked = [
    "<script",
    "</script",
    "</style",
    "document.cookie",
    "eval(",
    "new function(",
  ];

  const found = blocked.find((item) => lower.includes(item));

  if (found) {
    return `كود JavaScript يحتوي على عبارة غير مسموحة: ${found}`;
  }

  return "";
}

export function sanitizeThemeCustomCode(value: any): ThemeCustomCode {
  const normalized = normalizeThemeCustomCode(value);

  const cssError = validateThemeCustomCss(normalized.css);
  const jsError = validateThemeCustomJs(normalized.js);

  return {
    enabled: normalized.enabled && !cssError && Boolean(s(normalized.css)),
    css: cssError ? "" : normalized.css,

    js_enabled: normalized.js_enabled && !jsError && Boolean(s(normalized.js)),
    js: jsError ? "" : normalized.js,
  };
}