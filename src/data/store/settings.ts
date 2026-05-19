// FILE: apps/storefront/src/data/store/settings.ts

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/data/store/supabase.server";

export type { SeoUrlMode } from "@/lib/seo/urls";
import type { SeoUrlMode } from "@/lib/seo/urls";

function normalizeMode(v: any): SeoUrlMode {
  let raw: any = v;

  if (typeof raw === "string") {
    const original = raw.trim();

    for (let i = 0; i < 2; i++) {
      try {
        raw = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
      } catch {
        break;
      }
    }

    if (typeof raw !== "object") raw = original;
  }

  const modeVal =
    raw && typeof raw === "object" ? ((raw as any).mode ?? raw) : raw;

  const m = String(modeVal || "").trim();

  if (m === "short" || m === "named_ar" || m === "named_en") return m;
  return "named_ar";
}

async function getStoreSettingRaw<T = any>(args: {
  store_id: string;
  slug: string;
}): Promise<T | null> {
  const sb = supabaseAdmin() as any;

  const r = await sb
    .from("store_settings")
    .select("value")
    .eq("store_id", args.store_id)
    .eq("slug", args.slug)
    .limit(1)
    .maybeSingle();

  const row = (r?.data as any) || null;
  const val = row?.value;

  return val == null ? null : (val as T);
}

const storeSettingCache = new Map<string, () => Promise<any>>();

export function getStoreSetting<T = any>(args: {
  store_id: string;
  slug: string;
}): Promise<T | null> {
  const key = `${args.store_id}:${args.slug}`;
  let fn = storeSettingCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () => getStoreSettingRaw<T>(args),
      ["store-setting", args.store_id, args.slug],
      {
        revalidate: 120,
      },
    );

    storeSettingCache.set(key, fn);
  }

  return fn() as Promise<T | null>;
}

export const getSeoUrlMode = cache(
  async (store_id: string): Promise<SeoUrlMode> => {
    const value = await getStoreSetting<any>({
      store_id,
      slug: "seo.url_mode",
    });

    if (!value) return "named_ar";

    return normalizeMode(value);
  },
);

export type StoreSeoMeta = {
  title?: string | null;
  description?: string | null;
  keywords?: string | null;
  og_image?: string | null;
  twitter_handle?: string | null;
  published_time?: string | null;
  locale?: string | null;
};

function normalizeTwitterHandle(v: any): string | null {
  const s = String(v || "").trim();
  if (!s) return null;
  return s.startsWith("@") ? s : `@${s}`;
}

export const getSeoMeta = cache(
  async (store_id: string): Promise<StoreSeoMeta> => {
    const meta = await getStoreSetting<StoreSeoMeta>({
      store_id,
      slug: "seo.meta",
    });

    const m = (meta || {}) as StoreSeoMeta;

    return {
      title: m.title ?? null,
      description: m.description ?? null,
      keywords: m.keywords ?? null,
      og_image: m.og_image ?? null,
      twitter_handle: normalizeTwitterHandle(m.twitter_handle),
      published_time: m.published_time ?? null,
      locale: m.locale ?? "ar_AR",
    };
  },
);