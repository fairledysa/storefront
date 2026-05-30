// FILE: apps/storefront/src/data/store/settings.ts

import { cache } from "react";
import { unstable_cache } from "next/cache";

import { getStoreDb } from "@/data/db/store-db.server";

export type { SeoUrlMode } from "@/lib/seo/urls";
import type { SeoUrlMode } from "@/lib/seo/urls";

function s(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeMode(v: any): SeoUrlMode {
  let raw: any = v;

  if (typeof raw === "string") {
    const original = raw.trim();

    for (let i = 0; i < 2; i += 1) {
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
  const storeId = s(args.store_id);
  const slug = s(args.slug);

  if (!storeId || !slug) return null;

  const sb = (await getStoreDb(storeId)) as any;

  const r = await sb
    .from("store_settings")
    .select("value")
    .eq("store_id", storeId)
    .eq("slug", slug)
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
  const storeId = s(args.store_id);
  const slug = s(args.slug);

  if (!storeId || !slug) return Promise.resolve(null);

  const key = `${storeId}:${slug}`;
  let fn = storeSettingCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        getStoreSettingRaw<T>({
          store_id: storeId,
          slug,
        }),
      ["store-setting", storeId, slug],
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
    const storeId = s(store_id);
    if (!storeId) return "named_ar";

    const value = await getStoreSetting<any>({
      store_id: storeId,
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
  const text = s(v);
  if (!text) return null;
  return text.startsWith("@") ? text : `@${text}`;
}

export const getSeoMeta = cache(
  async (store_id: string): Promise<StoreSeoMeta> => {
    const storeId = s(store_id);

    if (!storeId) {
      return {
        title: null,
        description: null,
        keywords: null,
        og_image: null,
        twitter_handle: null,
        published_time: null,
        locale: "ar_AR",
      };
    }

    const meta = await getStoreSetting<StoreSeoMeta>({
      store_id: storeId,
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