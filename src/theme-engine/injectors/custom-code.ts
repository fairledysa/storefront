// FILE: apps/storefront/src/theme-engine/injectors/custom-code.ts

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/data/store/supabase.server";

export type CustomScriptUrl = {
  src: string;
  strategy?: "beforeInteractive" | "afterInteractive" | "lazyOnload";
};

type StoreCustomCodeRow = {
  css: string | null;
  scripts: any[] | null;
  enabled: boolean;
  status: string;
  updated_at: string;
};

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
    .filter((s) => !!s.src);

  return { css, scripts };
}

async function fetchCustomCodeRaw(
  store_id: string,
  status: "draft" | "published",
) {
  const sb = supabaseAdmin();

  const r = await sb
    .from("store_custom_code")
    .select("css,scripts,enabled,status,updated_at")
    .eq("store_id", store_id)
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
  const key = `${store_id}:${status}`;
  let fn = customCodeCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () => fetchCustomCodeRaw(store_id, status),
      ["store-custom-code", store_id, status],
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
    const row =
      (preview ? await fetchCustomCodeCached(store_id, "draft") : null) ??
      (await fetchCustomCodeCached(store_id, "published"));

    return normalize(row);
  },
);